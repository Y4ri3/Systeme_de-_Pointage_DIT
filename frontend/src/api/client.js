const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:5000';
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:5000/api/v1';
const AUTH_STORAGE_KEY = 'pointage.auth';

export const appConfig = {
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL || 'http://127.0.0.1:5173',
  backendBaseUrl: import.meta.env.VITE_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  campusWifiName: import.meta.env.VITE_CAMPUS_WIFI_NAME || 'Universite-Campus',
  // La creation d'un etudiant/professeur avec photo declenche une verification
  // faciale synchrone cote backend (~15-20s observes) : un delai de 20s etait
  // trop juste et provoquait des timeouts intermittents.
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 35000),
  useMockApi: String(import.meta.env.VITE_USE_MOCK_API || 'false') === 'true',
  enableApiFallback: String(import.meta.env.VITE_ENABLE_API_FALLBACK || 'false') === 'true',
  kioskKey: import.meta.env.VITE_ATTENDANCE_KIOSK_KEY || ''
};

function getEffectiveApiBaseUrl() {
  const normalizedApiBaseUrl = String(appConfig.apiBaseUrl || '').replace(/\/+$/, '');
  const isLocalBackendApi = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/api\/v1$/i.test(normalizedApiBaseUrl);

  // In local development, use the Vite proxy to avoid browser-side CORS failures.
  if (import.meta.env.DEV && isLocalBackendApi) {
    return '/api/v1';
  }

  return normalizedApiBaseUrl;
}

export function buildApiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getEffectiveApiBaseUrl()}${path}`;
}

export function getStoredAuth() {
  if (typeof window === 'undefined') return null;

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredAuth(authState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAccessToken() {
  return getStoredAuth()?.accessToken || null;
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (appConfig.kioskKey && !headers.has('X-Attendance-Kiosk-Key')) {
    headers.set('X-Attendance-Kiosk-Key', appConfig.kioskKey);
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          data?.detail ||
          (typeof data === 'string' && data) ||
          `Erreur API (${response.status})`
      );

      error.status = response.status;
      error.data = data;

      // 401 alors qu'on avait un token = session expiree/invalidee (pas un
      // simple echec de login, ou il n'y a justement pas encore de token).
      // "role_mismatch" (403) = le role encode dans le jeton ne correspond a
      // aucun role autorise sur cette route : en pratique le jeton stocke ne
      // correspond plus au compte affiche (session melangee entre plusieurs
      // connexions testees dans le meme navigateur). Dans les deux cas on
      // previent le reste de l'app (AuthContext) pour deconnecter proprement
      // et rediriger avec un seul message clair, plutot que de laisser
      // chaque appel de la page echouer independamment avec le meme toast.
      if (token && (response.status === 401 || data?.error === 'role_mismatch')) {
        clearStoredAuth();
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: { reason: data?.error === 'role_mismatch' ? 'role_mismatch' : 'expired' }
          })
        );
      }

      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('La requete a expire.');
      timeoutError.status = 408;
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError = new Error(
        "Impossible de contacter le backend. Verifiez qu'il est demarre et que le proxy/CORS est correctement configure."
      );
      networkError.status = 0;
      networkError.cause = error;
      throw networkError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiDownload(path, options = {}) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    const error = new Error(data?.message || `Erreur de telechargement (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  return {
    blob,
    filename: filenameMatch?.[1] || options.filename || 'export'
  };
}

export function shouldUseMockApi() {
  return appConfig.useMockApi;
}

export function canUseFallback(error) {
  if (!appConfig.enableApiFallback) return false;
  if (!error) return true;

  return error.status === undefined || error.status === 408 || error.status >= 500;
}

export async function withMockFallback(apiCall, fallbackCall) {
  if (shouldUseMockApi()) {
    return fallbackCall();
  }

  try {
    return await apiCall();
  } catch (error) {
    if (!canUseFallback(error)) {
      throw error;
    }

    return fallbackCall(error);
  }
}
