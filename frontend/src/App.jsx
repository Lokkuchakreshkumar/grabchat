import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Link as LinkIcon, Loader2, FileText, CheckCircle2, AlertCircle, Flame, Hand, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPreview from './components/ChatPreview';
import { generatePDF } from './utils/pdfGenerator';
import loadingMessages from './utils/loadingMessages.json';
import HamsterLoader from './components/HamsterLoader';
import BallLoader from './components/BallLoader';


function App() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [loaderType, setLoaderType] = useState('hamster'); // 'hamster' or 'ball'
    const [error, setError] = useState('');
    const [chatData, setChatData] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsInstalled(isStandalone);

        const dismissed = localStorage.getItem('grabchat-pwa-dismissed');
        if (!isStandalone && !dismissed) {
            // Show banner after 1.5 seconds for visibility
            setTimeout(() => setShowBanner(true), 1500);
        }

        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) {
            alert('To install GrabChat: Tap the browser menu and select "Add to Home Screen"');
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
            setShowBanner(false);
        }
    };

    const dismissBanner = () => {
        setShowBanner(false);
        localStorage.setItem('grabchat-pwa-dismissed', 'true');
    };

    // Rotate loading messages
    useEffect(() => {
        let msgInterval;
        let loaderInterval;
        if (loading) {
            setLoadingMsg(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
            msgInterval = setInterval(() => {
                setLoadingMsg(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
            }, 3000);

            loaderInterval = setInterval(() => {
                setLoaderType(prev => prev === 'hamster' ? 'ball' : 'hamster');
            }, 6000); // Switch loader every 6 seconds
        }
        return () => {
            clearInterval(msgInterval);
            clearInterval(loaderInterval);
        };
    }, [loading]);

    const handleExtract = async (e) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setError('');
        setChatData(null);

        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
            const response = await axios.post(`${apiBaseUrl}/api/extract`, { url });
            setChatData(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to extract chat. Please check the URL.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await generatePDF(chatData, `${chatData.title.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            setError('Failed to generate PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="App">
            <header className="header" style={{ padding: '4rem 2rem 2.5rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--header-gap, 8px)',
                        marginBottom: '1rem',
                        flexWrap: 'wrap'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mixBlendMode: 'screen',
                        background: 'black',
                        padding: '0',
                        overflow: 'hidden'
                    }}>
                        <img
                            src="/icon.png"
                            alt="GrabChat Logo"
                            style={{
                                width: 'var(--logo-width, 96px)',
                                height: 'auto',
                                objectFit: 'contain',
                                filter: 'invert(1) hue-rotate(180deg) brightness(1.1) contrast(1.1)',
                                transform: 'scale(var(--logo-scale, 1.25))'
                            }}
                        />
                    </div>
                    <motion.h1
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="title"
                    >
                        GrabChat
                    </motion.h1>
                </motion.div>
                <p className="subtitle" style={{ fontSize: '1.2rem', opacity: 0.5, fontWeight: 500, letterSpacing: '-0.01em' }}>
                    High-fidelity chat extraction for the modern web.
                </p>

                {/* PWA Install Notification */}
                {showBanner && !isInstalled && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            position: 'fixed',
                            bottom: '2rem',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(25, 25, 25, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid #333',
                            padding: '1.25rem 1.75rem',
                            borderRadius: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                            zIndex: 1000,
                            width: 'max-content',
                            maxWidth: '90vw'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                                width: '44px', 
                                height: '44px', 
                                background: 'white', 
                                borderRadius: '14px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                            }}>
                                <img src="/favicon.svg" width="24" height="24" style={{ filter: 'invert(1)' }} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>GrabChat Web App</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, color: 'white' }}>Install for a native experience</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button 
                                onClick={dismissBanner}
                                style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '0.85rem', cursor: 'pointer', padding: '0.5rem', fontWeight: 600 }}
                            >
                                Dismiss
                            </button>
                            <button 
                                onClick={handleInstall}
                                style={{ 
                                    background: 'white', 
                                    color: 'black', 
                                    border: 'none', 
                                    padding: '0.7rem 1.4rem', 
                                    borderRadius: '12px', 
                                    fontWeight: 750, 
                                    fontSize: '0.85rem', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Install
                            </button>
                        </div>
                    </motion.div>
                )}
            </header>

            <main className="chat-container">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass"
                    style={{ padding: '2rem', marginBottom: '2rem' }}
                >
                    <form onSubmit={handleExtract} style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <LinkIcon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Paste ChatGPT shared link here..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                style={{ paddingLeft: '48px' }}
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading || !url}
                            style={{ minWidth: '120px' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Grab Chat'}
                        </button>
                    </form>

                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{
                                    marginTop: '2rem',
                                    padding: '2.5rem 1.5rem',
                                    borderRadius: '32px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    textAlign: 'center',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={loaderType}
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        {loaderType === 'hamster' ? <HamsterLoader /> : <BallLoader />}
                                    </motion.div>
                                </AnimatePresence>

                                <motion.p
                                    key={loadingMsg}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '1rem' }}
                                >
                                    {loadingMsg}
                                </motion.p>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '1rem', opacity: 0.7 }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Grabbing your chat...</span>
                                    {loadingMsg.includes('heating') || loadingMsg.includes('sweat') ? (
                                        <Flame size={16} style={{ color: '#888888' }} className="animate-pulse" />
                                    ) : null}
                                </div>
                            </motion.div>
                        )}

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ color: '#ff4b4b', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', justifyContent: 'center' }}
                            >
                                <AlertCircle size={16} /> {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {chatData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                                <CheckCircle2 size={18} />
                                <span style={{ fontWeight: 600 }}>
                                    Chat extracted successfully ({chatData.messages?.length || 0} total, {chatData.messages?.filter(m => m.role === 'user').length || 0} user, {chatData.messages?.filter(m => m.role === 'assistant').length || 0} assistant)
                                </span>
                            </div>
                            <button
                                onClick={handleDownload}
                                className="btn-primary"
                                disabled={downloading}
                                style={{ background: downloading ? '#2d2d2d' : 'white', color: 'black' }}
                            >
                                {downloading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        <Download size={20} /> Download PDF
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="glass" style={{ overflow: 'hidden' }}>
                            <ChatPreview messages={chatData.messages} title={chatData.title} />
                        </div>
                    </motion.div>
                )}

                {!chatData && !loading && (
                    <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.5 }}>
                        <FileText size={48} style={{ margin: '0 auto 1rem' }} />
                        <p>Your chat preview will appear here</p>
                    </div>
                )}
            </main>

            <footer style={{ marginTop: 'auto', padding: '3rem 2rem', textAlign: 'center', color: '#444', fontSize: '0.85rem' }}>
                &copy; 2026 GrabChat • Premium PDF High-Fidelity Capture
            </footer>
        </div>
    );
}

export default App;
