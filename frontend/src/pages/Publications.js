import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Paper, Grid, TextField, Chip,
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, OutlinedInput,
  Checkbox, ListItemText, Divider, Slider, Alert
} from '@mui/material';
import { Add, Edit, Delete, Event, Link as LinkIcon, ArrowBack, Send, Schedule } from '@mui/icons-material';
import * as publicationService from '../services/publications/publicationService';

const platformColors = {
  instagram: 'primary',
  youtube: 'error',
  linkedin: 'info',
  twitter: 'primary',
  facebook: 'info',
  tiktok: 'secondary',
  spotify: 'success'
};

// Informações sobre limitações das plataformas
const platformRestrictions = {
  spotify: {
    description: 'A API do Spotify não permite upload direto de episódios. Apenas criação de playlists e obtenção de dados.',
    allowed: ['playlist'],
    notAllowed: ['full_episode', 'clip', 'image', 'text', 'story']
  },
  tiktok: {
    description: 'TikTok só permite upload de vídeos curtos.',
    allowed: ['clip', 'video'],
    notAllowed: ['full_episode', 'text', 'story']
  },
  instagram: {
    description: 'Instagram permite imagens, vídeos curtos, stories e carrosséis de imagens.',
    allowed: ['image', 'clip', 'story'],
    notAllowed: ['full_episode']
  },
  youtube: {
    description: 'YouTube permite vídeos de todos os tamanhos.',
    allowed: ['full_episode', 'clip'],
    notAllowed: ['image', 'text']
  }
};

const statusColors = {
  draft: 'default',
  scheduled: 'warning',
  published: 'success',
  failed: 'error'
};

const initialPublicationState = {
  episode: '',
  platform: 'instagram',
  contentType: 'clip',
  content: {
    title: '',
    description: '',
    mediaUrl: '',
    thumbnailUrl: '',
    episodeId: '', // Para Spotify
    hashtags: '', // Para TikTok e outras plataformas
    privacyLevel: 'public'
  },
  scheduledFor: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T12:00',
  status: 'draft'
};

