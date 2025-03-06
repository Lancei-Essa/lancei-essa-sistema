import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Grid, Card, CardContent, 
  Box, CircularProgress, Button, Tooltip, Chip,
  AppBar, Toolbar, IconButton
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

// Serviços a serem implementados
import { checkAllConnections } from '../../services/monitoring/connectionMonitor';

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

// Simulação da verificação de conexões - substituir por chamadas API reais
const mockCheckConnections = async () => {
  // Simular tempo de resposta da API
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    youtube: { connected: true, lastCheck: new Date(), tokenExpiresIn: 30 },
    instagram: { connected: true, lastCheck: new Date(), tokenExpiresIn: 60 },
    twitter: { connected: false, lastCheck: new Date(), error: 'Token expirado' },
    linkedin: { connected: true, lastCheck: new Date(), tokenExpiresIn: 5 },
    spotify: { connected: true, lastCheck: new Date(), tokenExpiresIn: 45 }
  };
};

function ConnectionStatusDashboard() {
  const [connectionStatus, setConnectionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    refreshConnectionStatus();
  }, []);

  const refreshConnectionStatus = async () => {
    setLoading(true);
    
    try {
      // Substituir pela implementação real depois
      const statuses = await mockCheckConnections();
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

  const handleReconnect = (platform) => {
    // Redirecionar para o assistente de conexão
    navigate('/setup');
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
          
          {lastRefresh && (
            <Typography variant="caption" display="block" sx={{ textAlign: 'right', mt: 0.5 }}>
              Última verificação: {lastRefresh.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Box>
      
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
                      
                      {(!status || !status.connected || 
                        (status.tokenExpiresIn && status.tokenExpiresIn < 10)) && (
                        <Button 
                          size="small" 
                          color="primary" 
                          onClick={() => handleReconnect(platform.id)}
                        >
                          Reconectar
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
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