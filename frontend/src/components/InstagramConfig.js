import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Button, Alert, 
  CircularProgress, Divider, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText,
  Chip, LinearProgress
} from '@mui/material';
import { 
  Instagram, CheckCircle, Error, Refresh, 
  PhotoCamera, Schedule, Analytics, PeopleAlt,
  Link as LinkIcon, LinkOff
} from '@mui/icons-material';
import { checkInstagramConnection } from '../services/platforms/instagram';

const InstagramConfig = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  useEffect(() => {
    // Verificar status da conexão com Instagram ao carregar o componente
    checkConnection();
  }, []);
  
  const checkConnection = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await checkInstagramConnection();
      if (response && response.success) {
        setConnected(response.connected);
        if (response.connected) {
          fetchMetrics();
        }
      } else {
        setError(response?.message || 'Erro ao verificar conexão com Instagram');
      }
    } catch (err) {
      setError('Erro ao verificar conexão com Instagram: ' + (err.message || 'Erro desconhecido'));
      console.error('Erro na verificação do Instagram:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const response = await fetch('/api/instagram/metrics');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMetrics(data.data);
        } else {
          console.error('Erro ao buscar métricas:', data.message);
        }
      } else {
        console.error('Erro na requisição de métricas:', response.statusText);
      }
    } catch (err) {
      console.error('Erro ao buscar métricas do Instagram:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };
  
  const handleConnect = () => {
    // Redirecionar para o endpoint de autenticação do Instagram
    window.location.href = '/api/instagram/auth';
  };
  
  const handleDisconnect = async () => {
    if (window.confirm('Tem certeza que deseja desconectar do Instagram? Você precisará autorizar novamente para acessar os recursos.')) {
      try {
        const response = await fetch('/api/instagram/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConnected(false);
            setMetrics(null);
          } else {
            setError(data.message || 'Erro ao desconectar do Instagram');
          }
        } else {
          setError('Erro na requisição de desconexão: ' + response.statusText);
        }
      } catch (err) {
        setError('Erro ao desconectar do Instagram: ' + (err.message || 'Erro desconhecido'));
        console.error('Erro ao desconectar:', err);
      }
    }
  };
  
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Instagram color="primary" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Integração com Instagram</Typography>
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
          <Instagram color="primary" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Integração com Instagram</Typography>
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
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Esta é uma versão de demonstração da integração com Instagram. O backend para esta funcionalidade ainda não foi implementado.
      </Alert>
      
      <Box sx={{ mb: 4 }}>
        {connected ? (
          <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Conectado ao Instagram
                </Typography>
              </Box>
              {metrics && metrics.profile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Perfil: {metrics.profile.username}
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
                  Não conectado ao Instagram
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Conecte-se ao Instagram para gerenciar suas publicações na plataforma.
              </Typography>
            </CardContent>
          </Card>
        )}
        
        {connected ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<LinkOff />}
              onClick={handleDisconnect}
            >
              Desconectar
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<LinkIcon />}
              href="https://www.instagram.com" 
              target="_blank"
            >
              Abrir Instagram
            </Button>
          </Box>
        ) : (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Instagram />}
            onClick={handleConnect}
            size="large"
            fullWidth
            sx={{ py: 1.5 }}
          >
            Conectar ao Instagram
          </Button>
        )}
      </Box>
      
      {connected && (
        <>
          <Typography variant="h6" gutterBottom>
            Estatísticas do Perfil
          </Typography>
          
          {loadingMetrics ? (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Carregando estatísticas...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, mb: 4 }}>
              {metrics && (
                <>
                  <Chip 
                    icon={<PeopleAlt />} 
                    label={`${metrics.followerCount.toLocaleString()} seguidores`} 
                    color="primary" 
                  />
                  <Chip 
                    icon={<PhotoCamera />} 
                    label={`${metrics.mediaCount} posts`} 
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
                <PhotoCamera color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Publicação de Fotos e Vídeos" 
                secondary="Publique conteúdo diretamente no Instagram" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Agendamento de Posts" 
                secondary="Agende suas publicações para os melhores horários" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Analytics color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Métricas de Engajamento" 
                secondary="Acompanhe o desempenho das suas publicações" 
              />
            </ListItem>
          </List>
        </>
      )}
    </Paper>
  );
};

export default InstagramConfig;