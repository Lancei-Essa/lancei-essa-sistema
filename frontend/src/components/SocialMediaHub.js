import React, { useState } from 'react';
import { 
  Box, Tab, Tabs, Typography, Paper, Grid
} from '@mui/material';
import { 
  YouTube, Instagram, LinkedIn, Twitter, Facebook
} from '@mui/icons-material';
// TikTok não está disponível no pacote @mui/icons-material, usando alternativa
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import YouTubeConfig from './YouTubeConfig';
import YouTubeUpload from './YouTubeUpload';
import InstagramConfig from './InstagramConfig';

/**
 * Hub central de integração com redes sociais
 * Permite alternar entre diferentes plataformas e visualizar/configurar cada uma delas
 */
const SocialMediaHub = () => {
  const [activePlatform, setActivePlatform] = useState('youtube');
  const [activeSection, setActiveSection] = useState('config');
  
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
  
  return (
    <Box sx={{ width: '100%' }}>
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
      
      <Box sx={{ pt: 1 }}>
        {renderContent()}
      </Box>
    </Box>
  );
};

export default SocialMediaHub;