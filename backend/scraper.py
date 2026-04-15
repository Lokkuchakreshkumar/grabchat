"""
ChatGPT share link scraper.

Strategy:
  1. Use Playwright (real Chromium) to load the page and read the full
     conversation mapping from window.__reactRouterContext via page.evaluate().
     This avoids the lazy-loading / DOM truncation problem entirely.
  2. If Playwright yields no usable data, fall back to StealthyFetcher +
     markdownify DOM extraction (captures only visible messages).
"""

import sys
import json
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


# ── helpers ──────────────────────────────────────────────────────────────────

def collect_text(value) -> list:
    """
    Recursively collect text from mixed ChatGPT content structures.
    Handles plain strings plus object/list formats used by newer payloads.
    """
    out = []
    if value is None:
        return out
    if isinstance(value, str):
        s = value.strip()
        if s:
            out.append(s)
        return out
    if isinstance(value, list):
        for item in value:
            out.extend(collect_text(item))
        return out
    if isinstance(value, dict):
        # Prefer explicit text-like fields first.
        for key in ('text', 'value', 'content'):
            if key in value:
                out.extend(collect_text(value.get(key)))
        # Fall back to scanning other fields (skip noisy metadata keys).
        for k, v in value.items():
            if k in ('text', 'value', 'content', 'type', 'id', 'name', 'role', 'mime_type'):
                continue
            out.extend(collect_text(v))
    return out


def message_text(msg: dict) -> str:
    content = msg.get('content') or {}
    parts = content.get('parts')
    if parts is None:
        parts = content
    lines = collect_text(parts)
    # De-duplicate while preserving order.
    seen = set()
    unique = []
    for line in lines:
        if line in seen:
            continue
        seen.add(line)
        unique.append(line)
    return '\n'.join(unique).strip()


def dedupe_messages(messages: list) -> list:
    seen = set()
    out = []
    for m in messages:
        key = (m.get('id'), m.get('role'), m.get('content'))
        if key in seen:
            continue
        seen.add(key)
        out.append(m)
    return out


def build_messages_from_mapping(mapping: dict) -> list:
    """
    Flatten the entire mapping, filter for user/assistant messages,
    and sort by create_time. This is robust to branching (regenerated
    responses) because we ignore the tree structure entirely.
    """
    msgs = []
    for node_id, node in mapping.items():
        msg = node.get('message')
        if not msg:
            continue
        role = (msg.get('author') or {}).get('role')
        if role not in ('user', 'assistant'):
            continue
        # Skip tool calls, system messages, and empty content
        text = message_text(msg)
        if not text.strip():
            continue
        msgs.append({
            'id': msg.get('id', node_id),
            'role': role,
            'content': text.strip(),
            'create_time': msg.get('create_time') or 0,
        })
    # Sort chronologically (create_time is a Unix float from the API)
    msgs.sort(key=lambda m: m['create_time'])
    return msgs


def build_messages_from_linear(linear: list) -> list:
    msgs = []
    for node in linear:
        msg = node.get('message') if isinstance(node, dict) else None
        if not msg:
            continue
        role = (msg.get('author') or {}).get('role')
        if role not in ('user', 'assistant'):
            continue
        text = message_text(msg)
        if text.strip():
            msgs.append({'id': msg.get('id', ''), 'role': role, 'content': text.strip()})
    return msgs


# ── Stage 1: Playwright + JS memory read ─────────────────────────────────────

