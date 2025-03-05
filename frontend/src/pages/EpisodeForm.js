import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Paper, TextField, Grid,
  FormControl, InputLabel, Select, MenuItem, Chip, IconButton,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Add, Delete, Save, ArrowBack } from '@mui/icons-material';
import api from '../services/api';

const initialEpisodeState = {
  number: '',
  title: '',
  description: '',
  guests: [],
  recordingDate: new Date(),
  publishDate: null,
  status: 'planned',
  mediaLinks: {
    raw: '',
    edited: '',
    youtube: '',
    driveFolder: ''
  },
  topics: [],
  timestamps: []
};

const EpisodeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [episode, setEpisode] = useState(initialEpisodeState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Dialog states
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: '', socialMedia: { instagram: '', linkedin: '', twitter: '' } });
  
  const [timestampDialogOpen, setTimestampDialogOpen] = useState(false);
  const [newTimestamp, setNewTimestamp] = useState({ time: '', description: '' });
  
  const [newTopic, setNewTopic] = useState('');

  // Load episode data if editing
  useEffect(() => {
    if (id && id !== 'new') {
      setLoading(true);
      api.get(`/episodes/${id}`)
        .then(response => {
          if (response.data.success) {
            // Convert string dates to Date objects
            const episodeData = response.data.data;
            if (episodeData.recordingDate) {
              episodeData.recordingDate = new Date(episodeData.recordingDate);
            }
            if (episodeData.publishDate) {
              episodeData.publishDate = new Date(episodeData.publishDate);
            }
            setEpisode(episodeData);
          }
        })
        .catch(err => {
          console.error('Erro ao carregar episódio:', err);
          setError('Não foi possível carregar os dados do episódio.');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEpisode({
        ...episode,
        [parent]: {
          ...episode[parent],
          [child]: value
        }
      });
    } else {
      setEpisode({ ...episode, [name]: value });
    }
  };

  const handleDateChange = (name, date) => {
    setEpisode({ ...episode, [name]: date });
  };

  // Guest handlers
  const handleAddGuest = () => {
    if (newGuest.name.trim()) {
      setEpisode({
        ...episode,
        guests: [...episode.guests, { ...newGuest }]
      });
      setNewGuest({ name: '', socialMedia: { instagram: '', linkedin: '', twitter: '' } });
      setGuestDialogOpen(false);
    }
  };

  const handleRemoveGuest = (index) => {
    const updatedGuests = [...episode.guests];
    updatedGuests.splice(index, 1);
    setEpisode({ ...episode, guests: updatedGuests });
  };

  const handleGuestChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setNewGuest({
        ...newGuest,
        [parent]: {
          ...newGuest[parent],
          [child]: value
        }
      });
    } else {
      setNewGuest({ ...newGuest, [name]: value });
    }
  };

  // Topic handlers
  const handleAddTopic = () => {
    if (newTopic.trim() && !episode.topics.includes(newTopic.trim())) {
      setEpisode({
        ...episode,
        topics: [...episode.topics, newTopic.trim()]
      });
      setNewTopic('');
    }
  };

  const handleRemoveTopic = (index) => {
    const updatedTopics = [...episode.topics];
    updatedTopics.splice(index, 1);
    setEpisode({ ...episode, topics: updatedTopics });
  };

  // Timestamp handlers
  const handleAddTimestamp = () => {
    if (newTimestamp.time && newTimestamp.description) {
      setEpisode({
        ...episode,
        timestamps: [...episode.timestamps, { ...newTimestamp }]
      });
      setNewTimestamp({ time: '', description: '' });
      setTimestampDialogOpen(false);
    }
  };

  const handleRemoveTimestamp = (index) => {
    const updatedTimestamps = [...episode.timestamps];
    updatedTimestamps.splice(index, 1);
    setEpisode({ ...episode, timestamps: updatedTimestamps });
  };

  const handleTimestampChange = (e) => {
    const { name, value } = e.target;
    setNewTimestamp({ ...newTimestamp, [name]: value });
  };

  // Formatar data para o campo de input
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Save episode
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let response;
      if (id && id !== 'new') {
        // Update existing episode
        response = await api.put(`/episodes/${id}`, episode);
      } else {
        // Create new episode
        response = await api.post('/episodes', episode);
      }

      if (response.data.success) {
        navigate('/episodes');
      } else {
        setError('Erro ao salvar episódio');
      }
    } catch (err) {
      console.error('Erro ao salvar episódio:', err);
      setError('Erro ao salvar episódio: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Container><Typography>Carregando...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {id && id !== 'new' ? 'Editar Episódio' : 'Novo Episódio'}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />}
          onClick={() => navigate('/episodes')}
        >
          Voltar
        </Button>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff4f4' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={2}>
              <TextField
                required
                fullWidth
                label="Número"
                name="number"
                type="number"
                value={episode.number}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={10}>
              <TextField
                required
                fullWidth
                label="Título"
                name="title"
                value={episode.title}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Descrição"
                name="description"
                value={episode.description}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                type="date"
                fullWidth
                label="Data de Gravação"
                name="recordingDate"
                value={formatDateForInput(episode.recordingDate)}
                onChange={(e) => handleDateChange('recordingDate', new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={episode.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="planned">Planejado</MenuItem>
                  <MenuItem value="recorded">Gravado</MenuItem>
                  <MenuItem value="editing">Em Edição</MenuItem>
                  <MenuItem value="published">Publicado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Convidados</Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<Add />}
                  onClick={() => setGuestDialogOpen(true)}
                >
                  Adicionar Convidado
                </Button>
              </Box>
              
              {episode.guests.length > 0 ? (
                <Grid container spacing={2}>
                  {episode.guests.map((guest, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Paper sx={{ p: 2, position: 'relative' }}>
                        <IconButton 
                          size="small" 
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() => handleRemoveGuest(index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle1">{guest.name}</Typography>
                        <Box sx={{ mt: 1 }}>
                          {guest.socialMedia.instagram && (
                            <Chip 
                              label={`Instagram: ${guest.socialMedia.instagram}`} 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {guest.socialMedia.linkedin && (
                            <Chip 
                              label={`LinkedIn: ${guest.socialMedia.linkedin}`} 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {guest.socialMedia.twitter && (
                            <Chip 
                              label={`Twitter: ${guest.socialMedia.twitter}`} 
                              size="small" 
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum convidado adicionado
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Links de Mídia</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Link do Arquivo Bruto"
                    name="mediaLinks.raw"
                    value={episode.mediaLinks.raw}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Link do Arquivo Editado"
                    name="mediaLinks.edited"
                    value={episode.mediaLinks.edited}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Link do YouTube"
                    name="mediaLinks.youtube"
                    value={episode.mediaLinks.youtube}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Link da Pasta no Drive"
                    name="mediaLinks.driveFolder"
                    value={episode.mediaLinks.driveFolder}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Tópicos</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    label="Novo Tópico"
                    size="small"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    variant="outlined" 
                    startIcon={<Add />}
                    onClick={handleAddTopic}
                  >
                    Adicionar
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {episode.topics.length > 0 ? (
                  episode.topics.map((topic, index) => (
                    <Chip 
                      key={index}
                      label={topic}
                      onDelete={() => handleRemoveTopic(index)}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum tópico adicionado
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Timestamps</Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<Add />}
                  onClick={() => setTimestampDialogOpen(true)}
                >
                  Adicionar Timestamp
                </Button>
              </Box>
              
              {episode.timestamps.length > 0 ? (
                <Grid container spacing={2}>
                  {episode.timestamps.map((timestamp, index) => (
                    <Grid item xs={12} key={index}>
                      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {timestamp.time}
                          </Typography>
                          <Typography variant="body2">
                            {timestamp.description}
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemoveTimestamp(index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum timestamp adicionado
                </Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  type="submit"
                  disabled={saving}
                  startIcon={<Save />}
                  sx={{ minWidth: 150 }}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Dialog for adding guests */}
      <Dialog open={guestDialogOpen} onClose={() => setGuestDialogOpen(false)}>
        <DialogTitle>Adicionar Convidado</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Nome"
                name="name"
                value={newGuest.name}
                onChange={handleGuestChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Instagram"
                name="socialMedia.instagram"
                value={newGuest.socialMedia.instagram}
                onChange={handleGuestChange}
                placeholder="@username"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="LinkedIn"
                name="socialMedia.linkedin"
                value={newGuest.socialMedia.linkedin}
                onChange={handleGuestChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Twitter"
                name="socialMedia.twitter"
                value={newGuest.socialMedia.twitter}
                onChange={handleGuestChange}
                placeholder="@username"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddGuest} variant="contained">Adicionar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for adding timestamps */}
      <Dialog open={timestampDialogOpen} onClose={() => setTimestampDialogOpen(false)}>
        <DialogTitle>Adicionar Timestamp</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Tempo (MM:SS)"
                name="time"
                value={newTimestamp.time}
                onChange={handleTimestampChange}
                placeholder="00:00"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={2}
                label="Descrição"
                name="description"
                value={newTimestamp.description}
                onChange={handleTimestampChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimestampDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleAddTimestamp} variant="contained">Adicionar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EpisodeForm;