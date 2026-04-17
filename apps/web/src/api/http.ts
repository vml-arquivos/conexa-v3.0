import axios, { AxiosHeaders } from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Validar VITE_API_URL obrigatório
const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error(
    'VITE_API_URL não está configurado. ' +
    'Defina a variável de ambiente VITE_API_URL no arquivo .env ou nas configurações do Coolify. ' +
    'Exemplo: VITE_API_URL=https://api.conexa3.casadf.com.br'
  );
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
};

type AuthExpiredAxiosError = AxiosError & {
  isAuthExpired?: boolean;
};

type RefreshAccessTokenResult = {
  accessToken: string | null;
  shouldLogout: boolean;
};

const http = axios.create({
  baseURL,
});

const refreshClient = axios.create({
  baseURL,
});

let refreshPromise: Promise<RefreshAccessTokenResult> | null = null;

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.clear();
  document.cookie = 'access_token=; Max-Age=0; path=/';
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

function isSessionExpiredStatus(status?: number): boolean {
  return status === 401 || status === 403;
}

async function refreshAccessToken(): Promise<RefreshAccessTokenResult> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return { accessToken: null, shouldLogout: true };
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh', { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((response) => {
        const newAccessToken = response.data?.accessToken || response.data?.access_token || response.data?.token;
        if (!newAccessToken) {
          clearSession();
          return { accessToken: null, shouldLogout: true };
        }
        localStorage.setItem('accessToken', newAccessToken);
        return { accessToken: newAccessToken as string, shouldLogout: false };
      })
      .catch((refreshError) => {
        const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
        if (isSessionExpiredStatus(refreshStatus)) {
          clearSession();
          return { accessToken: null, shouldLogout: true };
        }
        throw refreshError;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Request interceptor: adiciona Bearer token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData) {
      config.headers.delete?.('Content-Type');
      delete (config.headers as Record<string, unknown>)['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: 401 → refresh + retry único; falha → logout
http.interceptors.response.use(
  (response) => response,
  async (error: AuthExpiredAxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (status !== 401 || !originalRequest || originalRequest._skipAuthRefresh) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      error.isAuthExpired = true;
      clearSession();
      setTimeout(() => redirectToLogin(), 0);
      return Promise.reject(error);
    }

    const refreshResult = await refreshAccessToken();

    if (!refreshResult.accessToken) {
      if (refreshResult.shouldLogout) {
        error.isAuthExpired = true;
        setTimeout(() => redirectToLogin(), 0);
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    originalRequest.headers = originalRequest.headers ?? new AxiosHeaders();
    originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;

    return http(originalRequest);
  }
);

export function isAuthExpiredError(error: unknown): boolean {
  return Boolean((error as AuthExpiredAxiosError | undefined)?.isAuthExpired);
}

export default http;
