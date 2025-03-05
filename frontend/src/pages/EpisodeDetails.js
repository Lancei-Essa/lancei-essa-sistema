import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Paper, Grid, Chip, Divider,
  List, ListItem, ListItemText, Card, CardContent, Accordion, AccordionSummary, AccordionDetails,
  FormControl, InputLabel, Select, MenuItem, TextField
} from '@mui/material';
import { Edit, ArrowBack, YouTube, FolderOpen, ExpandMore } from '@mui/icons-material';
import api from '../services/api';
import YouTubeUpload from '../components/YouTubeUpload';

const statusColors = {
  planned: 'default',
  recorded: 'primary',
  editing: 'warning',
  published: 'success'
};

const statusLabels = {
  planned: 'Planejado',
  recorded: 'Gravado',
  editing: 'Em Edição',
  published: 'Publicado'
};

const EpisodeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para o formulário de agendamento de publicação
  const [newPublication, setNewPublication] = useState({
    platform: 'instagram',
    contentType: 'clip',
    title: '',
    description: '',
    scheduledFor: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  });
  const [publishingLoading, setPublishingLoading] = useState(false);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const response = await api.get(`/episodes/${id}`);
        if (response.data.success) {
          setEpisode(response.data.data);
          
          // Pré-preencher o formulário de publicação com dados do episódio
          setNewPublication(prev => ({
            ...prev,
            title: `Trecho de ${response.data.data.title}`,
            description: response.data.data.description.substring(0, 100) + "..."
          }));
        } else {
          setError('Erro ao carregar detalhes do episódio');
        }
      } catch (err) {
        console.error('Erro ao carregar episódio:', err);
        setError('Erro ao carregar detalhes do episódio');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisode();
  }, [id]);
  
  const handlePublicationChange = (e) => {
    const { name, value } = e.target;
    setNewPublication({
      ...newPublication,
      [name]: value
    });
  };
  
  const handleSchedulePublication = async () => {
    setPublishingLoading(true);
    try {
      // Aqui seria uma chamada à API para agendar a publicação
      // await api.post('/publications', { ...newPublication, episode: id });
      
      // Simulando o agendamento
      setTimeout(() => {
        alert('Publicação agendada com sucesso!');
        
        // Redirecionar para a página de publicações
        navigate('/publications', { state: { episodeId: id } });
        
        setPublishingLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao agendar publicação:', error);
      alert('Erro ao agendar publicação');
      setPublishingLoading(false);
    }
  };

  if (loading) {
    return <Container><Typography>Carregando...</Typography></Container>;
  }

  if (error || !episode) {
    return (
      <Container>
        <Typography color="error">{error || 'Episódio não encontrado'}</Typography>
        <Button variant="outlined" onClick={() => navigate('/episodes')}>
          Voltar para a lista
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Episódio #{episode.number}: {episode.title}
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBack />}
            onClick={() => navigate('/episodes')}
            sx={{ mr: 1 }}
          >
            Voltar
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Edit />}
            onClick={() => navigate(`/episodes/${id}/edit`)}
          >
            Editar
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Informações Gerais</Typography>
              <Chip 
                label={statusLabels[episode.status] || episode.status} 
                color={statusColors[episode.status] || 'default'} 
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body1" paragraph>
              {episode.description}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Data de Gravação
                </Typography>
                <Typography variant="body1">
                  {new Date(episode.recordingDate).toLocaleDateString()}
                </Typography>
              </Grid>
              
              {episode.publishDate && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Data de Publicação
                  </Typography>
                  <Typography variant="body1">
                    {new Date(episode.publishDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tópicos
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {episode.topics && episode.topics.length > 0 ? (
                  episode.topics.map((topic, index) => (
                    <Chip key={index} label={topic} size="small" />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum tópico adicionado
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
          
          {episode.timestamps && episode.timestamps.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Timestamps
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                {episode.timestamps.map((timestamp, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText 
                        primary={timestamp.time} 
                        secondary={timestamp.description}
                        primaryTypographyProps={{ fontWeight: 'bold' }}
                      />
                    </ListItem>
                    {index < episode.timestamps.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mídia e Distribuição
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              {episode.mediaLinks && episode.mediaLinks.youtube && (
                <Grid item xs={12} sm={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<YouTube />}
                    href={episode.mediaLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    fullWidth
                  >
                    Ver no YouTube
                  </Button>
                </Grid>
              )}
              
              {episode.mediaLinks && episode.mediaLinks.driveFolder && (
                <Grid item xs={12} sm={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FolderOpen />}
                    href={episode.mediaLinks.driveFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    fullWidth
                  >
                    Abrir pasta no Drive
                  </Button>
                </Grid>
              )}

              {episode.status === 'editing' || episode.status === 'recorded' ? (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2 }}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                          <YouTube color="error" sx={{ mr: 1 }} /> Fazer upload para YouTube
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <YouTubeUpload 
                          episodeId={episode._id}
                          onVideoUploaded={(videoInfo) => {
                            // Em uma aplicação real, atualizaríamos o episódio com o link do vídeo
                            console.log("Vídeo enviado:", videoInfo);
                          }}
                        />
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                </Grid>
              ) : null}
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          {episode.guests && episode.guests.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Convidados
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {episode.guests.map((guest, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {guest.name}
                        </Typography>
                        
                        {Object.entries(guest.socialMedia).map(([platform, username]) => 
                          username && (
                            <Typography key={platform} variant="body2" color="text.secondary">
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}: {username}
                            </Typography>
                          )
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Publicações nas Redes Sociais
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gerencie as publicações relacionadas a este episódio nas redes sociais.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  fullWidth
                  onClick={() => navigate('/publications', { state: { episodeId: id } })}
                  sx={{ mb: 2 }}
                >
                  Ver Todas as Publicações
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Agendar Nova Publicação</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box component="form">
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Plataforma</InputLabel>
                            <Select
                              name="platform"
                              label="Plataforma"
                              value={newPublication.platform}
                              onChange={handlePublicationChange}
                            >
                              <MenuItem value="instagram">Instagram</MenuItem>
                              <MenuItem value="youtube">YouTube</MenuItem>
                              <MenuItem value="linkedin">LinkedIn</MenuItem>
                              <MenuItem value="twitter">Twitter</MenuItem>
                              <MenuItem value="facebook">Facebook</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Tipo de Conteúdo</InputLabel>
                            <Select
                              name="contentType"
                              label="Tipo de Conteúdo"
                              value={newPublication.contentType}
                              onChange={handlePublicationChange}
                            >
                              <MenuItem value="full_episode">Episódio Completo</MenuItem>
                              <MenuItem value="clip">Corte</MenuItem>
                              <MenuItem value="image">Imagem</MenuItem>
                              <MenuItem value="text">Texto</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            name="title"
                            fullWidth
                            label="Título"
                            value={newPublication.title}
                            onChange={handlePublicationChange}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            name="description"
                            fullWidth
                            multiline
                            rows={3}
                            label="Descrição"
                            value={newPublication.description}
                            onChange={handlePublicationChange}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            name="scheduledFor"
                            fullWidth
                            type="datetime-local"
                            label="Data e Hora de Publicação"
                            value={newPublication.scheduledFor}
                            onChange={handlePublicationChange}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={handleSchedulePublication}
                            disabled={publishingLoading}
                          >
                            {publishingLoading ? 'Agendando...' : 'Agendar Publicação'}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EpisodeDetails;