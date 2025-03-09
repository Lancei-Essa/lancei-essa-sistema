import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, CircularProgress, Divider, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, Chip,
  Avatar, Link, Button
} from '@mui/material';
import {
  ExpandMore, YouTube, Visibility, ThumbUp, Comment, 
  CloudDownload, VideoLibrary, Person, Schedule, Refresh
} from '@mui/icons-material';
import { getYouTubeMetrics } from '../services/platforms/youtube';

const YouTubeDataTable = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchYouTubeData();
  }, []);
  
  const fetchYouTubeData = async () => {
    console.log("Chamou fetchYouTubeData");
    setLoading(true);
    try {
      const response = await getYouTubeMetrics();
      console.log('YouTube data:', response);
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Erro ao obter dados do YouTube');
      }
    } catch (err) {
      console.error('Erro ao buscar dados do YouTube:', err);
      setError('Erro ao se comunicar com o servidor');
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Carregando dados do YouTube...
        </Typography>
      </Paper>
    );
  }
  
  if (error) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" color="error">
          Erro ao carregar dados
        </Typography>
        <Typography variant="body1">
          {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchYouTubeData}
          sx={{ mt: 2 }}
        >
          Tentar novamente
        </Button>
      </Paper>
    );
  }
  
  if (!data) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6">
          Nenhum dado disponível
        </Typography>
        <Typography variant="body1">
          Não foi possível encontrar dados do YouTube para este canal.
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <YouTube color="error" sx={{ mr: 1 }} /> Dados do YouTube
      </Typography>
      
      {/* Informações gerais do canal */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Informações do Canal
        </Typography>
        
        <Box sx={{ display: 'flex', mb: 3 }}>
          <Avatar 
            src={data.channelInfo?.thumbnails?.medium?.url} 
            sx={{ width: 80, height: 80, mr: 3 }}
          />
          <Box>
            <Typography variant="h6">
              {data.channelInfo?.title || 'Canal sem título'}
            </Typography>
            {data.channelInfo?.customUrl && (
              <Typography variant="body2" color="textSecondary">
                {data.channelInfo.customUrl}
              </Typography>
            )}
            <Typography variant="body1" sx={{ mt: 1 }}>
              {data.channelInfo?.description || 'Sem descrição'}
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Chip 
            icon={<Person />} 
            label={`${formatNumber(data.totalStats?.subscribers || 0)} inscritos`}
            color="primary"
          />
          <Chip 
            icon={<Visibility />} 
            label={`${formatNumber(data.totalStats?.views || 0)} visualizações`} 
            color="primary"
          />
          <Chip 
            icon={<VideoLibrary />} 
            label={`${formatNumber(data.totalStats?.videos || 0)} vídeos`} 
            color="primary"
          />
          <Chip 
            icon={<ThumbUp />} 
            label={`${formatNumber(data.totalStats?.likes || 0)} likes`} 
            color="primary"
          />
          <Chip 
            icon={<Comment />} 
            label={`${formatNumber(data.totalStats?.comments || 0)} comentários`} 
            color="primary"
          />
        </Box>
      </Paper>
      
      {/* Tabela de vídeos */}
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h5">Vídeos do Canal</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Miniatura</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Data de Publicação</TableCell>
                  <TableCell>Visualizações</TableCell>
                  <TableCell>Likes</TableCell>
                  <TableCell>Comentários</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.videos && data.videos.length > 0 ? (
                  data.videos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          style={{ width: 120, height: 'auto', maxHeight: 80, objectFit: 'cover' }}
                        />
                      </TableCell>
                      <TableCell>{video.title}</TableCell>
                      <TableCell>{formatDate(video.publishedAt)}</TableCell>
                      <TableCell>{formatNumber(video.statistics?.viewCount || 0)}</TableCell>
                      <TableCell>{formatNumber(video.statistics?.likeCount || 0)}</TableCell>
                      <TableCell>{formatNumber(video.statistics?.commentCount || 0)}</TableCell>
                      <TableCell>
                        <Link 
                          href={`https://www.youtube.com/watch?v=${video.id}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="small" variant="outlined">
                            Ver no YouTube
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Nenhum vídeo encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
      
      {/* Comentários recentes */}
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h5">Comentários Recentes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Autor</TableCell>
                  <TableCell>Comentário</TableCell>
                  <TableCell>Vídeo</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Likes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recentComments && data.recentComments.length > 0 ? (
                  data.recentComments.map((comment) => (
                    <TableRow key={comment.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            src={comment.authorProfileImageUrl} 
                            sx={{ width: 40, height: 40, mr: 1 }}
                          />
                          <Typography variant="body2">
                            {comment.authorDisplayName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{comment.textDisplay}</TableCell>
                      <TableCell>
                        <Link 
                          href={`https://www.youtube.com/watch?v=${comment.videoId}`} 
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="small" variant="text">
                            Ver vídeo
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(comment.publishedAt)}</TableCell>
                      <TableCell>{formatNumber(comment.likeCount || 0)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhum comentário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
      
      {/* Dados brutos */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h5">Dados Brutos (JSON)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box 
            component="pre" 
            sx={{ 
              bgcolor: '#f5f5f5', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: '500px'
            }}
          >
            {JSON.stringify(data, null, 2)}
          </Box>
          <Button 
            variant="contained" 
            startIcon={<CloudDownload />}
            onClick={() => {
              const dataStr = JSON.stringify(data, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `youtube-data-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
            }}
            sx={{ mt: 2 }}
          >
            Baixar dados como JSON
          </Button>
        </AccordionDetails>
      </Accordion>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchYouTubeData}
          startIcon={<Refresh />}
        >
          Atualizar Dados
        </Button>
      </Box>
    </Box>
  );
};

export default YouTubeDataTable;