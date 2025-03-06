import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Divider,
  CircularProgress, Alert, Tabs, Tab, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  Refresh, YouTube, Visibility, ThumbUp, Comment, PeopleAlt
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Legend, Tooltip as RechartsTooltip
} from 'recharts';
import { getYouTubeMetrics } from '../services/platforms/youtube';

const YouTubeDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getYouTubeMetrics();
      
      if (response && response.success && response.data) {
        console.log('Métricas do YouTube:', response.data);
        setMetrics(response.data);
      } else {
        throw new Error('Falha ao carregar métricas');
      }
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      // Verificar se é um erro de conexão com o backend
      if (error.message && error.message.includes('Network Error')) {
        setError('Erro de conexão com o servidor. Verifique se o backend está rodando na porta 5002.');
      } else if (error.response && error.response.status === 401) {
        setError('Você precisa estar autenticado para acessar as métricas do YouTube.');
      } else if (error.response && error.response.status === 404) {
        setError('API de métricas não encontrada. Verifique se a rota /youtube/metrics existe no backend.');
      } else {
        setError('Erro ao carregar métricas do YouTube: ' + (error.message || 'Falha na requisição'));
      }
      console.log('Detalhes completos do erro:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formatar números grandes
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    
    const number = parseInt(num);
    if (isNaN(number)) return '0';
    
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toLocaleString();
  };

  const renderVisaoGeral = () => {
    if (!metrics) return null;
    
    const { totalStats, chartData, channelInfo } = metrics;
    
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Cards de estatísticas */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Visibility color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Visualizações</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatNumber(totalStats.views)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ThumbUp color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Curtidas</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatNumber(totalStats.likes)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Comment color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Comentários</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatNumber(totalStats.comments)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleAlt color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Inscritos</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatNumber(totalStats.subscribers)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Gráfico de tendências */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Desempenho ao Longo do Tempo
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData.labels.map((label, index) => ({
                      name: label,
                      visualizacoes: chartData.views[index],
                      curtidas: chartData.likes[index],
                      comentarios: chartData.comments[index]
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="visualizacoes"
                      name="Visualizações"
                      stroke="rgb(255, 0, 0)"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="curtidas"
                      name="Curtidas"
                      stroke="rgb(54, 162, 235)"
                    />
                    <Line
                      type="monotone"
                      dataKey="comentarios"
                      name="Comentários"
                      stroke="rgb(75, 192, 192)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Informações do canal */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações do Canal
              </Typography>
              
              <Box sx={{ display: 'flex', mb: 3 }}>
                {channelInfo?.thumbnails?.default?.url && (
                  <Box sx={{ mr: 2 }}>
                    <img 
                      src={channelInfo.thumbnails.default.url} 
                      alt={channelInfo.title}
                      style={{ width: 88, height: 88, borderRadius: '50%' }}
                    />
                  </Box>
                )}
                
                <Box>
                  <Typography variant="h6">{channelInfo?.title || 'Canal do YouTube'}</Typography>
                  {channelInfo?.customUrl && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {channelInfo.customUrl}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {channelInfo?.description?.substring(0, 100) || 'Sem descrição'}
                    {channelInfo?.description?.length > 100 ? '...' : ''}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Inscritos
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(channelInfo?.statistics?.subscriberCount)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Visualizações
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(channelInfo?.statistics?.viewCount)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Vídeos
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(channelInfo?.statistics?.videoCount)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Comentários recentes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Comentários Recentes
              </Typography>
              
              <Box sx={{ maxHeight: 235, overflow: 'auto' }}>
                {metrics.recentComments && metrics.recentComments.length > 0 ? (
                  metrics.recentComments.slice(0, 5).map((comment) => (
                    <Box key={comment.id} sx={{ mb: 2, display: 'flex' }}>
                      <Box sx={{ mr: 2 }}>
                        <img 
                          src={comment.authorProfileImageUrl || 'https://via.placeholder.com/40'} 
                          alt={comment.authorDisplayName}
                          style={{ width: 40, height: 40, borderRadius: '50%' }}
                        />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle2">
                            {comment.authorDisplayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            {new Date(comment.publishedAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {comment.textDisplay.length > 100 
                            ? comment.textDisplay.substring(0, 100) + '...' 
                            : comment.textDisplay}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <ThumbUp fontSize="small" color="action" sx={{ mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            {comment.likeCount || 0}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 3 }}>
                    Nenhum comentário recente
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderVideos = () => {
    if (!metrics || !metrics.videos) return null;
    
    // Ordenar vídeos por visualizações (decrescente)
    const sortedVideos = [...metrics.videos].sort((a, b) => {
      const viewsA = parseInt(a.statistics.viewCount || 0);
      const viewsB = parseInt(b.statistics.viewCount || 0);
      return viewsB - viewsA;
    });
    
    return (
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Gráfico de vídeos mais populares */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vídeos Mais Populares
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedVideos.slice(0, 5).map(v => ({
                      name: v.title.length > 25 ? v.title.substring(0, 22) + '...' : v.title,
                      visualizacoes: parseInt(v.statistics.viewCount || 0)
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar 
                      dataKey="visualizacoes" 
                      name="Visualizações"
                      fill="rgba(255, 0, 0, 0.7)" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Tabela de vídeos */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Todos os Vídeos
              </Typography>
              
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Vídeo</TableCell>
                      <TableCell align="right">Visualizações</TableCell>
                      <TableCell align="right">Curtidas</TableCell>
                      <TableCell align="right">Comentários</TableCell>
                      <TableCell align="right">Data de Publicação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedVideos.map((video) => (
                      <TableRow key={video.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: 80, minWidth: 80, mr: 2 }}>
                              <img 
                                src={video.thumbnail} 
                                alt={video.title}
                                style={{ width: '100%', borderRadius: 4 }}
                              />
                            </Box>
                            <Typography variant="body2" noWrap title={video.title} sx={{ maxWidth: 300 }}>
                              {video.title}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(video.statistics.viewCount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(video.statistics.likeCount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(video.statistics.commentCount)}
                        </TableCell>
                        <TableCell align="right">
                          {new Date(video.publishedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
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
          onClick={fetchMetrics}
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
      ) : !metrics ? (
        <Alert severity="info">
          Não foi possível carregar as métricas do YouTube. Verifique se você está conectado à sua conta do YouTube.
        </Alert>
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ mb: 3 }}
          >
            <Tab label="Visão Geral" />
            <Tab label="Vídeos" />
          </Tabs>
          
          {activeTab === 0 ? renderVisaoGeral() : renderVideos()}
        </>
      )}
    </Paper>
  );
};

export default YouTubeDashboard;