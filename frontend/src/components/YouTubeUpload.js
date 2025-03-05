import React, { useState, useEffect, useCallback } from 'react';
import { 
  Paper, Typography, Box, Button, TextField, 
  Alert, CircularProgress, FormControl, 
  InputLabel, Select, MenuItem, Divider,
  LinearProgress, Grid, Chip, Tooltip
} from '@mui/material';
import { 
  Upload, YouTube, CloudUpload, Schedule, 
  Visibility, VisibilityOff, Public 
} from '@mui/icons-material';
import { uploadToYouTube, checkYouTubeConnection } from '../services/platforms/youtube';

const YouTubeUpload = ({ onVideoUploaded, episodeId }) => {
  // Dados do vídeo
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState('unlisted');
  const [publishAt, setPublishAt] = useState('');
  const [videoCategory, setVideoCategory] = useState('22'); // 22 = People & Blogs
  
  // Estado do upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [videoId, setVideoId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Estado da conexão com YouTube
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Verificar conexão com YouTube ao carregar o componente
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setCheckingConnection(true);
        const response = await checkYouTubeConnection();
        setIsConnected(response.connected);
      } catch (err) {
        console.error('Erro ao verificar conexão com YouTube:', err);
        setIsConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkConnection();
  }, []);

  // Preencher título e descrição com base no episódio (se fornecido)
  useEffect(() => {
    if (episodeId && title === '' && description === '') {
      // Aqui você pode buscar os dados do episódio da API se necessário
      // Por enquanto, vamos deixar em branco para o usuário preencher
    }
  }, [episodeId, title, description]);

  const handleFileChange = useCallback((e) => {
    if (e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
      
      // Se título estiver vazio, sugerir nome do arquivo como título
      if (title === '') {
        const suggestedTitle = selectedFile.name
          .replace(/\.[^/.]+$/, '') // Remove extensão
          .replace(/[-_]/g, ' '); // Substitui hífens e underscores por espaços
        setTitle(suggestedTitle);
      }
    }
  }, [title]);

  const resetForm = useCallback(() => {
    setFile(null);
    setFileName('');
    setTitle('');
    setDescription('');
    setTags('');
    setUploadProgress(0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!file) {
      setError('Por favor, selecione um arquivo de vídeo.');
      return;
    }
    
    if (!title) {
      setError('Por favor, insira um título para o vídeo.');
      return;
    }
    
    setUploading(true);
    setError('');
    setSuccess(false);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('tags', tags);
    formData.append('privacyStatus', privacyStatus);
    formData.append('categoryId', videoCategory);
    
    if (privacyStatus === 'scheduled' && publishAt) {
      formData.append('publishAt', new Date(publishAt).toISOString());
    }
    
    // Adicionar ID do episódio se fornecido
    if (episodeId) {
      formData.append('episodeId', episodeId);
    }
    
    // Simulação de progresso para melhor experiência do usuário
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 2000);
    
    try {
      const response = await uploadToYouTube(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.success) {
        setSuccess(true);
        setVideoId(response.videoId);
        setVideoUrl(response.videoUrl);
        
        // Notificar componente pai sobre o upload bem-sucedido
        if (onVideoUploaded) {
          onVideoUploaded({
            videoId: response.videoId,
            videoUrl: response.videoUrl,
            title,
            description,
            privacyStatus
          });
        }
        
        // Limpar o formulário após um tempo
        setTimeout(() => {
          resetForm();
        }, 5000);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || 'Erro ao fazer upload do vídeo');
      console.error('Erro de upload:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleConnectYouTube = () => {
    // Redirecionar para autorização
    window.location.href = '/api/youtube/auth';
  };

  // Renderizar componente de conexão quando não estiver conectado
  if (!isConnected && !checkingConnection) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Upload para YouTube</Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          É necessário conectar-se ao YouTube para fazer upload de vídeos.
        </Alert>
        
        <Button 
          variant="contained" 
          color="error" 
          startIcon={<YouTube />}
          onClick={handleConnectYouTube}
          fullWidth
        >
          Conectar ao YouTube
        </Button>
      </Paper>
    );
  }

  // Renderizar loading enquanto verifica conexão
  if (checkingConnection) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Verificando conexão...</Typography>
        </Box>
        <CircularProgress sx={{ display: 'block', mx: 'auto', my: 3 }} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
        <Typography variant="h6">Upload para YouTube</Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Vídeo enviado com sucesso!
          </Typography>
          {videoUrl && (
            <Box sx={{ mt: 1 }}>
              <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                Ver vídeo no YouTube
              </a>
            </Box>
          )}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Área de upload de arquivo */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
            fullWidth
            disabled={uploading}
            sx={{ 
              height: 100, 
              borderStyle: 'dashed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {fileName ? (
              <>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Arquivo selecionado:
                </Typography>
                <Typography variant="body1">{fileName}</Typography>
              </>
            ) : (
              <>
                <CloudUpload sx={{ fontSize: 40, mb: 1 }} />
                <Typography>Selecionar Arquivo de Vídeo</Typography>
              </>
            )}
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={handleFileChange}
              disabled={uploading}
            />
          </Button>
        </Box>
        
        {uploading && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Enviando vídeo... {uploadProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título do Vídeo"
              variant="outlined"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descrição"
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              disabled={uploading}
              placeholder="Descreva seu vídeo. Uma boa descrição ajuda na otimização para buscas."
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tags (separadas por vírgula)"
              variant="outlined"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={uploading}
              placeholder="podcast, lancei essa, empreendedorismo"
              helperText="Adicione tags para melhorar a descoberta do seu vídeo"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={videoCategory}
                onChange={(e) => setVideoCategory(e.target.value)}
                label="Categoria"
                disabled={uploading}
              >
                <MenuItem value="22">Pessoas e Blogs</MenuItem>
                <MenuItem value="28">Ciência e Tecnologia</MenuItem>
                <MenuItem value="27">Educação</MenuItem>
                <MenuItem value="24">Entretenimento</MenuItem>
                <MenuItem value="10">Música</MenuItem>
                <MenuItem value="25">Notícias e Política</MenuItem>
                <MenuItem value="20">Videogames</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Privacidade</InputLabel>
              <Select
                value={privacyStatus}
                onChange={(e) => setPrivacyStatus(e.target.value)}
                label="Privacidade"
                disabled={uploading}
              >
                <MenuItem value="private">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <VisibilityOff fontSize="small" sx={{ mr: 1 }} />
                    Privado
                  </Box>
                </MenuItem>
                <MenuItem value="unlisted">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Visibility fontSize="small" sx={{ mr: 1 }} />
                    Não Listado
                  </Box>
                </MenuItem>
                <MenuItem value="public">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Public fontSize="small" sx={{ mr: 1 }} />
                    Público
                  </Box>
                </MenuItem>
                <MenuItem value="scheduled">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Schedule fontSize="small" sx={{ mr: 1 }} />
                    Agendar Publicação
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {privacyStatus === 'scheduled' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Data e Hora de Publicação"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={uploading}
                required={privacyStatus === 'scheduled'}
                helperText="Especifique quando o vídeo ficará público"
              />
            </Grid>
          )}
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="error"
            size="large"
            startIcon={<YouTube />}
            disabled={uploading}
          >
            {uploading ? 'Enviando...' : 'Enviar para YouTube'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default YouTubeUpload;