import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, Card, CardContent, CardActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Mic, Schedule, Email, BarChart } from '@mui/icons-material';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    episodeCount: 0,
    publishedCount: 0,
    upcomingCount: 0,
    pendingPublications: 0
  });
  const [recentEpisodes, setRecentEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const quickLinks = [
    { title: 'Novo Episódio', icon: <Mic sx={{ fontSize: 40 }} />, path: '/episodes/new', color: '#3f51b5' },
    { title: 'Agendar Publicação', icon: <Schedule sx={{ fontSize: 40 }} />, path: '/publications', color: '#f44336' },
    { title: 'Gerar Newsletter', icon: <Email sx={{ fontSize: 40 }} />, path: '/newsletters/generator', color: '#4caf50' },
    { title: 'Ver Métricas', icon: <BarChart sx={{ fontSize: 40 }} />, path: '/metrics', color: '#ff9800' }
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Em um ambiente real, teríamos endpoints específicos para estas informações
        const episodesResponse = await api.get('/episodes');
        const episodes = episodesResponse.data.data;
        
        // Calculando estatísticas
        const publishedCount = episodes.filter(ep => ep.status === 'published').length;
        const upcomingCount = episodes.filter(ep => ep.status === 'planned').length;
        
        setStats({
          episodeCount: episodes.length,
          publishedCount,
          upcomingCount,
          pendingPublications: 5 // Valor fictício para simulação
        });
        
        // Pegando episódios recentes
        setRecentEpisodes(episodes.slice(0, 3));
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <Container><Typography>Carregando...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Seção de Boas-vindas */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4, 
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white'
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h4" gutterBottom>
              Bem-vindo ao Sistema da Lancei Essa!
            </Typography>
            <Typography variant="body1" paragraph>
              Gerencie seu podcast, publicações em redes sociais e newsletters em um só lugar.
              Acompanhe o desempenho do seu conteúdo e expanda seu alcance.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
              <img 
                src="/api/placeholder/200/120"
                alt="Lancei Essa Logo" 
                style={{ maxHeight: 120, borderRadius: 4 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Links Rápidos */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {quickLinks.map((link) => (
          <Grid item xs={6} sm={3} key={link.title}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                height: 120,
                borderTop: `4px solid ${link.color}`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate(link.path)}
            >
              <Box sx={{ color: link.color, mb: 1 }}>
                {link.icon}
              </Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {link.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/episodes/new')}
        >
          Novo Episódio
        </Button>
      </Box>
      
      {/* Cards de estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Total de Episódios
            </Typography>
            <Typography component="p" variant="h4">
              {stats.episodeCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Episódios Publicados
            </Typography>
            <Typography component="p" variant="h4">
              {stats.publishedCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Episódios Planejados
            </Typography>
            <Typography component="p" variant="h4">
              {stats.upcomingCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Publicações Pendentes
            </Typography>
            <Typography component="p" variant="h4">
              {stats.pendingPublications}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Episódios recentes */}
      <Typography variant="h5" gutterBottom>
        Episódios Recentes
      </Typography>
      <Grid container spacing={3}>
        {recentEpisodes.map((episode) => (
          <Grid item xs={12} md={4} key={episode._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  #{episode.number} - {episode.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {episode.status}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {episode.description.substring(0, 100)}...
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => navigate(`/episodes/${episode._id}`)}>
                  Ver Detalhes
                </Button>
                <Button size="small" onClick={() => navigate(`/episodes/${episode._id}/edit`)}>
                  Editar
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Calendário de Publicações (simplificado) */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Próximas Publicações
      </Typography>
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          • Instagram: Corte do Ep. #2 - Amanhã às 15:00
        </Typography>
        <Typography variant="body1">
          • YouTube: Episódio completo #2 - Quinta-feira às 19:00
        </Typography>
        <Typography variant="body1">
          • LinkedIn: Highlight do Ep. #2 - Sexta-feira às 10:00
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/publications')}>
            Ver Todas as Publicações
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;