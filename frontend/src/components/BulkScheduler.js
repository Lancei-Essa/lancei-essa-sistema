import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Stepper, Step, StepLabel, Button,
  Grid, FormControl, InputLabel, Select, MenuItem, TextField,
  Chip, Divider, Alert, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, ListItemIcon, Tooltip, IconButton
} from '@mui/material';
import {
  Schedule, CalendarMonth, CheckCircle, Edit, Delete, 
  Instagram, YouTube, Twitter, LinkedIn, Facebook, TikTok,
  Save, ArrowBack, ArrowForward, PublishedWithChanges, Add
} from '@mui/icons-material';
import api from '../services/api';
import { format } from 'date-fns';

/**
 * Componente para agendamento em massa de publicações
 */
const BulkScheduler = ({ episodeId, onComplete }) => {
  // Estados
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPattern, setSelectedPattern] = useState('');
  const [schedulePatterns, setSchedulePatterns] = useState([]);
  const [episode, setEpisode] = useState(null);
  const [releaseDate, setReleaseDate] = useState('');
  const [generatedSchedule, setGeneratedSchedule] = useState([]);
  const [customSchedule, setCustomSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Passo a passo
  const steps = [
    'Selecionar Padrão',
    'Configurar Agendamento',
    'Revisar e Confirmar'
  ];
  
  // Carregar padrões de agendamento ao montar o componente
  useEffect(() => {
    fetchSchedulePatterns();
    
    // Se temos um ID de episódio, buscamos os detalhes do episódio
    if (episodeId) {
      fetchEpisode();
    }
  }, [episodeId]);
  
  // Buscar padrões de agendamento disponíveis
  const fetchSchedulePatterns = async () => {
    setLoading(true);
    try {
      const response = await api.get('/publications/schedule-patterns');
      if (response.data.success) {
        setSchedulePatterns(response.data.data);
      }
    } catch (error) {
      setError('Erro ao buscar padrões de agendamento: ' + (error.response?.data?.message || error.message));
      console.error('Erro ao buscar padrões:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar detalhes do episódio
  const fetchEpisode = async () => {
    try {
      const response = await api.get(`/episodes/${episodeId}`);
      if (response.data.success) {
        setEpisode(response.data.data);
        
        // Pré-definir a data de lançamento com base na data de gravação do episódio
        if (response.data.data.recordingDate) {
          const recordDate = new Date(response.data.data.recordingDate);
          recordDate.setDate(recordDate.getDate() + 7); // Uma semana depois da gravação
          
          // Formatar para YYYY-MM-DDT00:00
          const formattedDate = recordDate.toISOString().split('T')[0] + 'T10:00';
          setReleaseDate(formattedDate);
        }
      }
    } catch (error) {
      setError('Erro ao buscar detalhes do episódio: ' + (error.response?.data?.message || error.message));
      console.error('Erro ao buscar episódio:', error);
    }
  };
  
  // Gerar agendamento a partir do padrão
  const generateSchedule = async () => {
    if (!selectedPattern || !releaseDate) {
      setError('Selecione um padrão e defina a data de lançamento.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/publications/generate-schedule', {
        episodeId,
        patternId: selectedPattern,
        releaseDate
      });
      
      if (response.data.success) {
        setGeneratedSchedule(response.data.data.publications);
        setCustomSchedule(response.data.data.publications);
        setActiveStep(1); // Avançar para o próximo passo
      }
    } catch (error) {
      setError('Erro ao gerar agendamento: ' + (error.response?.data?.message || error.message));
      console.error('Erro ao gerar agendamento:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Salvar o agendamento no servidor
  const saveSchedule = async () => {
    if (customSchedule.length === 0) {
      setError('Não há publicações para agendar.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/publications/bulk/schedule', {
        episodeId,
        publications: customSchedule
      });
      
      if (response.data.success) {
        setSuccess(response.data.message);
        setActiveStep(2); // Avançar para o último passo
        
        // Notificar o componente pai se necessário
        if (onComplete) {
          onComplete(response.data.data.scheduled);
        }
      }
    } catch (error) {
      setError('Erro ao salvar agendamento: ' + (error.response?.data?.message || error.message));
      console.error('Erro ao salvar agendamento:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Manipular alterações nas datas de publicação
  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...customSchedule];
    
    if (field === 'scheduledFor') {
      updatedSchedule[index].scheduledFor = value;
    } else if (field.startsWith('content.')) {
      const contentField = field.split('.')[1];
      updatedSchedule[index].content = {
        ...updatedSchedule[index].content,
        [contentField]: value
      };
    } else {
      updatedSchedule[index][field] = value;
    }
    
    setCustomSchedule(updatedSchedule);
  };
  
  // Adicionar nova publicação vazia
  const handleAddPublication = () => {
    const newPublication = {
      episode: episodeId,
      platform: 'instagram',
      contentType: 'image',
      content: {
        title: episode?.title || '',
        description: ''
      },
      scheduledFor: new Date().toISOString(),
      status: 'draft'
    };
    
    setCustomSchedule([...customSchedule, newPublication]);
  };
  
  // Remover publicação
  const handleRemovePublication = (index) => {
    const updatedSchedule = [...customSchedule];
    updatedSchedule.splice(index, 1);
    setCustomSchedule(updatedSchedule);
  };
  
  // Retornar ao passo anterior
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Avançar para o próximo passo
  const handleNext = () => {
    if (activeStep === 0) {
      generateSchedule();
    } else if (activeStep === 1) {
      saveSchedule();
    } else {
      // Finalizar
      if (onComplete) {
        onComplete();
      }
    }
  };
  
  // Obter ícone para cada plataforma
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram':
        return <Instagram color="primary" />;
      case 'youtube':
        return <YouTube color="error" />;
      case 'twitter':
        return <Twitter color="info" />;
      case 'linkedin':
        return <LinkedIn color="primary" />;
      case 'facebook':
        return <Facebook color="primary" />;
      case 'tiktok':
        return <TikTok color="secondary" />;
      default:
        return <Schedule />;
    }
  };
  
  // Obter nome legível para o tipo de conteúdo
  const getContentTypeName = (contentType) => {
    switch (contentType) {
      case 'full_episode':
        return 'Episódio Completo';
      case 'clip':
        return 'Clip/Vídeo Curto';
      case 'image':
        return 'Imagem';
      case 'text':
        return 'Texto';
      case 'story':
        return 'Story';
      default:
        return contentType;
    }
  };
  
  // Renderizar conteúdo com base no passo atual
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selecione um padrão de agendamento
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Padrão de Agendamento</InputLabel>
              <Select
                value={selectedPattern}
                onChange={(e) => setSelectedPattern(e.target.value)}
                label="Padrão de Agendamento"
              >
                <MenuItem value="">Selecione...</MenuItem>
                {schedulePatterns.map((pattern) => (
                  <MenuItem key={pattern.name} value={pattern.name}>
                    {pattern.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedPattern && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {schedulePatterns.find(p => p.name === selectedPattern)?.description}
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  {schedulePatterns
                    .find(p => p.name === selectedPattern)
                    ?.platforms.map(platform => (
                      <Chip
                        key={platform}
                        icon={getPlatformIcon(platform)}
                        label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                        variant="outlined"
                      />
                    ))}
                </Box>
              </Box>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>
              Defina a data de lançamento
            </Typography>
            
            <TextField
              fullWidth
              label="Data e Hora de Lançamento"
              type="datetime-local"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Esta é a data principal de lançamento do episódio, a partir da qual as outras datas serão calculadas"
              sx={{ mb: 3 }}
            />
            
            {episode && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Você está agendando publicações para o episódio <strong>#{episode.number} - {episode.title}</strong>
              </Alert>
            )}
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Ajuste o agendamento
              </Typography>
              
              <Button
                startIcon={<Add />}
                onClick={handleAddPublication}
                variant="outlined"
              >
                Adicionar Publicação
              </Button>
            </Box>
            
            {customSchedule.map((pub, index) => (
              <Paper key={index} elevation={2} sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getPlatformIcon(pub.platform)}
                      <Typography variant="subtitle1" sx={{ ml: 1 }}>
                        {pub.platform.charAt(0).toUpperCase() + pub.platform.slice(1)} - {getContentTypeName(pub.contentType)}
                      </Typography>
                    </Box>
                    
                    <IconButton onClick={() => handleRemovePublication(index)} color="error">
                      <Delete />
                    </IconButton>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Plataforma</InputLabel>
                      <Select
                        value={pub.platform}
                        onChange={(e) => handleScheduleChange(index, 'platform', e.target.value)}
                        label="Plataforma"
                      >
                        <MenuItem value="instagram">Instagram</MenuItem>
                        <MenuItem value="youtube">YouTube</MenuItem>
                        <MenuItem value="linkedin">LinkedIn</MenuItem>
                        <MenuItem value="twitter">Twitter</MenuItem>
                        <MenuItem value="facebook">Facebook</MenuItem>
                        <MenuItem value="tiktok">TikTok</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tipo de Conteúdo</InputLabel>
                      <Select
                        value={pub.contentType}
                        onChange={(e) => handleScheduleChange(index, 'contentType', e.target.value)}
                        label="Tipo de Conteúdo"
                      >
                        <MenuItem value="full_episode">Episódio Completo</MenuItem>
                        <MenuItem value="clip">Clip/Vídeo Curto</MenuItem>
                        <MenuItem value="image">Imagem</MenuItem>
                        <MenuItem value="text">Texto</MenuItem>
                        <MenuItem value="story">Story</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Título"
                      value={pub.content?.title || ''}
                      onChange={(e) => handleScheduleChange(index, 'content.title', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descrição"
                      value={pub.content?.description || ''}
                      onChange={(e) => handleScheduleChange(index, 'content.description', e.target.value)}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Data e Hora de Publicação"
                      type="datetime-local"
                      value={new Date(pub.scheduledFor).toISOString().slice(0, 16)}
                      onChange={(e) => handleScheduleChange(index, 'scheduledFor', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
            
            {customSchedule.length === 0 && (
              <Alert severity="warning">
                Nenhuma publicação configurada. Adicione publicações ou volte para selecionar um padrão.
              </Alert>
            )}
          </Box>
        );
        
      case 2:
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              {success || 'Publicações agendadas com sucesso!'}
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              Resumo do Agendamento
            </Typography>
            
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Episódio: {episode?.title}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                {customSchedule.length} publicações agendadas
              </Typography>
              
              <List>
                {customSchedule.map((pub, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getPlatformIcon(pub.platform)}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${getContentTypeName(pub.contentType)} - ${format(new Date(pub.scheduledFor), 'dd/MM/yyyy HH:mm')}`}
                      secondary={pub.content?.title}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
            
            <Alert severity="info">
              Você pode gerenciar todas as publicações agendadas na seção "Publicações".
            </Alert>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Agendamento em Massa
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {renderStepContent()}
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          {activeStep > 0 && activeStep < 2 && (
            <Button 
              onClick={handleBack} 
              sx={{ mr: 1 }}
              startIcon={<ArrowBack />}
            >
              Voltar
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            endIcon={activeStep === 2 ? <CheckCircle /> : <ArrowForward />}
            disabled={loading || (activeStep === 0 && (!selectedPattern || !releaseDate))}
          >
            {activeStep === 2 ? 'Concluir' : (activeStep === 1 ? 'Agendar' : 'Continuar')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default BulkScheduler;