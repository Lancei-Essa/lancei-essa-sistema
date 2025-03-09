import React, { useState, useEffect } from 'react';
import { Typography, Box, Paper, Alert, CircularProgress } from '@mui/material';
import YouTubeDataTable from '../components/YouTubeDataTable';
import { useAuth } from '../context/AuthContext';
import { checkYouTubeConnection } from '../services/platforms/youtube';

const YouTubeAnalytics = () => {
  console.log("YouTubeAnalytics montou");
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log("Verificando conexão com o YouTube...");
        const response = await checkYouTubeConnection();
        console.log("Resposta da verificação de conexão:", response);
        setConnectionStatus(response);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao verificar conexão:", err);
        setError("Não foi possível verificar a conexão com o YouTube");
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      checkConnection();
    } else {
      setError("Você precisa estar autenticado para acessar esta página");
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  // Importante: Mesmo que não esteja conectado, vamos tentar mostrar o componente
  // YouTubeDataTable para que ele possa exibir sua própria mensagem de erro
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Análise de Dados do YouTube
      </Typography>
      
      {connectionStatus && !connectionStatus.connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sua conta não está conectada ao YouTube. Os dados podem não ser exibidos corretamente.
        </Alert>
      )}

      {/* Renderiza o YouTubeDataTable sem condição para debug */}
      <YouTubeDataTable forceRender={true} />
    </Paper>
  );
};

export default YouTubeAnalytics;