import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import SocialMediaHub from '../components/SocialMediaHub';

/**
 * Página dedicada às integrações com redes sociais
 */
const SocialMedia = () => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Integrações com Redes Sociais
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body1">
          Gerencie as integrações com redes sociais para publicar e gerenciar conteúdo diretamente de dentro do sistema Lancei Essa.
          Conecte suas contas, faça upload de vídeos, agende publicações e acompanhe métricas.
        </Typography>
      </Paper>
      
      <Box sx={{ mt: 4 }}>
        <SocialMediaHub />
      </Box>
    </Container>
  );
};

export default SocialMedia;