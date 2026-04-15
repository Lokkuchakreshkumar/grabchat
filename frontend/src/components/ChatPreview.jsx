import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatPreview = ({ messages, title }) => {
    if (!messages || messages.length === 0) return null;

    return (
        <div id="chat-capture-area" className="chat-container" style={{ backgroundColor: '#212121', color: '#ececf1', minHeight: '100%', padding: '3rem 0' }}>
            <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 1rem', marginBottom: '2.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#fff', fontWeight: 'bold' }}>{title}</h2>
            </div>
            
            {messages.map((msg, index) => (
                <div key={`${msg.id || 'msg'}-${index}`} className={`message ${msg.role}`} style={{ display: 'flex', flexDirection: 'row', gap: '16px', padding: '1.2rem 1rem', maxWidth: '768px', margin: '0 auto' }}>
                    <div className="avatar-container" style={{ flexShrink: 0 }}>
                        <div className={`avatar ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`} style={{ 
                            width: '28px', 
                            height: '28px', 
                            borderRadius: '4px', 
                            backgroundColor: msg.role === 'user' ? '#ab68ff' : '#10a37f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            color: '#fff',
                            marginTop: '2px'
                        }}>
                            {msg.role === 'user' ? 'U' : 'C'}
                        </div>
                    </div>
                    
                    <div className="message-content" style={{ flexGrow: 1, minWidth: 0 }}>
                        <div className="role-label" style={{ fontSize: '1rem', fontWeight: '600', color: '#ececf1', marginBottom: '6px' }}>
                            {msg.role === 'user' ? 'You' : 'ChatGPT'}
                        </div>
                        <div className="markdown-content" style={{ lineHeight: '1.7', fontSize: '1rem', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            ))}
            
            <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: '5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>Grabbed with GrabChat • {new Date().toLocaleDateString()}</div>
                <div style={{ opacity: 0.8 }}>
                    made with love by <a href="https://chakresh.vercel.app" style={{ color: '#10a37f', textDecoration: 'none', fontWeight: 'bold', borderBottom: '1px solid #10a37f' }}>chakresh</a>
                </div>
            </div>
        </div>
    );
};

export default ChatPreview;
