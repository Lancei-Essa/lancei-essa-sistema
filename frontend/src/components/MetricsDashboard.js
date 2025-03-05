import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Divider,
  CircularProgress, Alert, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Tooltip, Select, MenuItem, FormControl, InputLabel, TextField,
  Button
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
  Refresh, Instagram, YouTube, LinkedIn, Twitter, Facebook,
  TikTok, Timeline, BarChart, Share, Visibility, ThumbUp, Message,
  CalendarToday, InsertChart, ArrowUpward, ArrowDownward, PeopleAlt
} from '@mui/icons-material';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import api from '../services/api';
import { format } from 'date-fns';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const MetricsDashboard = () => {
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    summary: {},
    platforms: {},
    episodes: [],
    trends: {}
  });
  const [activePlatform, setActivePlatform] = useState('all');
  const [timeRange, setTimeRange] = useState('last30days');
  const [activeTab, setActiveTab] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  
  // Carregar métricas ao montar o componente
  useEffect(() => {
    fetchMetrics();
  }, []);
  
  // Buscar métricas quando mudar a plataforma ou intervalo de tempo
  useEffect(() => {
    fetchMetrics();
  }, [activePlatform, timeRange]);
  
  // Buscar métricas da API
  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Construir URL da API com base nos parâmetros
      let url = `/metrics?platform=${activePlatform}`;
      
      if (timeRange === 'custom') {
        // Adicionar datas personalizadas se for o intervalo personalizado
        url += `&timeRange=custom&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      } else {
        url += `&timeRange=${timeRange}`;
      }
      
      // Fazer chamada à API real
      const response = await api.get(url);
      
      if (response.data.success) {
        setMetrics(response.data.metrics);
      } else {
        // Se a API ainda não estiver pronta, usar dados simulados
        console.warn('API não retornou dados. Usando dados simulados.');
        const data = generateMockMetrics(activePlatform, timeRange);
        setMetrics(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      
      // Se a API não estiver disponível, usar dados simulados
      const data = generateMockMetrics(activePlatform, timeRange);
      setMetrics(data);
      
      // Se for erro de conexão, não mostrar erro ao usuário, apenas usar dados simulados
      if (error.message === 'Network Error') {
        console.log('Usando dados simulados devido a erro de rede');
      } else {
        setError('Erro ao buscar métricas: ' + (error.response?.data?.message || error.message));
      }
      
      setLoading(false);
    }
  };
  
  // Gerar dados de métricas simulados
  const generateMockMetrics = (platform, timeRange) => {
    // Métricas resumidas
    const summary = {
      totalViews: 45780,
      totalLikes: 3245,
      totalComments: 920,
      totalShares: 542,
      totalFollowers: 5280,
      growthRate: 8.5
    };
    
    // Métricas por plataforma
    const platforms = {
      youtube: {
        views: 28450,
        likes: 1825,
        comments: 430,
        shares: 215,
        subscribers: 1250,
        growth: 12.3,
        topContent: [
          { title: 'Ep #1 - Iniciando uma Startup em Brasília', views: 8750, likes: 620, comments: 124 },
          { title: 'Ep #2 - Financiamento para Startups', views: 5430, likes: 412, comments: 87 }
        ]
      },
      instagram: {
        views: 12340,
        likes: 982,
        comments: 340,
        shares: 205,
        followers: 3245,
        growth: 7.8,
        topContent: [
          { title: 'Clip: Como conseguir investimento', views: 3450, likes: 312, comments: 84 },
          { title: 'Teaser do Ep #2', views: 2830, likes: 245, comments: 42 }
        ]
      },
      linkedin: {
        views: 3620,
        likes: 325,
        comments: 128,
        shares: 98,
        followers: 580,
        growth: 5.2,
        topContent: [
          { title: 'Artigo: Dicas de Financiamento', views: 1245, likes: 112, comments: 35 },
          { title: 'Resumo do Ep #1', views: 980, likes: 87, comments: 24 }
        ]
      },
      twitter: {
        views: 1370,
        likes: 113,
        comments: 22,
        shares: 24,
        followers: 205,
        growth: 3.7,
        topContent: [
          { title: 'Thread: 10 dicas para empreendedores', views: 520, likes: 45, comments: 12 },
          { title: 'Anúncio do Ep #2', views: 320, likes: 28, comments: 5 }
        ]
      }
    };
    
    // Episódios
    const episodes = [
      {
        id: 'ep001',
        number: 1,
        title: 'Iniciando uma Startup em Brasília',
        publishDate: '2025-02-15',
        metrics: {
          views: 12580,
          likes: 982,
          comments: 245,
          shares: 178,
          engagement: 11.2,
          platforms: {
            youtube: { views: 8750, likes: 620, comments: 124 },
            instagram: { views: 2830, likes: 245, comments: 84 },
            linkedin: { views: 780, likes: 87, comments: 29 },
            twitter: { views: 220, likes: 30, comments: 8 }
          }
        }
      },
      {
        id: 'ep002',
        number: 2,
        title: 'Financiamento para Startups',
        publishDate: '2025-02-22',
        metrics: {
          views: 9840,
          likes: 745,
          comments: 182,
          shares: 124,
          engagement: 10.7,
          platforms: {
            youtube: { views: 5430, likes: 412, comments: 87 },
            instagram: { views: 3450, likes: 312, comments: 67 },
            linkedin: { views: 740, likes: 65, comments: 22 },
            twitter: { views: 220, likes: 28, comments: 6 }
          }
        }
      }
    ];
    
    // Tendências (dados para gráficos)
    const trends = {
      views: {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [
          {
            label: 'Visualizações',
            data: [8250, 11580, 13420, 12530],
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderColor: 'rgb(53, 162, 235)',
            borderWidth: 1
          }
        ]
      },
      engagement: {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [
          {
            label: 'Curtidas',
            data: [520, 780, 945, 1000],
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1
          },
          {
            label: 'Comentários',
            data: [120, 245, 275, 280],
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
          },
          {
            label: 'Compartilhamentos',
            data: [85, 152, 168, 137],
            backgroundColor: 'rgba(255, 159, 64, 0.5)',
            borderColor: 'rgb(255, 159, 64)',
            borderWidth: 1
          }
        ]
      },
      platforms: {
        labels: ['YouTube', 'Instagram', 'LinkedIn', 'Twitter'],
        datasets: [
          {
            label: 'Visualizações por Plataforma',
            data: [28450, 12340, 3620, 1370],
            backgroundColor: [
              'rgba(255, 0, 0, 0.7)',
              'rgba(138, 58, 185, 0.7)',
              'rgba(0, 119, 181, 0.7)',
              'rgba(29, 161, 242, 0.7)'
            ],
            borderWidth: 1
          }
        ]
      },
      growth: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr'],
        datasets: [
          {
            label: 'Seguidores',
            data: [3850, 4320, 4820, 5280],
            fill: false,
            backgroundColor: 'rgb(75, 192, 192)',
            borderColor: 'rgba(75, 192, 192, 0.8)',
            tension: 0.1
          }
        ]
      }
    };
    
    // Filtrar dados com base na plataforma e no período, se necessário
    if (platform !== 'all') {
      // Aqui, filtramos os dados para mostrar apenas a plataforma selecionada
      // Em uma implementação real, isso viria da API
    }
    
    return { summary, platforms, episodes, trends };
  };
  
  // Obter ícone para cada plataforma
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube':
        return <YouTube color="error" />;
      case 'instagram':
        return <Instagram color="primary" />;
      case 'linkedin':
        return <LinkedIn color="primary" />;
      case 'twitter':
        return <Twitter color="info" />;
      case 'facebook':
        return <Facebook color="primary" />;
      case 'tiktok':
        return <TikTok color="secondary" />;
      default:
        return <InsertChart />;
    }
  };
  
  // Formatar números grandes
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  // Renderizar conteúdo das abas
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Visão Geral
        return (
          <Grid container spacing={3}>
            {/* Cards de métricas */}
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Visualizações Totais
                    </Typography>
                    <Visibility color="primary" />
                  </Box>
                  <Typography variant="h4" component="div">
                    {formatNumber(metrics.summary.totalViews)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <ArrowUpward color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +8.2%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      vs. mês anterior
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Curtidas
                    </Typography>
                    <ThumbUp color="primary" />
                  </Box>
                  <Typography variant="h4" component="div">
                    {formatNumber(metrics.summary.totalLikes)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <ArrowUpward color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +12.5%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      vs. mês anterior
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Comentários
                    </Typography>
                    <Message color="primary" />
                  </Box>
                  <Typography variant="h4" component="div">
                    {formatNumber(metrics.summary.totalComments)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <ArrowUpward color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +9.8%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      vs. mês anterior
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                      Seguidores
                    </Typography>
                    <PeopleAlt color="primary" />
                  </Box>
                  <Typography variant="h4" component="div">
                    {formatNumber(metrics.summary.totalFollowers)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <ArrowUpward color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                      +{metrics.summary.growthRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      vs. mês anterior
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Gráficos */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Crescimento de Visualizações
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={metrics.trends.views} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Distribuição por Plataforma
                </Typography>
                <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                  <Pie 
                    data={metrics.trends.platforms} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Engajamento ao Longo do Tempo
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={metrics.trends.engagement} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            {/* Tabela de Episódios */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Desempenho de Episódios
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Episódio</TableCell>
                        <TableCell align="right">Visualizações</TableCell>
                        <TableCell align="right">Curtidas</TableCell>
                        <TableCell align="right">Comentários</TableCell>
                        <TableCell align="right">Compartilhamentos</TableCell>
                        <TableCell align="right">Engajamento</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {metrics.episodes.map((episode) => (
                        <TableRow key={episode.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">
                                #{episode.number} - {episode.title}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{formatNumber(episode.metrics.views)}</TableCell>
                          <TableCell align="right">{formatNumber(episode.metrics.likes)}</TableCell>
                          <TableCell align="right">{formatNumber(episode.metrics.comments)}</TableCell>
                          <TableCell align="right">{formatNumber(episode.metrics.shares)}</TableCell>
                          <TableCell align="right">{episode.metrics.engagement}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        );
        
      case 1: // Plataformas
        return (
          <Grid container spacing={3}>
            {/* Cartões de plataformas */}
            {Object.entries(metrics.platforms).map(([platform, data]) => (
              <Grid item xs={12} md={6} lg={3} key={platform}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getPlatformIcon(platform)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Visualizações
                        </Typography>
                        <Typography variant="body1">
                          {formatNumber(data.views)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Curtidas
                        </Typography>
                        <Typography variant="body1">
                          {formatNumber(data.likes)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Comentários
                        </Typography>
                        <Typography variant="body1">
                          {formatNumber(data.comments)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Seguidores
                        </Typography>
                        <Typography variant="body1">
                          {formatNumber(data.followers || data.subscribers)}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      <ArrowUpward color="success" fontSize="small" />
                      <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                        +{data.growth}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        crescimento mensal
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            
            {/* Gráfico de comparação */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Comparação de Desempenho por Plataforma
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={{
                      labels: ['Visualizações', 'Curtidas', 'Comentários', 'Compartilhamentos'],
                      datasets: [
                        {
                          label: 'YouTube',
                          data: [
                            metrics.platforms.youtube.views,
                            metrics.platforms.youtube.likes,
                            metrics.platforms.youtube.comments,
                            metrics.platforms.youtube.shares
                          ],
                          backgroundColor: 'rgba(255, 0, 0, 0.7)'
                        },
                        {
                          label: 'Instagram',
                          data: [
                            metrics.platforms.instagram.views,
                            metrics.platforms.instagram.likes,
                            metrics.platforms.instagram.comments,
                            metrics.platforms.instagram.shares
                          ],
                          backgroundColor: 'rgba(138, 58, 185, 0.7)'
                        },
                        {
                          label: 'LinkedIn',
                          data: [
                            metrics.platforms.linkedin.views,
                            metrics.platforms.linkedin.likes,
                            metrics.platforms.linkedin.comments,
                            metrics.platforms.linkedin.shares
                          ],
                          backgroundColor: 'rgba(0, 119, 181, 0.7)'
                        },
                        {
                          label: 'Twitter',
                          data: [
                            metrics.platforms.twitter.views,
                            metrics.platforms.twitter.likes,
                            metrics.platforms.twitter.comments,
                            metrics.platforms.twitter.shares
                          ],
                          backgroundColor: 'rgba(29, 161, 242, 0.7)'
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            {/* Conteúdo de melhor desempenho */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Conteúdo de Melhor Desempenho
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Plataforma</TableCell>
                        <TableCell>Título</TableCell>
                        <TableCell align="right">Visualizações</TableCell>
                        <TableCell align="right">Curtidas</TableCell>
                        <TableCell align="right">Comentários</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(metrics.platforms).flatMap(([platform, data]) => 
                        data.topContent ? data.topContent.map((content, index) => (
                          <TableRow key={`${platform}-${index}`}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {getPlatformIcon(platform)}
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{content.title}</TableCell>
                            <TableCell align="right">{formatNumber(content.views)}</TableCell>
                            <TableCell align="right">{formatNumber(content.likes)}</TableCell>
                            <TableCell align="right">{formatNumber(content.comments)}</TableCell>
                          </TableRow>
                        )) : []
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        );
        
      case 2: // Tendências
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Crescimento de Seguidores
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={metrics.trends.growth} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tendência de Visualizações
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={{
                      ...metrics.trends.views,
                      datasets: [{
                        ...metrics.trends.views.datasets[0],
                        borderColor: 'rgb(53, 162, 235)',
                        backgroundColor: 'rgba(53, 162, 235, 0.5)',
                        fill: true
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tendência de Engajamento (Curtidas/Visualizações)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={{
                      labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
                      datasets: [
                        {
                          label: 'Taxa de Engajamento (%)',
                          data: [6.2, 6.7, 7.1, 8.0],
                          borderColor: 'rgb(255, 99, 132)',
                          backgroundColor: 'rgba(255, 99, 132, 0.5)',
                          fill: true
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Melhores Horários para Publicação
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={{
                      labels: ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
                      datasets: [
                        {
                          label: 'Engajamento por Horário',
                          data: [4.2, 6.8, 8.1, 5.6, 7.2, 9.5, 8.8, 5.3],
                          backgroundColor: 'rgba(75, 192, 192, 0.7)'
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Dashboard de Métricas
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Intervalo</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value);
                  if (e.target.value === 'custom') {
                    setShowDatePicker(true);
                  }
                }}
                label="Intervalo"
              >
                <MenuItem value="last7days">Últimos 7 dias</MenuItem>
                <MenuItem value="last30days">Últimos 30 dias</MenuItem>
                <MenuItem value="last90days">Últimos 90 dias</MenuItem>
                <MenuItem value="custom">Personalizado</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Plataforma</InputLabel>
              <Select
                value={activePlatform}
                onChange={(e) => setActivePlatform(e.target.value)}
                label="Plataforma"
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="youtube">YouTube</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="linkedin">LinkedIn</MenuItem>
                <MenuItem value="twitter">Twitter</MenuItem>
              </Select>
            </FormControl>
            
            {/* Seletor de datas personalizado */}
            {timeRange === 'custom' && showDatePicker && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, gap: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Data inicial"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    renderInput={(params) => <TextField size="small" {...params} />}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <DatePicker
                    label="Data final"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    renderInput={(params) => <TextField size="small" {...params} />}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                </LocalizationProvider>
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => {
                    fetchMetrics();
                  }}
                >
                  Aplicar
                </Button>
              </Box>
            )}
            
            <Tooltip title="Atualizar">
              <IconButton onClick={fetchMetrics} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ mb: 3 }}
            >
              <Tab label="Visão Geral" icon={<InsertChart />} iconPosition="start" />
              <Tab label="Plataformas" icon={<Share />} iconPosition="start" />
              <Tab label="Tendências" icon={<Timeline />} iconPosition="start" />
            </Tabs>
            
            {renderTabContent()}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default MetricsDashboard;