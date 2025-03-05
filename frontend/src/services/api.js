import axios from 'axios';

// Verificar se REACT_APP_API_URL está definido, caso contrário, usar localhost
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const api = axios.create({
  baseURL: `${apiUrl}/api`,
  timeout: 30000 // 30 segundos para operações que podem demorar
});

// Interceptor para incluir o token em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;