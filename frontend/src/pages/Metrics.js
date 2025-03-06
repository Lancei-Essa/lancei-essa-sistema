import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab
} from '@mui/material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import MetricsDashboard from '../components/MetricsDashboard';
import YouTubeDashboard from '../components/YouTubeDashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Metrics = () => {
  const [timeRange, setTimeRange] = useState('last30days');
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [metrics, setMetrics] = useState({
    viewsByPlatform: [],
    engagementOverTime: [],
    contentTypePerformance: [],
    audienceGrowth: [],
    topPerformingContent: [],
    platformComparison: [],
    conversionRates: []
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // In a real app, we would fetch from API with query params
        // const response = await api.get(`/metrics?timeRange=${timeRange}&platform=${platform}`);
        // setMetrics(response.data);

        // Mock data for demonstration
        const mockViewsByPlatform = [
          { name: 'YouTube', views: 4500 },
          { name: 'Instagram', views: 3200 },
          { name: 'LinkedIn', views: 1800 },
          { name: 'Twitter', views: 950 },
          { name: 'Facebook', views: 750 },
          { name: 'TikTok', views: 2100 },
          { name: 'Spotify', views: 3800 }
        ];

        const mockEngagementOverTime = [
          { date: '2025-02-01', likes: 65, comments: 12, shares: 4 },
          { date: '2025-02-08', likes: 72, comments: 18, shares: 6 },
          { date: '2025-02-15', likes: 88, comments: 24, shares: 8 },
          { date: '2025-02-22', likes: 95, comments: 28, shares: 12 },
          { date: '2025-03-01', likes: 130, comments: 35, shares: 15 }
        ];

        const mockContentTypePerformance = [
          { name: 'Episódio Completo', value: 35 },
          { name: 'Cortes', value: 45 },
          { name: 'Imagens', value: 15 },
          { name: 'Textos', value: 5 },
          { name: 'Playlists', value: 10 }
        ];
        
        const mockPlatformComparison = [
          { name: 'YouTube', engagement: 8.2, reach: 4500, conversion: 2.1 },
          { name: 'Instagram', engagement: 4.5, reach: 3200, conversion: 1.8 },
          { name: 'LinkedIn', engagement: 3.2, reach: 1800, conversion: 2.9 },
          { name: 'Twitter', engagement: 2.8, reach: 950, conversion: 1.2 },
          { name: 'Facebook', engagement: 2.1, reach: 750, conversion: 0.9 },
          { name: 'TikTok', engagement: 12.6, reach: 2100, conversion: 1.5 },
          { name: 'Spotify', engagement: 6.4, reach: 3800, conversion: 3.2 }
        ];
        
        const mockConversionRates = [
          { name: 'Site', value: 65 },
          { name: 'Newsletter', value: 25 },
          { name: 'App', value: 10 }
        ];

        const mockAudienceGrowth = [
          { month: 'Nov', followers: 450 },
          { month: 'Dez', followers: 580 },
          { month: 'Jan', followers: 680 },
          { month: 'Fev', followers: 820 },
          { month: 'Mar', followers: 1050 }
        ];

        const mockTopPerformingContent = [
          { id: 1, title: 'EP #2 - Financiamento para Startups', platform: 'YouTube', views: 1250, engagement: 87 },
          { id: 2, title: 'Como conseguir seu primeiro investidor', platform: 'Instagram', views: 980, engagement: 92 },
          { id: 3, title: 'Dicas de pitch para investidores', platform: 'LinkedIn', views: 645, engagement: 78 },
          { id: 4, title: 'EP #1 - Iniciando uma Startup em Brasília', platform: 'YouTube', views: 930, engagement: 65 },
          { id: 5, title: 'Erros comuns de empreendedores', platform: 'Instagram', views: 875, engagement: 81 }
        ];

        setMetrics({
          viewsByPlatform: mockViewsByPlatform,
          engagementOverTime: mockEngagementOverTime,
          contentTypePerformance: mockContentTypePerformance,
          audienceGrowth: mockAudienceGrowth,
          topPerformingContent: mockTopPerformingContent,
          platformComparison: mockPlatformComparison,
          conversionRates: mockConversionRates
        });
      } catch (error) {
        console.error('Erro ao carregar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange, platform]);

  if (loading) {
    return <Container><Typography>Carregando métricas...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Métricas e Analytics
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Período"
              size="small"
            >
              <MenuItem value="last7days">Últimos 7 dias</MenuItem>
              <MenuItem value="last30days">Últimos 30 dias</MenuItem>
              <MenuItem value="last90days">Últimos 90 dias</MenuItem>
              <MenuItem value="lastYear">Último ano</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Plataforma</InputLabel>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              label="Plataforma"
              size="small"
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="youtube">YouTube</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="twitter">Twitter</MenuItem>
              <MenuItem value="facebook">Facebook</MenuItem>
              <MenuItem value="tiktok">TikTok</MenuItem>
              <MenuItem value="spotify">Spotify</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Tabs 
        value={activeTab} 
        onChange={(e, newValue) => setActiveTab(newValue)} 
        sx={{ mb: 3 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="Dashboard Geral" />
        <Tab label="YouTube Analytics" />
      </Tabs>
      
      {activeTab === 1 ? (
        <YouTubeDashboard />
      ) : (

      <Grid container spacing={3}>
        {/* Resumo por plataforma */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comparativo de Plataformas
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={metrics.platformComparison}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="reach" name="Alcance" fill="#8884d8" />
                  <Bar yAxisId="left" dataKey="engagement" name="Taxa de Engajamento (%)" fill="#82ca9d" />
                  <Bar yAxisId="right" dataKey="conversion" name="Taxa de Conversão (%)" fill="#ff7300" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Visualizações por Plataforma */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Visualizações por Plataforma
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={metrics.viewsByPlatform}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Desempenho por Tipo de Conteúdo */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Desempenho por Tipo de Conteúdo
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.contentTypePerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.contentTypePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Engajamento ao Longo do Tempo */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Engajamento ao Longo do Tempo
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={metrics.engagementOverTime}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="comments" stroke="#82ca9d" />
                <Line type="monotone" dataKey="shares" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Crescimento de Audiência */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Crescimento de Audiência
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={metrics.audienceGrowth}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="followers" stroke="#82ca9d" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Conteúdo com Melhor Desempenho */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Conteúdo com Melhor Desempenho
            </Typography>
            <Box sx={{ overflowY: 'auto', maxHeight: 300 }}>
              {metrics.topPerformingContent.map((content) => (
                <Card key={content.id} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Grid container alignItems="center">
                      <Grid item xs={9}>
                        <Typography variant="subtitle2" noWrap>
                          {content.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {content.platform} • {content.views} visualizações
                        </Typography>
                      </Grid>
                      <Grid item xs={3} textAlign="right">
                        <Typography 
                          variant="h6" 
                          color="primary" 
                          sx={{ 
                            bgcolor: '#e3f2fd', 
                            borderRadius: 1, 
                            px: 1,
                            display: 'inline-block',
                            fontWeight: 'bold'
                          }}
                        >
                          {content.engagement}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* Taxas de Conversão */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Taxas de Conversão
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.conversionRates}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.conversionRates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Distribuição de conversões por destino
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      )}
    </Container>
  );
};

export default Metrics;