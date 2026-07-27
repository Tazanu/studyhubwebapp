import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * PHASE 1 TEST PAGE
 * 
 * This page validates that the WebSocket infrastructure is working correctly.
 * 
 * HOW TO TEST:
 * 1. Open two browser windows side-by-side
 * 2. Log in as different users (or same user in incognito)
 * 3. Join the same group chat in both windows
 * 4. Send a message in one window
 * 5. Verify it appears INSTANTLY in the other window (no refresh needed)
 * 
 * SUCCESS CRITERIA:
 * - "Connected" status shows in green
 * - Message appears in <1 second in the other window
 * - Console shows "message:new" event received
 * 
 * ROLLBACK PLAN:
 * If this test fails, Phase 1 is broken. Do NOT proceed to Phase 2.
 * Revert backend changes and investigate socket connection issues.
 */

export default function SocketTest() {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Get token from localStorage (assumes user is logged in)
        const token = localStorage.getItem('token');
        
        if (!token) {
            setError('No token found. Please log in first.');
            return;
        }

        console.log('🔌 Initializing Socket.IO connection...');

        // Create socket connection with authentication
        const socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
            auth: { token },
            transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
        });

        socketInstance.on('connect', () => {
            console.log('✅ Socket connected:', socketInstance.id);
            setConnected(true);
            setError(null);
        });

        socketInstance.on('connect_error', (err) => {
            console.error('❌ Connection error:', err.message);
            setError(`Connection failed: ${err.message}`);
            setConnected(false);
        });

        socketInstance.on('disconnect', (reason) => {
            console.warn('🔌 Disconnected:', reason);
            setConnected(false);
        });

        // Listen for new messages (broadcast from other clients)
        socketInstance.on('message:new', (message) => {
            console.log('📩 Received message:new event:', message);
            setMessages(prev => [...prev, {
                type: 'message:new',
                data: message,
                timestamp: new Date().toISOString()
            }]);
        });

        // Listen for message edits
        socketInstance.on('message:edit', (message) => {
            console.log('✏️ Received message:edit event:', message);
            setMessages(prev => [...prev, {
                type: 'message:edit',
                data: message,
                timestamp: new Date().toISOString()
            }]);
        });

        // Listen for typing indicators
        socketInstance.on('typing:update', (data) => {
            console.log('⌨️ Typing update:', data);
            setMessages(prev => [...prev, {
                type: 'typing:update',
                data,
                timestamp: new Date().toISOString()
            }]);
        });

        // Listen for user join/leave
        socketInstance.on('user:joined', (data) => {
            console.log('👋 User joined:', data);
            setMessages(prev => [...prev, {
                type: 'user:joined',
                data,
                timestamp: new Date().toISOString()
            }]);
        });

        socketInstance.on('user:left', (data) => {
            console.log('👋 User left:', data);
            setMessages(prev => [...prev, {
                type: 'user:left',
                data,
                timestamp: new Date().toISOString()
            }]);
        });

        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
            console.log('🔌 Disconnecting socket...');
            socketInstance.disconnect();
        };
    }, []);

    const handleJoinGroup = (groupId) => {
        if (!socket) return;
        console.log(`📥 Joining group ${groupId}...`);
        socket.emit('group:join', groupId);
    };

    const handleLeaveGroup = (groupId) => {
        if (!socket) return;
        console.log(`📤 Leaving group ${groupId}...`);
        socket.emit('group:leave', groupId);
    };

    const handleStartTyping = (groupId) => {
        if (!socket) return;
        socket.emit('typing:start', groupId);
    };

    const handleStopTyping = (groupId) => {
        if (!socket) return;
        socket.emit('typing:stop', groupId);
    };

    return (
        <div style={{ 
            padding: '2rem', 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'var(--bg-main)',
            minHeight: '100vh',
            color: 'var(--text-primary)'
        }}>
            <h1 style={{ marginBottom: '1rem', fontFamily: "'Space Grotesk', sans-serif" }}>
                WebSocket Phase 1 Test
            </h1>

            {/* Connection Status */}
            <div style={{
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                background: connected ? '#10b98120' : '#ef444420',
                border: `2px solid ${connected ? '#10b981' : '#ef4444'}`
            }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                    Status: {connected ? '✅ Connected' : '❌ Disconnected'}
                </p>
                {socket?.id && <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', opacity: 0.7 }}>
                    Socket ID: {socket.id}
                </p>}
                {error && <p style={{ margin: '0.5rem 0 0', color: '#ef4444', fontSize: '0.875rem' }}>
                    {error}
                </p>}
            </div>

            {/* Test Controls */}
            <div style={{
                padding: '1.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Test Actions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button 
                        onClick={() => handleJoinGroup(1)}
                        disabled={!connected}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg,#0052cc,#0066ff)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: connected ? 'pointer' : 'not-allowed',
                            opacity: connected ? 1 : 0.5
                        }}
                    >
                        Join Group 1
                    </button>
                    <button 
                        onClick={() => handleLeaveGroup(1)}
                        disabled={!connected}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: connected ? 'pointer' : 'not-allowed',
                            opacity: connected ? 1 : 0.5
                        }}
                    >
                        Leave Group 1
                    </button>
                    <button 
                        onClick={() => handleStartTyping(1)}
                        disabled={!connected}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: connected ? 'pointer' : 'not-allowed',
                            opacity: connected ? 1 : 0.5
                        }}
                    >
                        Start Typing (Group 1)
                    </button>
                    <button 
                        onClick={() => handleStopTyping(1)}
                        disabled={!connected}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: connected ? 'pointer' : 'not-allowed',
                            opacity: connected ? 1 : 0.5
                        }}
                    >
                        Stop Typing (Group 1)
                    </button>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', opacity: 0.7 }}>
                    💡 Open this page in two windows and test real-time events
                </p>
            </div>

            {/* Event Log */}
            <div style={{
                padding: '1.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Event Log</h3>
                    <button
                        onClick={() => setMessages([])}
                        style={{
                            padding: '0.25rem 0.75rem',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Clear
                    </button>
                </div>
                <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                }}>
                    {messages.length === 0 ? (
                        <p style={{ opacity: 0.5, fontStyle: 'italic' }}>
                            No events yet. Try sending a message in GroupChat...
                        </p>
                    ) : (
                        messages.map((msg, idx) => (
                            <div 
                                key={idx}
                                style={{
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                    background: 'var(--bg-main)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-subtle)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                                        {msg.type}
                                    </span>
                                    <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <pre style={{ 
                                    margin: 0, 
                                    whiteSpace: 'pre-wrap', 
                                    wordBreak: 'break-word',
                                    opacity: 0.8,
                                    fontSize: '0.8125rem'
                                }}>
                                    {JSON.stringify(msg.data, null, 2)}
                                </pre>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#3b82f620',
                border: '1px solid #3b82f660',
                borderRadius: '8px',
                fontSize: '0.875rem'
            }}>
                <h4 style={{ marginTop: 0 }}>✅ Phase 1 Success Criteria:</h4>
                <ol style={{ marginBottom: 0, paddingLeft: '1.5rem' }}>
                    <li>Connection status shows "Connected" in green</li>
                    <li>Open two browser windows with different users</li>
                    <li>Both join the same group (use "Join Group 1" button)</li>
                    <li>Go to actual GroupChat page and send a message</li>
                    <li>Message appears in this log instantly (no polling delay)</li>
                </ol>
            </div>
        </div>
    );
}