const Publications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [publications, setPublications] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Publication form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPublication, setCurrentPublication] = useState(initialPublicationState);
  
  // Bulk scheduling state
  const [massBulkDialogOpen, setMassBulkDialogOpen] = useState(false);
  const [bulkEpisode, setBulkEpisode] = useState('');
  const [bulkPlatforms, setBulkPlatforms] = useState([]);
  const [bulkScheduledDate, setBulkScheduledDate] = useState(
    new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [timeInterval, setTimeInterval] = useState(30); // minutos

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar episódios
        const episodesResponse = await publicationService.getPublications();
        if (episodesResponse.success) {
          setEpisodes(episodesResponse.data);
        }

        // Se o ID do episódio foi fornecido no state da localização, pré-seleciona
        if (location.state?.episodeId) {
          setCurrentPublication({
            ...currentPublication,
            episode: location.state.episodeId
          });
        }

        // Buscar publicações
        let filters = {};
        if (location.state?.episodeId) {
          filters.episodeId = location.state.episodeId;
        }
        
        const publicationsResponse = await publicationService.getPublications(filters);
        if (publicationsResponse.success) {
          setPublications(publicationsResponse.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.state]);

  const handleOpenDialog = (publication = null) => {
    if (publication) {
      setCurrentPublication({
        ...publication,
        scheduledFor: new Date(publication.scheduledFor).toISOString().slice(0, 16)
      });
      setEditMode(true);
    } else {
      setCurrentPublication({
        ...initialPublicationState,
        episode: location.state?.episodeId || ''
      });
      setEditMode(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentPublication(initialPublicationState);
  };
  
  const handleCloseBulkDialog = () => {
    setMassBulkDialogOpen(false);
    setBulkEpisode('');
    setBulkPlatforms([]);
  };
  
  const handleBulkPlatformChange = (event) => {
    const {
      target: { value },
    } = event;
    setBulkPlatforms(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Especial para mudança de plataforma - ajustar contentType se necessário
    if (name === 'platform') {
      const platform = value;
      const currentContentType = currentPublication.contentType;
      
      // Se a plataforma tiver restrições e o tipo de conteúdo atual não for permitido
      if (platformRestrictions[platform] && 
          platformRestrictions[platform].notAllowed.includes(currentContentType)) {
        
        // Definir um tipo de conteúdo permitido para esta plataforma
        const allowedType = platformRestrictions[platform].allowed[0] || 'text';
        
        setCurrentPublication({
          ...currentPublication,
          platform: value,
          contentType: allowedType
        });
        return;
      }
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setCurrentPublication({
        ...currentPublication,
        [parent]: {
          ...currentPublication[parent],
          [child]: value
        }
      });
    } else {
      setCurrentPublication({ ...currentPublication, [name]: value });
    }
  };

  const handleSavePublication = async () => {
    try {
      if (editMode) {
        // Atualizar publicação existente
        const response = await publicationService.updatePublication(
          currentPublication._id, 
          currentPublication
        );
        
        if (response.success) {
          // Atualizar a lista local
          const updatedPublications = publications.map(pub => 
            pub._id === currentPublication._id ? response.data : pub
          );
          setPublications(updatedPublications);
          handleCloseDialog();
        }
      } else {
        // Criar nova publicação
        const data = {
          ...currentPublication,
          status: 'draft'
        };
        
        const response = await publicationService.createPublication(data);
        
        if (response.success) {
          setPublications([...publications, response.data]);
          handleCloseDialog();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar publicação:', error);
      alert('Erro ao salvar publicação: ' + error.message);
    }
  };
  
  // Função para criar agendamentos em massa
  const handleCreateBulkSchedule = async () => {
    try {
      if (!bulkEpisode) {
        alert('Selecione um episódio para agendar publicações.');
        return;
      }
      
      if (bulkPlatforms.length === 0) {
        alert('Selecione pelo menos uma plataforma para agendar publicações.');
        return;
      }

      // Obter dados do episódio
      const episode = episodes.find(ep => ep._id === bulkEpisode);
      if (!episode) {
        throw new Error('Episódio não encontrado');
      }
      
      const baseDate = new Date(`${bulkScheduledDate}T12:00:00`);
      const newPublications = [];
      
      // Criar uma publicação por plataforma
      for (let i = 0; i < bulkPlatforms.length; i++) {
        const platform = bulkPlatforms[i];
        const scheduledTime = new Date(baseDate.getTime() + (i * timeInterval * 60000));
        
        // Determinar o tipo de conteúdo apropriado para cada plataforma
        let contentType = 'clip'; // Valor padrão
        
        if (platform === 'spotify') {
          contentType = 'playlist';
        } else if (platform === 'youtube') {
          contentType = 'full_episode';
        } else if (platform === 'instagram' || platform === 'facebook') {
          contentType = 'image';
        } else if (platform === 'linkedin' || platform === 'twitter') {
          contentType = 'text';
        }
        
        const newPublication = {
          episode: bulkEpisode,
          platform,
          contentType,
          content: {
            title: `${episode.title} - ${platform}`,
            description: episode.description,
            mediaUrl: '',
            thumbnailUrl: '',
            privacyLevel: 'public'
          },
          scheduledFor: scheduledTime.toISOString(),
          status: 'scheduled'
        };
        
        newPublications.push(newPublication);
      }
      
      // Salvar todas as publicações
      const savePromises = newPublications.map(pub => 
        publicationService.createPublication(pub)
      );
      
      const results = await Promise.all(savePromises);
      
      // Verificar resultados e atualizar a lista
      const successfulPublications = results
        .filter(res => res.success)
        .map(res => res.data);
      
      setPublications([...publications, ...successfulPublications]);
      handleCloseBulkDialog();
      
      alert(`${successfulPublications.length} publicações foram agendadas com sucesso.`);
    } catch (error) {
      console.error('Erro ao criar agendamentos em massa:', error);
      alert('Erro ao criar agendamentos em massa: ' + error.message);
    }
  };

  const handleDeletePublication = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta publicação?')) {
      try {
        const response = await publicationService.deletePublication(id);
        
        if (response.success) {
          const updatedPublications = publications.filter(pub => pub._id !== id);
          setPublications(updatedPublications);
        }
      } catch (error) {
        console.error('Erro ao excluir publicação:', error);
        alert('Erro ao excluir publicação: ' + error.message);
      }
    }
  };

  const handleChangeTab = (event, newValue) => {
    setSelectedFilter(newValue);
  };

  const getFilteredPublications = () => {
    if (selectedFilter === 'all') {
      return publications;
    }
    return publications.filter(pub => pub.status === selectedFilter);
  };

  const getEpisodeTitle = (episodeId) => {
    const episode = episodes.find(ep => ep._id === episodeId);
    return episode ? `#${episode.number} - ${episode.title}` : 'Episódio não encontrado';
  };
  
  const handlePublishNow = async (id) => {
    if (window.confirm('Tem certeza que deseja publicar este conteúdo agora?')) {
      try {
        const response = await publicationService.publishNow(id);
        
        if (response.success) {
          // Atualizar a lista local
          const updatedPublications = publications.map(pub => 
            pub._id === id ? response.data.publication : pub
          );
          setPublications(updatedPublications);
          
          alert(`Publicação realizada com sucesso na ${response.data.publication.platform}`);
        }
      } catch (error) {
        console.error('Erro ao publicar conteúdo:', error);
        alert('Erro ao publicar: ' + error.message);
      }
    }
  };

  if (loading) {
    return <Container><Typography>Carregando...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Publicações
        </Typography>
        <Box>
          {location.state?.episodeId && (
            <Button 
              variant="outlined" 
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/episodes/${location.state.episodeId}`)}
              sx={{ mr: 1 }}
            >
              Voltar ao Episódio
            </Button>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined"
              startIcon={<Event />}
              onClick={() => setMassBulkDialogOpen(true)}
            >
              Agendamento em Massa
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Nova Publicação
            </Button>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs
          value={selectedFilter}
          onChange={handleChangeTab}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="all" label="Todas" />
          <Tab value="draft" label="Rascunhos" />
          <Tab value="scheduled" label="Agendadas" />
          <Tab value="published" label="Publicadas" />
          <Tab value="failed" label="Falhas" />
        </Tabs>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Episódio</TableCell>
                <TableCell>Plataforma</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Conteúdo</TableCell>
                <TableCell>Agendamento</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredPublications().map((publication) => (
                <TableRow key={publication._id}>
                  <TableCell>
                    {getEpisodeTitle(publication.episode)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={publication.platform} 
                      color={platformColors[publication.platform] || 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {publication.contentType === 'full_episode' ? 'Episódio Completo' : 
                     publication.contentType === 'clip' ? 'Corte/Vídeo' : 
                     publication.contentType === 'image' ? 'Imagem' : 
                     publication.contentType === 'text' ? 'Texto' : 
                     publication.contentType === 'playlist' ? 'Playlist' :
                     publication.contentType === 'story' ? 'Story' :
                     publication.contentType}
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200, fontWeight: 'medium' }}>
                        {publication.content.title}
                      </Typography>
                      
                      {/* Exibir informações adicionais específicas da plataforma */}
                      {publication.platform === 'spotify' && publication.content.episodeId && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Spotify ID: {publication.content.episodeId.substring(0, 10)}...
                        </Typography>
                      )}
                      
                      {publication.content.hashtags && (
                        <Typography variant="caption" color="primary" display="block" noWrap sx={{ maxWidth: 200 }}>
                          #{publication.content.hashtags.split(',').join(' #')}
                        </Typography>
                      )}
                      
                      {publication.content.privacyLevel && publication.content.privacyLevel !== 'public' && (
                        <Chip 
                          size="small" 
                          label={publication.content.privacyLevel} 
                          sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
                          color={publication.content.privacyLevel === 'private' ? 'error' : 'default'}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(publication.scheduledFor).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={publication.status === 'draft' ? 'Rascunho' :
                             publication.status === 'scheduled' ? 'Agendada' :
                             publication.status === 'published' ? 'Publicada' :
                             publication.status === 'failed' ? 'Falha' : publication.status
                            } 
                      color={statusColors[publication.status] || 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenDialog(publication)} title="Editar">
                      <Edit fontSize="small" />
                    </IconButton>
                    
                    {/* Botão de publicar agora (apenas para publicações agendadas ou rascunhos) */}
                    {(publication.status === 'scheduled' || publication.status === 'draft') && (
                      <IconButton 
                        onClick={() => handlePublishNow(publication._id)}
                        color="primary" 
                        title="Publicar Agora"
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    )}
                    
                    {/* Botão de excluir (apenas para não publicadas) */}
                    {publication.status !== 'published' && (
                      <IconButton 
                        onClick={() => handleDeletePublication(publication._id)}
                        title="Excluir"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {getFilteredPublications().length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      Nenhuma publicação encontrada
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog for adding/editing publications */}
      {/* Diálogo de Agendamento em Massa */}
      <Dialog
        open={massBulkDialogOpen}
        onClose={handleCloseBulkDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Agendamento em Massa</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta função permite agendar publicações em várias plataformas de uma só vez,
            com intervalos de tempo personalizados entre cada publicação.
          </Alert>
          
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Episódio</InputLabel>
                <Select
                  value={bulkEpisode}
                  onChange={(e) => setBulkEpisode(e.target.value)}
                  label="Episódio"
                >
                  <MenuItem value="">Selecione um episódio</MenuItem>
                  {episodes.map(episode => (
                    <MenuItem key={episode._id} value={episode._id}>
                      #{episode.number} - {episode.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Plataformas</InputLabel>
                <Select
                  multiple
                  value={bulkPlatforms}
                  onChange={handleBulkPlatformChange}
                  input={<OutlinedInput label="Plataformas" />}
                  renderValue={(selected) => selected.join(', ')}
                >
                  <MenuItem value="instagram">
                    <Checkbox checked={bulkPlatforms.indexOf('instagram') > -1} />
                    <ListItemText primary="Instagram" />
                  </MenuItem>
                  <MenuItem value="youtube">
                    <Checkbox checked={bulkPlatforms.indexOf('youtube') > -1} />
                    <ListItemText primary="YouTube" />
                  </MenuItem>
                  <MenuItem value="linkedin">
                    <Checkbox checked={bulkPlatforms.indexOf('linkedin') > -1} />
                    <ListItemText primary="LinkedIn" />
                  </MenuItem>
                  <MenuItem value="twitter">
                    <Checkbox checked={bulkPlatforms.indexOf('twitter') > -1} />
                    <ListItemText primary="Twitter" />
                  </MenuItem>
                  <MenuItem value="facebook">
                    <Checkbox checked={bulkPlatforms.indexOf('facebook') > -1} />
                    <ListItemText primary="Facebook" />
                  </MenuItem>
                  <MenuItem value="tiktok">
                    <Checkbox checked={bulkPlatforms.indexOf('tiktok') > -1} />
                    <ListItemText primary="TikTok" />
                  </MenuItem>
                  <MenuItem value="spotify">
                    <Checkbox checked={bulkPlatforms.indexOf('spotify') > -1} />
                    <ListItemText primary="Spotify" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Data de Início"
                value={bulkScheduledDate}
                onChange={(e) => setBulkScheduledDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>
                Intervalo entre publicações (minutos)
              </Typography>
              <Slider
                value={timeInterval}
                onChange={(e, newValue) => setTimeInterval(newValue)}
                aria-labelledby="time-interval-slider"
                valueLabelDisplay="auto"
                step={15}
                marks={[
                  { value: 15, label: '15m' },
                  { value: 30, label: '30m' },
                  { value: 60, label: '1h' },
                  { value: 120, label: '2h' }
                ]}
                min={15}
                max={240}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resumo do Agendamento:
                </Typography>
                <Typography variant="body2">
                  {bulkPlatforms.length > 0 
                    ? `${bulkPlatforms.length} publicações serão agendadas com intervalo de ${timeInterval} minutos entre cada uma.`
                    : 'Selecione as plataformas para visualizar o resumo.'}
                </Typography>
                {bulkPlatforms.length > 0 && (
                  <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                    {bulkPlatforms.map((platform, index) => {
                      const scheduledTime = new Date(`${bulkScheduledDate}T12:00:00`);
                      scheduledTime.setMinutes(scheduledTime.getMinutes() + (index * timeInterval));
                      return (
                        <Typography component="li" key={platform} variant="body2">
                          {platform}: {scheduledTime.toLocaleTimeString()} {scheduledTime.toLocaleDateString()}
                        </Typography>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkDialog}>Cancelar</Button>
          <Button 
            onClick={handleCreateBulkSchedule} 
            variant="contained" 
            startIcon={<Schedule />}
            disabled={!bulkEpisode || bulkPlatforms.length === 0}
          >
            Agendar em Massa
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de Publicação */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? 'Editar Publicação' : 'Nova Publicação'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Episódio</InputLabel>
                <Select
                  name="episode"
                  value={currentPublication.episode}
                  onChange={handleChange}
                  label="Episódio"
                >
                  <MenuItem value="">Selecione um episódio</MenuItem>
                  {episodes.map(episode => (
                    <MenuItem key={episode._id} value={episode._id}>
                      #{episode.number} - {episode.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Plataforma</InputLabel>
                <Select
                  name="platform"
                  value={currentPublication.platform}
                  onChange={handleChange}
                  label="Plataforma"
                >
                  <MenuItem value="instagram">Instagram</MenuItem>
                  <MenuItem value="youtube">YouTube</MenuItem>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                  <MenuItem value="twitter">Twitter</MenuItem>
                  <MenuItem value="facebook">Facebook</MenuItem>
                  <MenuItem value="tiktok">TikTok</MenuItem>
                  <MenuItem value="spotify">Spotify</MenuItem>
                </Select>
              </FormControl>
              
              {/* Exibir alertas sobre limitações da plataforma */}
              {platformRestrictions[currentPublication.platform] && (
                <Typography 
                  variant="caption" 
                  color="warning.main" 
                  sx={{ display: 'block', mt: 1, fontWeight: 'medium' }}
                >
                  {platformRestrictions[currentPublication.platform].description}
                </Typography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Conteúdo</InputLabel>
                <Select
                  name="contentType"
                  value={currentPublication.contentType}
                  onChange={handleChange}
                  label="Tipo de Conteúdo"
                >
                  {/* Renderizar opções com base nas restrições da plataforma */}
                  {currentPublication.platform === 'spotify' ? (
                    <MenuItem value="playlist">Playlist</MenuItem>
                  ) : (
                    <>
                      {currentPublication.platform !== 'tiktok' && (
                        <MenuItem value="full_episode">Episódio Completo</MenuItem>
                      )}
                      <MenuItem value="clip">Corte/Vídeo</MenuItem>
                      {currentPublication.platform !== 'youtube' && currentPublication.platform !== 'tiktok' && (
                        <MenuItem value="image">Imagem</MenuItem>
                      )}
                      {currentPublication.platform !== 'youtube' && currentPublication.platform !== 'tiktok' && (
                        <MenuItem value="text">Texto</MenuItem>
                      )}
                      {(currentPublication.platform === 'instagram' || currentPublication.platform === 'facebook') && (
                        <MenuItem value="story">Story</MenuItem>
                      )}
                    </>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data e Hora de Publicação"
                name="scheduledFor"
                value={currentPublication.scheduledFor}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                name="content.title"
                value={currentPublication.content.title}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Descrição/Texto"
                name="content.description"
                value={currentPublication.content.description}
                onChange={handleChange}
              />
            </Grid>
            
            {/* Campo de URL da mídia (não exibido para playlist do Spotify) */}
            {!(currentPublication.platform === 'spotify' && currentPublication.contentType === 'playlist') && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="URL da Mídia"
                  name="content.mediaUrl"
                  value={currentPublication.content.mediaUrl}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <LinkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
            )}
            
            {/* Campo de thumbnail (não exibido para texto) */}
            {currentPublication.contentType !== 'text' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="URL da Thumbnail (opcional)"
                  name="content.thumbnailUrl"
                  value={currentPublication.content.thumbnailUrl || ''}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <LinkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
            )}
            
            {/* Campo específico para Spotify: ID do episódio */}
            {currentPublication.platform === 'spotify' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID do Episódio no Spotify (opcional)"
                  name="content.episodeId"
                  value={currentPublication.content.episodeId || ''}
                  onChange={handleChange}
                  helperText="Formato: 123456abcdef12345 (sem 'spotify:episode:')"
                />
              </Grid>
            )}
            
            {/* Campo de hashtags (para TikTok, Instagram e Twitter) */}
            {['tiktok', 'instagram', 'twitter'].includes(currentPublication.platform) && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hashtags (separados por vírgula)"
                  name="content.hashtags"
                  value={currentPublication.content.hashtags || ''}
                  onChange={handleChange}
                  helperText="Ex: lanceiessa, podcast, empreendedorismo"
                />
              </Grid>
            )}
            
            {/* Campo de privacidade */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Nível de Privacidade</InputLabel>
                <Select
                  name="content.privacyLevel"
                  value={currentPublication.content.privacyLevel || 'public'}
                  onChange={handleChange}
                  label="Nível de Privacidade"
                >
                  <MenuItem value="public">Público</MenuItem>
                  <MenuItem value="private">Privado</MenuItem>
                  {(['youtube', 'tiktok'].includes(currentPublication.platform)) && (
                    <MenuItem value="unlisted">Não listado</MenuItem>
                  )}
                  {currentPublication.platform === 'tiktok' && (
                    <MenuItem value="friends">Apenas amigos</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            {editMode && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={currentPublication.status}
                    onChange={handleChange}
                    label="Status"
                  >
                    <MenuItem value="draft">Rascunho</MenuItem>
                    <MenuItem value="scheduled">Agendada</MenuItem>
                    <MenuItem value="published">Publicada</MenuItem>
                    <MenuItem value="failed">Falha</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleSavePublication} 
            variant="contained" 
            startIcon={editMode ? <Edit /> : <Event />}
          >
            {editMode ? 'Atualizar' : 'Agendar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Publications;