import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Alert, CircularProgress, Button, Collapse, Link } from '@mui/material';
import { YouTube, Refresh, Error, BugReport, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { getYouTubeMetrics, checkYouTubeConnection } from '../services/platforms/youtube';

const YouTubeAnalytics = () => {
  console.log("YouTubeAnalytics montou");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [noDataAvailable, setNoDataAvailable] = useState(false);
  const [detailedError, setDetailedError] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [reconnectRequired, setReconnectRequired] = useState(false);

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  const fetchYouTubeData = async () => {
    console.log("Chamou fetchYouTubeData");
    setLoading(true);
    setError(null);
    setNoDataAvailable(false);
    setDetailedError(null);
    setReconnectRequired(false);
    
    try {
      // Verificar primeiro se temos conexão com YouTube
      const connectionStatus = await checkYouTubeConnection();
      
      if (!connectionStatus.connected) {
        setError('Você não está conectado ao YouTube. Por favor, conecte sua conta primeiro.');
        setReconnectRequired(true);
        setLoading(false);
        return;
      }
      
      // Se estamos conectados, buscar métricas
      const response = await getYouTubeMetrics(true);
      console.log('YouTube data:', response);
      
      if (response && response.success) {
        setData(response.data);
        
        // Verificar se há dados válidos
        if (!verifyDataValidity(response.data)) {
          setNoDataAvailable(true);
        }
      } else {
        console.error('Resposta sem sucesso:', response);
        setError(response?.message || 'Erro ao obter dados do YouTube');
        
        // Capturar detalhes do erro para diagnóstico
        if (response?.detailedError) {
          setDetailedError(response.detailedError);
        }
        
        // Verificar se precisa reconectar
        if (response?.needReconnect) {
          setReconnectRequired(true);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do YouTube:', err);
      
      // Mensagem amigável para o usuário
      setError(err.message || 'Erro ao se comunicar com o servidor');
      
      // Capturar detalhes do erro para diagnóstico
      if (err.detailedError) {
        setDetailedError(err.detailedError);
      } else if (err.originalError) {
        setDetailedError(JSON.stringify(err.originalError, null, 2));
      } else {
        setDetailedError(JSON.stringify(err, null, 2));
      }
      
      // Verificar se precisa reconectar
      if (err.needReconnect) {
        setReconnectRequired(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar a validade dos dados
  const verifyDataValidity = (data) => {
    if (data && data.videos && data.videos.length > 0) {
      console.log('SUCESSO: Dados válidos do YouTube recebidos');
      return true;
    } else {
      console.warn('AVISO: Dados incompletos ou vazios do YouTube');
      return false;
    }
  };

  // Função para reconectar com o YouTube
  const reconnectYouTube = async () => {
    setLoading(true);
    try {
      // Usar o endpoint '/youtube/reconnect' para forçar uma nova conexão
      const response = await fetch('https://lancei-essa-sistema.onrender.com/api/youtube/reconnect');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Redirecionar para a URL de autenticação
        window.location.href = data.authUrl;
        return;
      } else {
        setError('Erro ao obter URL de reconexão: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      setError('Erro ao iniciar reconexão: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <YouTube color="error" sx={{ mr: 1 }} />
          <Typography variant="h5">YouTube Analytics</Typography>
        </Box>
        <Button
          startIcon={<Refresh />}
          onClick={fetchYouTubeData}
          variant="outlined"
          size="small"
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      {noDataAvailable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Atenção:</strong> Não há dados suficientes no seu canal do YouTube. Pode ser necessário ter vídeos publicados para visualizar métricas completas.
        </Alert>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            detailedError && (
              <Button 
                color="inherit" 
                size="small"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                endIcon={showErrorDetails ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              >
                {showErrorDetails ? "Ocultar" : "Detalhes"}
              </Button>
            )
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Error sx={{ mr: 1 }} />
            <Typography>{error}</Typography>
          </Box>
          
          {detailedError && (
            <Collapse in={showErrorDetails}>
              <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: '300px', overflow: 'auto' }}>
                <pre style={{ margin: 0 }}>{typeof detailedError === 'string' ? detailedError : JSON.stringify(detailedError, null, 2)}</pre>
              </Box>
            </Collapse>
          )}
          
          {reconnectRequired && (
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<Refresh />}
                onClick={reconnectYouTube}
                disabled={loading}
              >
                Reconectar YouTube
              </Button>
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                A reconexão resolverá problemas de permissões e tokens inválidos.
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : !data ? (
        <Alert severity="info">
          Não foi possível carregar as métricas do YouTube. Verifique se você está conectado à sua conta do YouTube.
        </Alert>
      ) : (
        <Box>
          <Typography variant="h6" gutterBottom>
            Dados do canal: {data.channelInfo?.title || 'Informação não disponível'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
            <Box>
              <Typography variant="body2" color="textSecondary">Inscritos</Typography>
              <Typography variant="h6">{formatNumber(data.totalStats?.subscribers)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Visualizações</Typography>
              <Typography variant="h6">{formatNumber(data.totalStats?.views)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Vídeos</Typography>
              <Typography variant="h6">{formatNumber(data.totalStats?.videos)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Likes</Typography>
              <Typography variant="h6">{formatNumber(data.totalStats?.likes)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">Comentários</Typography>
              <Typography variant="h6">{formatNumber(data.totalStats?.comments)}</Typography>
            </Box>
          </Box>
          
          {noDataAvailable && (
            <Box sx={{ my: 3 }}>
              <Typography color="textSecondary" gutterBottom>
                Para obter dados do seu canal, é necessário ter vídeos publicados no YouTube.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => window.location.href = '/settings'}
                sx={{ mr: 2 }}
              >
                Verificar conexão com YouTube
              </Button>
              <Button 
                variant="outlined"
                onClick={fetchYouTubeData}
                startIcon={<Refresh />}
              >
                Atualizar dados
              </Button>
            </Box>
          )}
          
          {/* Debug info - apenas visível em desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <BugReport sx={{ mr: 1, fontSize: '1rem' }} />
                Informações de debug:
              </Typography>
              <Box>
                <Link href="https://lancei-essa-sistema.onrender.com/api/youtube/check-scopes" target="_blank" sx={{ fontSize: '0.85rem', display: 'block', my: 1 }}>
                  Verificar escopos do token
                </Link>
                <Link href="https://lancei-essa-sistema.onrender.com/api/youtube/test-analytics" target="_blank" sx={{ fontSize: '0.85rem', display: 'block', my: 1 }}>
                  Testar endpoints da API
                </Link>
              </Box>
              <pre style={{ overflow: 'auto', maxHeight: '200px', fontSize: '0.75rem' }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default YouTubeAnalytics;