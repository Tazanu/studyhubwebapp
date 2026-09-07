import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    // Without a timeout a request to an unreachable API hangs forever and the
    // UI just spins, giving no clue that the server is the problem. 45s is
    // generous on purpose: a free-tier host that has spun down can take ~30s
    // to wake, and cutting that off would turn a slow first load into an error.
    timeout: 45000,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('❌ API Error:', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });

        // A transport failure has no `error.response`, so every call site's
        // `err.response?.data?.error || 'Something failed'` fell through to a
        // generic message that blamed the action rather than the connection.
        // Synthesise one so the UI can say what actually went wrong.
        if (!error.response) {
            error.userMessage =
                error.code === 'ECONNABORTED'
                    ? 'The server took too long to respond. It may be starting up — try again in a moment.'
                    : 'Could not reach the server. Check your connection and try again.';
        }
        // On 401, clear stale auth and redirect to login
        if (error.response?.status === 401) {
            const wasLoggedIn = !!localStorage.getItem('token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];
            if (wasLoggedIn) window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * The message to show a user for a failed request.
 *
 * Prefers the server's own error text, falls back to the transport message set
 * by the interceptor above (unreachable server / timeout), and only then to the
 * caller's generic wording. Use this instead of reading
 * `err.response?.data?.error` directly, which silently blames the action when
 * the real problem is that nothing answered.
 */
export function apiError(err, fallback = 'Something went wrong. Please try again.') {
    return err?.response?.data?.error || err?.userMessage || fallback;
}

export default api;
