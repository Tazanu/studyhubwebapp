import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/**
 * Live connection to one group's chat room.
 *
 * The server already emitted message:new / message:edit and nothing listened,
 * so the chat fell back to a 4-second poll — messages arrived late, and every
 * poll refetched the entire history. This subscribes properly; polling stays on
 * as a slow safety net for when the socket is down.
 *
 * Handlers are held in a ref so a parent re-render doesn't tear the connection
 * down and rebuild it — reconnecting on every keystroke would be worse than
 * polling.
 */
export default function useGroupSocket(groupId, handlers) {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const handlersRef = useRef(handlers);
    // Kept in sync via an effect rather than assigned during render: mutating a
    // ref while rendering is not a safe render-phase operation.
    useEffect(() => { handlersRef.current = handlers; });

    useEffect(() => {
        if (!groupId) return undefined;
        const token = localStorage.getItem('token');
        if (!token) return undefined;   // socket auth is token-only; nothing to connect with

        const socket = io(SOCKET_ORIGIN, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        const call = (name, ...args) => handlersRef.current?.[name]?.(...args);

        socket.on('connect', () => {
            setConnected(true);
            // Rejoin on every connect, not just the first: after a reconnect the
            // server has no memory of which room this socket was in.
            socket.emit('group:join', Number(groupId));
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', () => setConnected(false));

        socket.on('message:new', m => call('onNewMessage', m));
        socket.on('message:edit', m => call('onEditMessage', m));
        socket.on('message:delete', m => call('onDeleteMessage', m));
        socket.on('message:reaction', p => call('onReaction', p));
        socket.on('typing:update', p => call('onTyping', p));

        return () => {
            socket.emit('group:leave', Number(groupId));
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [groupId]);

    /** Tell the room this user started or stopped typing. */
    const emitTyping = (isTyping) => {
        socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', Number(groupId));
    };

    return { connected, emitTyping };
}
