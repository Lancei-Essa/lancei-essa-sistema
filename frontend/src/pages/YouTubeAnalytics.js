import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Alert, CircularProgress, Button } from '@mui/material';
import { YouTube, Refresh } from '@mui/icons-material';
import { getYouTubeMetrics } from '../services/platforms/youtube';

const YouTubeAnalytics = () => {
  console.log("YouTubeAnalytics montou");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [noDataAvailable, setNoDataAvailable] = useState(false);

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  const fetchYouTubeData = async () => {
    console.log("Chamou fetchYouTubeData");
    setLoading(true);
    setError(null);
    setNoDataAvailable(false);
    
    try {
      // Sempre usar dados reais (true)
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
      }
    } catch (err) {
      console.error('Erro ao buscar dados do YouTube:', err);
      setError('Erro ao se comunicar com o servidor: ' + (err.message || 'Erro desconhecido'));
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
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
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
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => window.location.href = '/settings/youtube'}
              >
                Verificar conexão com YouTube
              </Button>
            </Box>
          )}
          
          {/* Debug info - apenas visível em desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Informações de debug:
              </Typography>
              <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
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