import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    });
    const [authReady, setAuthReady] = useState(false);

    function login(userData, token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    }

    const refreshUser = useCallback(async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch {}
    }, []);

    // Validate token on load
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setAuthReady(true); return; }
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.get('/auth/me')
            .then(({ data }) => {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            })
            .catch(() => logout())
            .finally(() => setAuthReady(true));
    }, []);

    if (!authReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg">
                <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
