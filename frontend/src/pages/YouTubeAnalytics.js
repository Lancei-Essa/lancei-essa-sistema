import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Alert, CircularProgress, Button } from '@mui/material';
import { YouTube, Refresh } from '@mui/icons-material';
import { getYouTubeMetrics } from '../services/platforms/youtube';

const YouTubeAnalytics = () => {
  console.log("YouTubeAnalytics montou");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchYouTubeData();
  }, []);

  const fetchYouTubeData = async () => {
    console.log("Chamou fetchYouTubeData");
    setLoading(true);
    setError(null);
    
    try {
      console.log("Antes de chamar getYouTubeMetrics");
      // Chamada direta para o serviço
      const response = await getYouTubeMetrics();
      console.log('YouTube data:', response);
      
      if (response && response.success) {
        setData(response.data);
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
            Dados carregados com sucesso!
          </Typography>
          <Typography variant="body1">
            Canal: {data.channelInfo?.title || 'Informação não disponível'}
          </Typography>
          <Typography variant="body1">
            Inscritos: {formatNumber(data.totalStats?.subscribers)}
          </Typography>
          <Typography variant="body1">
            Visualizações: {formatNumber(data.totalStats?.views)}
          </Typography>
          <Typography variant="body1">
            Vídeos: {formatNumber(data.totalStats?.videos)}
          </Typography>
          
          {/* Podemos expandir isso para mostrar mais dados conforme necessário */}
          
          {/* Debug info */}
          <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Informações de debug:
            </Typography>
            <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default YouTubeAnalytics;