import React, { useState, useEffect } from 'react';
import { 
  Stepper, Step, StepLabel, Button, Typography, 
  Paper, Box, CircularProgress, Alert, AppBar, Toolbar, IconButton
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

// Import services
import youtubeService from '../../services/platforms/youtube';
import instagramService from '../../services/platforms/instagram';
import { useAuth } from '../../context/AuthContext';

const PLATFORMS = [
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: <YouTubeIcon color="error" fontSize="large" />,
    service: youtubeService,
    description: 'Publique vídeos e monitore estatísticas do seu canal.'
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: <InstagramIcon color="secondary" fontSize="large" />,
    service: instagramService,
    description: 'Compartilhe fotos e reels automaticamente.'
  },
  { 
    id: 'twitter', 
    name: 'Twitter', 
    icon: <TwitterIcon color="primary" fontSize="large" />,
    service: null, // Será implementado
    description: 'Publique tweets, imagens e videos.'
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: <LinkedInIcon color="primary" fontSize="large" />,
    service: null, // Será implementado
    description: 'Compartilhe atualizações profissionais.'
  },
  { 
    id: 'spotify', 
    name: 'Spotify', 
    icon: <MusicNoteIcon color="success" fontSize="large" />,
    service: null, // Será implementado
    description: 'Sincronize seu podcast no Spotify.'
  }
];

function ConnectionWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated) {
      // Não estamos autenticados, redirecionar para login
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Verifica o status de conexão de todas as plataformas no carregamento
  useEffect(() => {
    const checkAllConnections = async () => {
      setLoading(true);
      const statuses = {};
      
      for (const platform of PLATFORMS) {
        if (platform.service) {
          try {
            const status = await platform.service.checkConnection();
            statuses[platform.id] = status.connected;
          } catch (err) {
            console.error(`Erro ao verificar conexão com ${platform.name}:`, err);
            statuses[platform.id] = false;
          }
        } else {
          // Serviço ainda não implementado
          statuses[platform.id] = false;
        }
      }
      
      setConnectionStatus(statuses);
      setLoading(false);
    };
    
    checkAllConnections();
  }, []);

  // Adicionando um listener para mensagens entre janelas
  useEffect(() => {
    // Função para lidar com mensagens da janela OAuth
    const handleOAuthMessage = (event) => {
      // Verificar a origem da mensagem para segurança
      // Em produção, você limitaria isso apenas ao seu domínio
      
      const message = event.data;
      
      // Verificar se é uma mensagem OAuth
      if (message && (message.type === 'OAUTH_SUCCESS' || message.type === 'OAUTH_ERROR')) {
        console.log('Recebido retorno do OAuth:', message);
        
        // Ação baseada no tipo de mensagem
        if (message.type === 'OAUTH_SUCCESS') {
          // Autenticação bem-sucedida
          setError({
            severity: 'success',
            message: `Conexão com ${message.platform} realizada com sucesso!`
          });
          
          // Atualizar status de conexão
          refreshConnectionStatus();
        } else {
          // Erro na autenticação
          setError({
            severity: 'error',
            message: message.error || `Erro ao conectar com ${message.platform}`
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
  
  // Função para atualizar status de conexão
  const refreshConnectionStatus = async () => {
    setLoading(true);
    
    try {
      const statuses = {};
      
      for (const platform of PLATFORMS) {
        if (platform.service) {
          try {
            const status = await platform.service.checkConnection();
            statuses[platform.id] = status.connected;
          } catch (err) {
            console.error(`Erro ao verificar conexão com ${platform.name}:`, err);
            statuses[platform.id] = false;
          }
        } else {
          statuses[platform.id] = false;
        }
      }
      
      setConnectionStatus(statuses);
    } catch (error) {
      console.error('Erro ao atualizar status de conexões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!platform.service) {
        throw new Error(`Conexão com ${platform.name} ainda não implementada.`);
      }
      
      // Inicia o processo de conexão OAuth
      const authUrl = await platform.service.getAuthUrl();
      
      // Abre a URL de autenticação em uma nova janela
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      // Mostrar instruções enquanto aguarda callback
      setError({
        severity: 'info',
        message: `Por favor, complete a autenticação na janela aberta. Aguardando confirmação...`
      });
      
    } catch (err) {
      console.error(`Erro ao conectar com ${platform.name}:`, err);
      setError({
        severity: 'error',
        message: `Não foi possível conectar ao ${platform.name}: ${err.message}`
      });
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const renderPlatformStep = (platform) => {
    const isConnected = connectionStatus[platform.id];
    
    return (
      <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ mb: 2 }}>
          {platform.icon}
        </Box>
        <Typography variant="h5" component="h2" gutterBottom>
          {platform.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          {platform.description}
        </Typography>
        
        {isConnected ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Conectado com sucesso! Sua conta {platform.name} está vinculada.
          </Alert>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleConnect(platform)}
            disabled={loading || !platform.service}
          >
            {loading ? <CircularProgress size={24} /> : `Conectar ao ${platform.name}`}
          </Button>
        )}
        
        {!platform.service && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Suporte ao {platform.name} em breve.
          </Typography>
        )}
      </Box>
    );
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
            Assistente de Configuração
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Conecte suas Redes Sociais
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Siga os passos para conectar cada plataforma e começar a publicar seu conteúdo automaticamente.
        </Typography>
        
        {error && (
          <Alert severity={error.severity} sx={{ mb: 3 }}>
            {error.message}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {PLATFORMS.map((platform) => (
            <Step key={platform.id}>
              <StepLabel 
                icon={platform.icon}
                error={error && activeStep === PLATFORMS.indexOf(platform)}
                completed={connectionStatus[platform.id]}
              >
                {platform.name}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {renderPlatformStep(PLATFORMS[activeStep])}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button 
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Voltar
          </Button>
          
          <Button
            variant="contained"
            onClick={activeStep === PLATFORMS.length - 1 ? handleReset : handleNext}
          >
            {activeStep === PLATFORMS.length - 1 ? 'Concluir' : 'Próximo'}
          </Button>
        </Box>
        
        {activeStep === PLATFORMS.length - 1 && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="contained" 
              color="success" 
              size="large"
              onClick={handleGoBack}
            >
              Finalizar Configuração
            </Button>
          </Box>
        )}
      </Paper>
    </>
  );
}

export default ConnectionWizard;