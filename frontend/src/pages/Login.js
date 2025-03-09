import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Paper, Alert, Divider } from '@mui/material';
import { login, register } from '../services/auth';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Registrar novo usuário
        if (!name) {
          throw new Error('Nome é obrigatório para cadastro');
        }
        const response = await register({ name, email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token); // Salva o token no localStorage
        setUser(user);
        navigate('/dashboard');
      } else {
        // Login
        const response = await login(email, password);
        const { token, user } = response.data;
        localStorage.setItem('token', token); // Salva o token no localStorage
        setUser(user);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error details:', error);
      if (isRegistering) {
        if (error.message === 'Usuário já existe') {
          setError('Este email já está cadastrado. Por favor, use outro email ou faça login.');
        } else {
          setError(error.message || 'Falha no cadastro. Tente novamente.');
        }
      } else {
        if (error.message === 'Email ou senha inválidos') {
          setError('Email ou senha incorretos. Tente novamente.');
        } else {
          setError(error.message || 'Falha no login. Verifique sua conexão e tente novamente.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = () => {
    setError('');
    setIsRegistering(!isRegistering);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {isRegistering ? 'Lancei Essa - Cadastro' : 'Lancei Essa - Login'}
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {isRegistering && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Nome"
                name="name"
                autoComplete="name"
                autoFocus={isRegistering}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus={!isRegistering}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type="password"
              id="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Processando...' : isRegistering ? 'Cadastrar' : 'Entrar'}
            </Button>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ textAlign: 'center' }}>
              <Button 
                variant="text" 
                onClick={toggleForm}
                sx={{ mt: 1 }}
              >
                {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;