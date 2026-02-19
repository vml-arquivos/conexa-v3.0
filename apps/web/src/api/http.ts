import axios from 'axios';

// Validar VITE_API_BASE_URL obrigatório
const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error(
    'VITE_API_BASE_URL não está configurado. ' +
    'Defina a variável de ambiente VITE_API_BASE_URL no arquivo .env ou nas configurações do Coolify. ' +
    'Exemplo: VITE_API_BASE_URL=https://apiconexa.casadf.com.br'
  );
}

const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: adiciona Bearer token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
