import axios from 'axios';

// Verificar se REACT_APP_API_URL está definido, caso contrário, usar localhost
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5002';

console.log('API URL Configuration:', {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  apiUrl: apiUrl,
  fullBaseURL: `${apiUrl}/api`
});

const api = axios.create({
  baseURL: `${apiUrl}/api`,
  timeout: 30000, // 30 segundos para operações que podem demorar
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para incluir o token em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API Request] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

// Interceptor para log de respostas
api.interceptors.response.use(
  response => {
    console.log(`[API Response Success] ${response.config.method.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  error => {
    if (error.response) {
      console.error(`[API Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('[API No Response] A requisição foi feita mas não recebeu resposta:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        baseURL: error.config?.baseURL
      });
      
      // Testar conectividade com o backend
      fetch('http://localhost:5002/api/auth/status')
        .then(response => {
          console.log('[API Connectivity Test] Backend respondeu:', response.status);
        })
        .catch(err => {
          console.error('[API Connectivity Test] Falha ao conectar com backend:', err.message);
        });
        
    } else {
      console.error('[API Request Error]', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;