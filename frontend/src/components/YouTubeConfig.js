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
  
  // Para o modo de emergência (quando o backend está tendo problemas)
  const generateEmergencyAuthUrl = () => {
    // Use as credenciais do Google para o projeto Lancei Essa
    const clientId = '1035705950747-7ufvkq0siigic18aucg1ragkgjgbeel.apps.googleusercontent.com';
    
    // Detectar o ambiente atual (local, render, etc.)
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    // Verificar se estamos em ambiente de produção (Render)
    const isRenderEnv = window.location.hostname.includes('onrender.com');
    
    // Construir o URL base baseado no ambiente atual
    let baseUrl;
    if (isLocalhost) {
      // Em localhost, apontamos para o servidor backend local
      baseUrl = 'http://localhost:5002';
    } else if (isRenderEnv) {
      // Em produção no Render, apontamos para a API hospedada
      baseUrl = 'https://lancei-essa-sistema.onrender.com';
    } else {
      // Fallback para outras situações - usar origem atual
      baseUrl = 'https://lancei-essa-sistema.onrender.com';
    }
    
    // URL de redirecionamento específica para cada ambiente
    const redirectUri = `${baseUrl}/api/youtube/oauth2callback`;
    
    console.log('Detectado ambiente:', {
      isLocalhost,
      isRenderEnv,
      hostname: window.location.hostname,
      origin: window.location.origin,
      baseUrl,
      redirectUri
    });
    
    // Escopos do YouTube
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ];
    
    // Construir URL
    return 'https://accounts.google.com/o/oauth2/v2/auth?' + 
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code' +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      '&access_type=offline' +
      '&include_granted_scopes=true';
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Adicionando feedback visual para o usuário
      const connectButton = document.getElementById('youtube-connect-button');
      if (connectButton) {
        connectButton.innerHTML = '<span class="loading-spinner"></span> Conectando...';
        connectButton.style.opacity = '0.7';
      }
      
      console.log('YouTubeConfig: Iniciando conexão com YouTube...');
      
      // TESTE: Usar diretamente o modo de emergência sem tentar a API para depuração
      console.log('MODO DE DEPURAÇÃO: Usando diretamente URL de emergência...');
      const emergencyUrl = generateEmergencyAuthUrl();
      console.log('URL de emergência gerada:', emergencyUrl);
      
      // Antes de redirecionar, mostra um alert com a URL
      // alert(`URL de emergência sendo usada: ${emergencyUrl}`);
      
      window.location.href = emergencyUrl;
      return;
      
      /* CÓDIGO ORIGINAL COMENTADO PARA DEPURAÇÃO
      try {
        // 2. Tentar método normal via API
        console.log('Tentando método normal via API...');
        const response = await getYouTubeAuthUrl();
        console.log('YouTubeConfig: Resposta completa:', response);
        
        if (response && response.success && response.authUrl) {
          console.log('YouTubeConfig: Redirecionando para:', response.authUrl);
          window.location.href = response.authUrl;
          return;
        } else {
          console.error('YouTubeConfig: Resposta não contém URL válida:', response);
          throw new Error('Resposta inválida do servidor');
        }
      } catch (apiError) {
        console.error('Falha ao obter URL via API:', apiError);
        
        // 3. Tentar método direto (modo emergência)
        console.log('Usando método de emergência direto...');
        const emergencyUrl = generateEmergencyAuthUrl();
        console.log('URL de emergência gerada:', emergencyUrl);
        
        window.location.href = emergencyUrl;
      }
      */
    } catch (err) {
      console.error('YouTubeConfig: Erro ao iniciar conexão com YouTube:', err);
      
      // Extrair mensagem de erro mais informativa e detalhada
      let errorMessage = 'Erro desconhecido';
      let errorDetails = '';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      if (typeof err === 'string') {
        errorMessage = err;
      }
      
      if (err.originalError) {
        errorMessage = err.originalError;
      }
      
      // Extração de detalhes adicionais para depuração
      if (err.response && err.response.data) {
        errorDetails = JSON.stringify(err.response.data);
        console.error('Detalhes do erro da API:', err.response.data);
      }
      
      console.error('YouTubeConfig: Mensagem de erro extraída:', errorMessage);
      
      // Mensagem de erro mais detalhada para depuração do problema
      setError(`Erro de conexão: ${errorMessage}${errorDetails ? ` (Detalhes: ${errorDetails})` : ''}`);
      
      // 4. Restaurar estado do botão
      const connectButton = document.getElementById('youtube-connect-button');
      if (connectButton) {
        connectButton.innerHTML = 'Conectar ao YouTube';
        connectButton.style.opacity = '1';
      }
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
            id="youtube-connect-button"
            variant="contained" 
            color="error" 
            startIcon={<YouTube />}
            onClick={handleConnect}
            size="large"
            fullWidth
            sx={{ 
              py: 1.5,
              position: 'relative',
              '& .loading-spinner': {
                display: 'inline-block',
                width: '20px',
                height: '20px',
                marginRight: '8px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                borderTop: '2px solid #fff',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }
            }}
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