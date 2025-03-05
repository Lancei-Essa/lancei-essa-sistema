import api from './api';

export const login = async (email, password) => {
  try {
    console.log('Tentando fazer login com:', email);
    const response = await api.post('/auth/login', { email, password });
    
    console.log('Resposta do servidor:', response.data);
    
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  } catch (error) {
    console.error('Erro detalhado ao fazer login:', error);
    
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      throw new Error(errorData.message || 'Erro ao fazer login');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tempo limite de conexão esgotado. O servidor está demorando para responder.');
    }
    
    if (!error.response) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    
    throw new Error('Erro na conexão com o servidor. Verifique sua internet.');
  }
};

export const register = async (userData) => {
  try {
    console.log('Tentando registrar usuário:', userData.email);
    const response = await api.post('/auth/register', userData);
    
    console.log('Resposta do servidor (registro):', response.data);
    
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  } catch (error) {
    console.error('Erro detalhado ao registrar:', error);
    
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      throw new Error(errorData.message || 'Erro ao registrar');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tempo limite de conexão esgotado. O servidor está demorando para responder.');
    }
    
    if (!error.response) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    
    throw new Error('Erro na conexão com o servidor. Verifique sua internet.');
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};