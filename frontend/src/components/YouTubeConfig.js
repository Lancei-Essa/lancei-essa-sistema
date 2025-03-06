import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Button, Alert, 
  CircularProgress, Divider, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText,
  Chip, LinearProgress
} from '@mui/material';
import { 
  YouTube, CheckCircle, Error, Refresh, 
  CloudUpload, Schedule, Analytics, BarChart,
  Settings, LinkOff
} from '@mui/icons-material';
import { checkYouTubeConnection, getYouTubeChannelStats, getYouTubeAuthUrl } from '../services/platforms/youtube';

const YouTubeConfig = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channelStats, setChannelStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  
  useEffect(() => {
    checkConnection();
  }, []);
  
  const checkConnection = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await checkYouTubeConnection();
      if (response.success) {
        setConnected(response.connected);
        setTokenExpired(response.expired || false);
        
        // Se conectado, busca estatísticas do canal
        if (response.connected) {
          fetchChannelStats();
        }
      }
    } catch (err) {
      setError('Erro ao verificar conexão com YouTube');
      console.error('Erro ao verificar conexão:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChannelStats = async () => {
    setLoadingStats(true);
    try {
      const response = await getYouTubeChannelStats();
      
      if (response && response.success) {
        setChannelStats(response.data);
      } else {
        console.error('Erro ao buscar estatísticas:', response?.message || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas do canal:', err);
    } finally {
      setLoadingStats(false);
    }
  };
  
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('YouTubeConfig: Iniciando conexão com YouTube...');
      
      // Usar o serviço para obter a URL de autenticação
      const response = await getYouTubeAuthUrl();
      console.log('YouTubeConfig: Resposta completa:', response);
      
      if (response && response.success && response.authUrl) {
        console.log('YouTubeConfig: Redirecionando para:', response.authUrl);
        window.location.href = response.authUrl;
      } else {
        console.error('YouTubeConfig: Resposta não contém URL válida:', response);
        setError('Erro ao gerar URL de autenticação: resposta inválida do servidor');
      }
    } catch (err) {
      console.error('YouTubeConfig: Erro ao iniciar conexão com YouTube:', err);
      
      // Extrair mensagem de erro mais informativa
      let errorMessage = 'Erro desconhecido';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.originalError) {
        errorMessage = err.originalError;
      }
      
      console.error('YouTubeConfig: Mensagem de erro extraída:', errorMessage);
      setError(`Erro ao iniciar conexão com YouTube: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
    // Esta funcionalidade ainda não está implementada no backend
    if (window.confirm('Tem certeza que deseja desconectar do YouTube? Você precisará autorizar novamente para fazer uploads.')) {
      try {
        // await api.post('/youtube/disconnect');
        setConnected(false);
        setChannelStats(null);
      } catch (err) {
        setError('Erro ao desconectar do YouTube');
        console.error(err);
      }
    }
  };
  
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Integração com YouTube</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
        <Typography align="center" color="text.secondary">
          Verificando status da conexão...
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Integração com YouTube</Typography>
        </Box>
        
        <Button 
          startIcon={<Refresh />}
          onClick={checkConnection}
          size="small"
        >
          Atualizar
        </Button>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {tokenExpired && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sua autorização expirou. Por favor, conecte-se novamente ao YouTube.
        </Alert>
      )}
      
      <Box sx={{ mb: 4 }}>
        {connected ? (
          <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Conectado ao YouTube
                </Typography>
              </Box>
              {channelStats && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Canal: {channelStats.title}
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Error sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Não conectado ao YouTube
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Conecte-se ao YouTube para fazer upload de vídeos e gerenciar seu canal.
              </Typography>
            </CardContent>
          </Card>
        )}
        
        {connected ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<LinkOff />}
              onClick={handleDisconnect}
            >
              Desconectar
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<Settings />}
              href="https://studio.youtube.com" 
              target="_blank"
            >
              Abrir YouTube Studio
            </Button>
          </Box>
        ) : (
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<YouTube />}
            onClick={handleConnect}
            size="large"
            fullWidth
            sx={{ py: 1.5 }}
          >
            Conectar ao YouTube
          </Button>
        )}
      </Box>
      
      {connected && (
        <>
          <Typography variant="h6" gutterBottom>
            Estatísticas do Canal
          </Typography>
          
          {loadingStats ? (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Carregando estatísticas...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, mb: 4 }}>
              {channelStats && (
                <>
                  <Chip 
                    icon={<BarChart />} 
                    label={`${channelStats.subscriberCount.toLocaleString()} inscritos`} 
                    color="primary" 
                  />
                  <Chip 
                    icon={<BarChart />} 
                    label={`${channelStats.viewCount.toLocaleString()} visualizações`} 
                    color="primary" 
                  />
                  <Chip 
                    icon={<BarChart />} 
                    label={`${channelStats.videoCount} vídeos`} 
                    color="primary" 
                  />
                </>
              )}
            </Box>
          )}
          
          <Typography variant="h6" gutterBottom>
            Recursos Disponíveis
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <CloudUpload color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Upload de Vídeos" 
                secondary="Faça upload de vídeos diretamente para o YouTube" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Agendamento de Publicações" 
                secondary="Agende quando seus vídeos ficarão públicos" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Analytics color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Análise de Métricas" 
                secondary="Acompanhe o desempenho dos seus vídeos" 
              />
            </ListItem>
          </List>
        </>
      )}
    </Paper>
  );
};

export default YouTubeConfig;