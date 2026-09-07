import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    // Without a timeout a request to an unreachable API hangs forever and the
    // UI just spins, giving no clue that the server is the problem. 45s is
    // generous on purpose: a free-tier host that has spun down can take ~30s
    // to wake, and cutting that off would turn a slow first load into an error.
    timeout: 45000,
});

// ── Cold-start recovery ─────────────────────────────────────────────────────
// A free-tier host sleeps after ~15 minutes idle. The first request to reach it
// is usually dropped or times out while the container boots, so a visitor
// arriving from a shared link sees a failure on a perfectly healthy service.
// Retrying transport failures turns that into a slow load rather than an error.
//
// Deliberately narrow: only requests that never got a response are retried.
// Anything the server actually answered — including a 500 — is left alone,
// because retrying a POST the server did process could duplicate it.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

/** True when the request failed in transit and can be safely repeated. */
function isRetriableTransportFailure(error) {
    if (error.response) return false;            // server answered; not a transport issue
    if (axios.isCancel?.(error)) return false;   // caller aborted on purpose
    return error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
}

/** Lets the UI show "waking the server up" instead of a generic spinner. */
let wakingListeners = new Set();
export function onServerWaking(fn) {
    wakingListeners.add(fn);
    return () => wakingListeners.delete(fn);
}
const emitWaking = state => wakingListeners.forEach(fn => { try { fn(state); } catch { /* listener's problem */ } });

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        emitWaking(false); // a successful response means the server is awake
        return response;
    },
    async (error) => {
        const config = error.config;

        if (config && isRetriableTransportFailure(error)) {
            config.__retryCount = config.__retryCount || 0;
            if (config.__retryCount < MAX_RETRIES) {
                config.__retryCount += 1;
                emitWaking(true);
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * config.__retryCount));
                return api(config);
            }
        }
        emitWaking(false);

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
                    ? 'The server is taking too long to respond. It may be starting up after a period of inactivity — please try again in a minute.'
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
