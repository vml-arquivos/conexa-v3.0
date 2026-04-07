import axios from 'axios';

// Validar VITE_API_URL obrigatório
const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error(
    'VITE_API_URL não está configurado. ' +
    'Defina a variável de ambiente VITE_API_URL no arquivo .env ou nas configurações do Coolify. ' +
    'Exemplo: VITE_API_URL=https://api.conexa3.casadf.com.br'
  );
}

const http = axios.create({
  baseURL,
});

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

// Response interceptor: 401 → logout
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logout: limpar tokens e redirecionar
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default http;
