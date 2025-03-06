import React, { useState, useEffect } from 'react';
import { 
  Box, Tab, Tabs, Typography, Paper, Grid, Button
} from '@mui/material';
import { 
  YouTube, Instagram, LinkedIn, Twitter, Facebook
} from '@mui/icons-material';
// TikTok não está disponível no pacote @mui/icons-material, usando alternativa
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useNavigate } from 'react-router-dom';
import YouTubeConfig from './YouTubeConfig';
import YouTubeUpload from './YouTubeUpload';
import InstagramConfig from './InstagramConfig';

// Serviços de API
import youtubeService from '../services/platforms/youtube';
import instagramService from '../services/platforms/instagram';

/**
 * Hub central de integração com redes sociais
 * Permite alternar entre diferentes plataformas e visualizar/configurar cada uma delas
 */
const SocialMediaHub = () => {
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [activeSection, setActiveSection] = useState('config');
  const [connections, setConnections] = useState({
    youtube: { connected: false, loading: true },
    instagram: { connected: false, loading: true },
    twitter: { connected: false, loading: true },
    linkedin: { connected: false, loading: true },
    tiktok: { connected: false, loading: true }
  });
  
  const navigate = useNavigate();
  
  // Verificar status das conexões ao carregar o componente
  useEffect(() => {
    checkConnections();
  }, []);
  
  // Função para verificar o status de todas as conexões
  const checkConnections = async () => {
    // YouTube
    try {
      const youtubeStatus = await youtubeService.checkConnection();
      setConnections(prev => ({
        ...prev,
        youtube: { 
          connected: youtubeStatus.connected, 
          loading: false 
        }
      }));
    } catch (error) {
      console.error('Erro ao verificar conexão com YouTube:', error);
      setConnections(prev => ({
        ...prev,
        youtube: { connected: false, loading: false }
      }));
    }
    
    // Instagram
    try {
      const instagramStatus = await instagramService.checkConnection();
      setConnections(prev => ({
        ...prev,
        instagram: { 
          connected: instagramStatus.connected, 
          loading: false 
        }
      }));
    } catch (error) {
      console.error('Erro ao verificar conexão com Instagram:', error);
      setConnections(prev => ({
        ...prev,
        instagram: { connected: false, loading: false }
      }));
    }
    
    // Outras plataformas (simulado por enquanto)
    setTimeout(() => {
      setConnections(prev => ({
        ...prev,
        twitter: { connected: false, loading: false },
        linkedin: { connected: false, loading: false },
        tiktok: { connected: false, loading: false }
      }));
    }, 1000);
  };
  
  const handlePlatformChange = (event, newPlatform) => {
    setActivePlatform(newPlatform);
    setActiveSection('config'); // Reset para a seção de configuração ao mudar de plataforma
  };
  
  const handleSectionChange = (event, newSection) => {
    setActiveSection(newSection);
  };
  
  // Componentes para cada plataforma/seção
  const renderContent = () => {
    switch (activePlatform) {
      case 'youtube':
        return activeSection === 'config' ? (
          <YouTubeConfig />
        ) : (
          <YouTubeUpload />
        );
      
      case 'instagram':
        return <InstagramConfig />;
      
      case 'linkedin':
      case 'twitter':
      case 'facebook':
      case 'tiktok':
        return (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Integração em Desenvolvimento
            </Typography>
            <Typography variant="body1">
              A integração com esta plataforma será implementada em breve.
            </Typography>
          </Paper>
        );
        
      default:
        return null;
    }
  };
  
  // Determinar quais seções estão disponíveis para cada plataforma
  const getSectionsForPlatform = (platform) => {
    switch (platform) {
      case 'youtube':
        return [
          { value: 'config', label: 'Configuração' },
          { value: 'upload', label: 'Upload de Vídeo' }
        ];
      
      case 'instagram':
        return [
          { value: 'config', label: 'Configuração' }
          // Outras seções serão adicionadas conforme implementadas
        ];
        
      default:
        return [
          { value: 'config', label: 'Configuração' }
        ];
    }
  };
  
  // Botão de navegação para o wizard de configuração
  const goToSetupWizard = () => {
    navigate('/setup');
  };
  
  // Botão de navegação para o dashboard de status
  const goToStatusDashboard = () => {
    navigate('/connection-status');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Plataformas Sociais
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={goToSetupWizard}
            sx={{ mr: 2 }}
          >
            Assistente de Configuração
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary"
            onClick={goToStatusDashboard}
          >
            Status das Conexões
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activePlatform}
          onChange={handlePlatformChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Plataformas de mídia social"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<YouTube />} 
            iconPosition="start"
            label="YouTube" 
            value="youtube" 
          />
          <Tab 
            icon={<Instagram />} 
            iconPosition="start"
            label="Instagram" 
            value="instagram" 
          />
          <Tab 
            icon={<LinkedIn />} 
            iconPosition="start"
            label="LinkedIn" 
            value="linkedin" 
          />
          <Tab 
            icon={<Twitter />} 
            iconPosition="start"
            label="Twitter" 
            value="twitter" 
          />
          <Tab 
            icon={<Facebook />} 
            iconPosition="start"
            label="Facebook" 
            value="facebook" 
          />
          <Tab 
            icon={<MusicNoteIcon />} 
            iconPosition="start"
            label="TikTok" 
            value="tiktok" 
          />
        </Tabs>
        
        {/* Subseções para cada plataforma */}
        {getSectionsForPlatform(activePlatform).length > 1 && (
          <Tabs
            value={activeSection}
            onChange={handleSectionChange}
            aria-label="Seções da plataforma"
            sx={{ px: 2 }}
          >
            {getSectionsForPlatform(activePlatform).map(section => (
              <Tab 
                key={section.value}
                label={section.label} 
                value={section.value} 
              />
            ))}
          </Tabs>
        )}
      </Paper>
      
      {/* Alerta se não houver conexão com a plataforma selecionada */}
      {!connections[activePlatform]?.loading && !connections[activePlatform]?.connected && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light' }}>
          <Typography variant="body1" sx={{ color: 'warning.contrastText' }}>
            Você ainda não está conectado ao {activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1)}.
            <Button 
              variant="contained" 
              size="small" 
              sx={{ ml: 2 }}
              onClick={goToSetupWizard}
            >
              Conectar agora
            </Button>
          </Typography>
        </Paper>
      )}
      
      <Box sx={{ pt: 1 }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default SocialMediaHub;