import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Grid, Card, CardContent, 
  Box, CircularProgress, Button, Tooltip, Chip,
  AppBar, Toolbar, IconButton, Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useNavigate } from 'react-router-dom';

// Serviços de conexão com as redes sociais
import connectionMonitor from '../../services/monitoring/connectionMonitor';

const PLATFORMS = [
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: <YouTubeIcon sx={{ color: '#FF0000' }} fontSize="large" />,
    checkEndpoint: '/api/youtube/check-connection',
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: <InstagramIcon sx={{ color: '#C13584' }} fontSize="large" />, 
    checkEndpoint: '/api/instagram/check-connection',
  },
  { 
    id: 'twitter', 
    name: 'Twitter', 
    icon: <TwitterIcon sx={{ color: '#1DA1F2' }} fontSize="large" />,
    checkEndpoint: '/api/twitter/check-connection', 
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: <LinkedInIcon sx={{ color: '#0077B5' }} fontSize="large" />,
    checkEndpoint: '/api/linkedin/check-connection',
  },
  { 
    id: 'spotify', 
    name: 'Spotify', 
    icon: <MusicNoteIcon sx={{ color: '#1DB954' }} fontSize="large" />,
    checkEndpoint: '/api/spotify/check-connection',
  }
];

// Já importamos o serviço de conexão acima

function ConnectionStatusDashboard() {
  const [connectionStatus, setConnectionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    refreshConnectionStatus();
  }, []);

  const refreshConnectionStatus = async () => {
    setLoading(true);
    
    try {
      // Usando o serviço real para verificar conexões
      const statuses = await connectionMonitor.checkAllConnections();
      setConnectionStatus(statuses);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Erro ao verificar status das conexões:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return <ErrorIcon color="error" />;
    
    if (!status.connected) {
      return <ErrorIcon color="error" />;
    } else if (status.tokenExpiresIn && status.tokenExpiresIn < 10) {
      return <WarningIcon sx={{ color: 'orange' }} />;
    } else {
      return <CheckCircleIcon color="success" />;
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Não conectado';
    
    if (!status.connected) {
      return status.error || 'Não conectado';
    } else if (status.tokenExpiresIn && status.tokenExpiresIn < 10) {
      return `Token expira em ${status.tokenExpiresIn} dias`;
    } else {
      return 'Conectado';
    }
  };

  const getStatusChip = (status) => {
    if (!status || !status.connected) {
      return <Chip 
        label="Desconectado" 
        color="error" 
        size="small" 
        variant="outlined" 
      />;
    } else if (status.tokenExpiresIn && status.tokenExpiresIn < 10) {
      return <Chip 
        label="Renovação necessária" 
        color="warning" 
        size="small" 
        variant="outlined" 
      />;
    } else {
      return <Chip 
        label="Conectado" 
        color="success" 
        size="small" 
        variant="outlined" 
      />;
    }
  };

  // Adicionar um listener para mensagens entre janelas (OAuth)
  useEffect(() => {
    const handleOAuthMessage = (event) => {
      const message = event.data;
      
      // Verificar se é uma mensagem OAuth
      if (message && (message.type === 'OAUTH_SUCCESS' || message.type === 'OAUTH_ERROR')) {
        console.log('Recebido retorno do OAuth:', message);
        
        if (message.type === 'OAUTH_SUCCESS') {
          // Autenticação bem-sucedida
          setMessage({
            severity: 'success',
            text: `Conexão com ${message.platform} realizada com sucesso!`
          });
          
          // Atualizar status de conexão
          refreshConnectionStatus();
        } else {
          // Erro na autenticação
          setMessage({
            severity: 'error',
            text: message.error || `Erro ao conectar com ${message.platform}`
          });
        }
        
        setLoading(false);
      }
    };
    
    // Adicionar o listener
    window.addEventListener('message', handleOAuthMessage);
    
    // Remover listener ao desmontar
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  const handleConnect = async (platform) => {
    setLoading(true);
    setMessage(null);
    
    // Verificar se o serviço da plataforma está implementado
    if (platform === 'youtube') {
      try {
        const youtubeService = require('../../services/platforms/youtube').default;
        const authUrl = await youtubeService.getAuthUrl();
        
        // Abre a URL de autenticação em uma nova janela
        window.open(authUrl, '_blank', 'width=600,height=700');
        
        // Mostrar mensagem de aguardando
        setMessage({
          severity: 'info',
          text: `Por favor, complete a autenticação na janela aberta. Aguardando confirmação...`
        });
      } catch (error) {
        console.error(`Erro ao conectar com ${platform}:`, error);
        setMessage({
          severity: 'error',
          text: `Erro ao iniciar conexão com ${platform}: ${error.message}`
        });
        setLoading(false);
      }
    } else {
      // Para outras plataformas, redirecionar para o assistente
      navigate('/setup');
    }
  };
  
  const handleGoBack = () => {
    navigate('/social-media');
  };

  return (
    <>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleGoBack} aria-label="voltar">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Status de Conexões
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Paper elevation={3} sx={{ p: 3, m: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Status das Conexões
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => navigate('/setup')}
            >
              Assistente de Conexão
            </Button>
            
            <Button 
              startIcon={<RefreshIcon />}
              onClick={refreshConnectionStatus}
              disabled={loading}
              size="small"
              variant="outlined"
            >
              {loading ? 'Atualizando...' : 'Atualizar Status'}
            </Button>
          </Box>
        </Box>
        
        {lastRefresh && (
          <Typography variant="caption" display="block" sx={{ textAlign: 'right', mb: 2 }}>
            Última verificação: {lastRefresh.toLocaleTimeString()}
          </Typography>
        )}
        
        {message && (
          <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
            <Grid container spacing={2}>
              {PLATFORMS.map((platform) => {
                const status = connectionStatus[platform.id];
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={platform.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          mb: 2 
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {platform.icon}
                            <Typography variant="subtitle1" sx={{ ml: 1 }}>
                              {platform.name}
                            </Typography>
                          </Box>
                          
                          <Tooltip title={getStatusText(status)}>
                            <Box>{getStatusIcon(status)}</Box>
                          </Tooltip>
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {getStatusChip(status)}
                          
                          <Button 
                            size="small" 
                            color="primary" 
                            onClick={() => handleConnect(platform.id)}
                          >
                            {(!status || !status.connected) ? "Conectar" : "Reconectar"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            O sistema verifica automaticamente a saúde das conexões a cada 24 horas e tenta renovar tokens prestes a expirar.
          </Typography>
        </Box>
      </Paper>
    </>
  );
}

export default ConnectionStatusDashboard;