def extract_with_playwright(url: str):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
        ])
        context = browser.new_context(
            user_agent=(
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
                '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            ),
            viewport={'width': 1280, 'height': 900},
        )
        page = context.new_page()
        share_id = urlparse(url).path.rstrip('/').split('/')[-1]

        try:
            # Use networkidle to ensure all streaming chunks (React Router) have arrived
            page.goto(url, wait_until='networkidle', timeout=90000)
            page.wait_for_timeout(8000)
        except Exception:
            pass

        # First, try the public share API endpoint directly (often returns the full mapping).
        api_probe = page.evaluate("""async ({ shareId }) => {
            try {
                const res = await fetch(`/backend-api/share/${shareId}`);
                if (!res.ok) return { results: [], meta: { ok: false, status: res.status } };
                const data = await res.json();
                const out = [];
                if (data?.mapping) out.push({ type: 'mapping', data: data.mapping, title: data.title || '' });
                if (data?.linear_conversation) out.push({ type: 'linear', data: data.linear_conversation, title: data.title || '' });
                const meta = {
                    ok: true,
                    status: res.status,
                    top_keys: Object.keys(data || {}),
                    mapping_size: data?.mapping ? Object.keys(data.mapping).length : 0,
                    linear_size: Array.isArray(data?.linear_conversation) ? data.linear_conversation.length : 0,
                    has_more: data?.has_more ?? null,
                    next_offset: data?.next_offset ?? null,
                    offset: data?.offset ?? null,
                    total: data?.total ?? null,
                    cursor: data?.cursor ?? null,
                    next_cursor: data?.next_cursor ?? null,
                    next: data?.next ?? null,
                    next_url: data?.next_url ?? null,
                };
                return { results: out, meta };
            } catch (e) {
                return { results: [], meta: { ok: false, error: String(e) } };
            }
        }""", {"shareId": share_id})
        api_results = api_probe.get('results', []) if isinstance(api_probe, dict) else []
        api_meta = api_probe.get('meta', {}) if isinstance(api_probe, dict) else {}
        if api_meta:
            print(f'API probe meta={json.dumps(api_meta)}', file=sys.stderr)

        if api_results:
            raw_results = api_results
        else:
            # For large chats, keep scrolling and re-check message count until it stabilizes.
            prev_count = -1
            stable_rounds = 0
            for _ in range(45):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(900)
                count = page.evaluate("""() => {
                    const ctx = window.__reactRouterContext || window.__remixContext;
                    if (!ctx) return 0;
                    const roles = new Set(['user', 'assistant']);
                    let total = 0;
                    function scan(obj, depth) {
                        if (!obj || typeof obj !== 'object' || depth > 18) return;
                        if (obj.mapping && typeof obj.mapping === 'object') {
                            for (const node of Object.values(obj.mapping)) {
                                const msg = node && node.message;
                                const role = msg && msg.author && msg.author.role;
                                if (!roles.has(role)) continue;
                                const parts = (msg.content && msg.content.parts) || [];
                                const text = parts.filter(p => typeof p === 'string').join('\\n').trim();
                                if (text) total += 1;
                            }
                        }
                        for (const v of Object.values(obj)) scan(v, depth + 1);
                    }
                    scan(ctx.state?.loaderData || {}, 0);
                    return total;
                }""")
                if (count == prev_count):
                    stable_rounds += 1
                else:
                    stable_rounds = 0
                    prev_count = count
                if stable_rounds >= 4:
                    break

            # The mapping is deeply nested in the React Router context. We scan for ALL mappings and merge them.
            raw_results = page.evaluate("""() => {
            const ctx = window.__reactRouterContext || window.__remixContext;
            if (!ctx) return [];
            
            const finalResults = [];
            function scanFixed(obj, depth) {
                if (!obj || typeof obj !== 'object' || depth > 18) return;
                if (obj.mapping) finalResults.push({ type: 'mapping', data: obj.mapping, title: obj.title || '' });
                if (obj.linear_conversation) finalResults.push({ type: 'linear', data: obj.linear_conversation, title: obj.title || '' });
                for (const v of Object.values(obj)) {
                    try { scanFixed(v, depth + 1); } catch(e) {}
                }
            }
            
            scanFixed(ctx.state?.loaderData || {}, 0);
            return finalResults;
        }""")


        context.close()
        browser.close()
        
        if not raw_results:
            return None

        # Merge all data
        all_mapping = {}
        all_linear = []
        titles = []
        
        for r in raw_results:
            if r['type'] == 'mapping': all_mapping.update(r['data'])
            else: all_linear.extend(r['data'])
            if r['title']: titles.append(r['title'])
            
        title = titles[0] if titles else "ChatGPT Conversation"
        candidates = []
        
        if all_mapping:
            msgs = build_messages_from_mapping(all_mapping)
            if msgs:
                msgs = dedupe_messages(msgs)
                candidates.append(('mapping', msgs))
        if all_linear:
            msgs = build_messages_from_linear(all_linear)
            if msgs:
                msgs = dedupe_messages(msgs)
                candidates.append(('linear', msgs))

        if candidates:
            source, best_msgs = max(candidates, key=lambda x: len(x[1]))
            counts = ', '.join([f'{name}:{len(msgs)}' for name, msgs in candidates])
            print(f'Playwright extraction counts=({counts}) selected={source}:{len(best_msgs)}', file=sys.stderr)
            return {'title': title, 'messages': best_msgs}
            
        return None




# ── Stage 2: StealthyFetcher DOM fallback ────────────────────────────────────

def extract_with_dom(url: str):
    from scrapling import StealthyFetcher
    import markdownify as md_lib

    result = StealthyFetcher.fetch(url, network_idle=True)
    articles = result.css('article, [data-message-author-role]')
    if not articles:
        return None

    title = result.css('title::text').get() or 'ChatGPT Conversation'
    messages = []
    for i, article in enumerate(articles):
        role = article.attrib.get('data-message-author-role') or 'assistant'
        html = article.css('.markdown, .prose, .text-base').get()
        if html:
            content = md_lib.markdownify(html, heading_style='ATX').strip()
        else:
            content = ' '.join(article.css('*::text').getall()).strip()
        if content:
            messages.append({
                'id': f'dom-{i}',
                'role': 'user' if role == 'user' else 'assistant',
                'content': content,
            })
    return {'title': title, 'messages': messages} if messages else None


# ── Main ──────────────────────────────────────────────────────────────────────

def extract_chat(url: str) -> dict:
    try:
        conv = extract_with_playwright(url)
        if conv and conv.get('messages'):
            return {
                'title': conv.get('title') or 'ChatGPT Conversation',
                'messages': conv['messages'],
            }
    except Exception as e:
        print(f'Playwright error: {e}', file=sys.stderr)

    # DOM fallback
    try:
        result = extract_with_dom(url)
        if result:
            print(f'DOM extraction messages={len(result.get("messages", []))}', file=sys.stderr)
            return result
    except Exception as e:
        print(f'DOM fallback error: {e}', file=sys.stderr)

    return {'error': 'Could not extract chat data. Page might be restricted or structure changed.'}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No URL provided'}))
        sys.exit(1)

    print(json.dumps(extract_chat(sys.argv[1])))
