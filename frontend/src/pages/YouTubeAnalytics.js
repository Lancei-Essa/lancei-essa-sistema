import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import YouTubeDataTable from '../components/YouTubeDataTable';

function YouTubeAnalytics() {
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 3, my: 3 }}>
        <Typography variant="h4" gutterBottom>
          Análise de Dados do YouTube
        </Typography>
        <YouTubeDataTable />
      </Paper>
    </Container>
  );
}

export default YouTubeAnalytics;