import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Divider,
  Card, CardContent, CardActions, Chip, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import { Edit, Send, ContentCopy, Preview, Email, FormatQuote, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const NewsletterGenerator = () => {
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newsletterTitle, setNewsletterTitle] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [includeSocialLinks, setIncludeSocialLinks] = useState(true);
  const [includeSponsors, setIncludeSponsors] = useState(true);
  const [sendTestDialog, setSendTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Carregar episódios e templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Em um app real, buscaríamos do backend
        const episodesResponse = await api.get('/episodes');
        setEpisodes(episodesResponse.data.data);
        
        // Templates mockados
        setTemplates([
          { id: 'weekly', name: 'Newsletter Semanal', description: 'Resumo dos episódios da semana' },
          { id: 'monthly', name: 'Resumo Mensal', description: 'Melhores momentos do mês' },
          { id: 'special', name: 'Edição Especial', description: 'Para temas e eventos especiais' }
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    
    fetchData();
  }, []);
  
  const handleGenerateNewsletter = () => {
    setLoading(true);
    
    // Simulando geração de conteúdo
    setTimeout(() => {
      const episodesContent = selectedEpisodes.map(epId => {
        const episode = episodes.find(e => e._id === epId);
        if (!episode) return '';
        
        return `
## ${episode.title}

${episode.description}

${episode.guests?.map(g => `Convidado: ${g.name}`).join('\n')}

${episode.topics?.map(t => `- ${t}`).join('\n')}
`;
      }).join('\n\n---\n\n');
      
      let content = `# ${newsletterTitle || 'Newsletter da Lancei Essa'}

Olá, Empreendedores!

Estamos de volta com novidades do mundo das startups em Brasília.

${episodesContent}
`;
      
      if (includeSocialLinks) {
        content += `

## Nos siga nas redes sociais

- Instagram: @lanceiessa
- YouTube: Lancei Essa
- LinkedIn: /lanceiessa
`;
      }
      
      if (includeSponsors) {
        content += `

## Apoiadores

Agradecemos aos nossos patrocinadores que tornam este projeto possível.
`;
      }
      
      setGeneratedContent(content);
      setPreviewMode(true);
      setLoading(false);
    }, 1000);
  };
  
  const handleSendTest = () => {
    setLoading(true);
    // Simulando envio
    setTimeout(() => {
      setLoading(false);
      setSendTestDialog(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    alert('Conteúdo copiado para a área de transferência!');
  };
  
  const handleEpisodeSelection = (event) => {
    setSelectedEpisodes(event.target.value);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Gerador de Newsletter
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Newsletter de teste enviada com sucesso!
        </Alert>
      )}
      
      {!previewMode ? (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Configure sua Newsletter
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título da Newsletter"
                value={newsletterTitle}
                onChange={(e) => setNewsletterTitle(e.target.value)}
                placeholder="Ex: Novidades da Lancei Essa - Semana 10"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Selecione os Episódios</InputLabel>
                <Select
                  multiple
                  value={selectedEpisodes}
                  onChange={handleEpisodeSelection}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const ep = episodes.find(e => e._id === value);
                        return (
                          <Chip 
                            key={value} 
                            label={ep ? `#${ep.number} - ${ep.title}` : value} 
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {episodes.map((episode) => (
                    <MenuItem key={episode._id} value={episode._id}>
                      #{episode.number} - {episode.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Templates
              </Typography>
              <Grid container spacing={2}>
                {templates.map((template) => (
                  <Grid item xs={12} md={4} key={template.id}>
                    <Card 
                      variant={selectedTemplate === template.id ? "outlined" : "elevation"}
                      sx={{ 
                        cursor: 'pointer',
                        borderColor: selectedTemplate === template.id ? 'primary.main' : 'transparent',
                        bgcolor: selectedTemplate === template.id ? 'primary.50' : 'background.paper',
                      }}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <CardContent>
                        <Typography variant="h6">{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Opções Adicionais
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeSocialLinks}
                      onChange={(e) => setIncludeSocialLinks(e.target.checked)}
                    />
                  }
                  label="Incluir links de redes sociais"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeSponsors}
                      onChange={(e) => setIncludeSponsors(e.target.checked)}
                    />
                  }
                  label="Incluir seção de apoiadores"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={selectedEpisodes.length === 0 || loading}
                  onClick={handleGenerateNewsletter}
                  startIcon={<Edit />}
                >
                  {loading ? 'Gerando...' : 'Gerar Newsletter'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Button
              variant="outlined"
              onClick={() => setPreviewMode(false)}
              startIcon={<Edit />}
            >
              Voltar para Edição
            </Button>
            <Box>
              <Button
                variant="outlined"
                onClick={handleCopyToClipboard}
                startIcon={<ContentCopy />}
                sx={{ mr: 1 }}
              >
                Copiar Conteúdo
              </Button>
              <Button
                variant="contained"
                onClick={() => setSendTestDialog(true)}
                startIcon={<Send />}
              >
                Enviar Teste
              </Button>
            </Box>
          </Box>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Preview da Newsletter
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'serif',
              p: 3,
              border: '1px solid #eee',
              borderRadius: 1,
              bgcolor: '#fcfcfc'
            }}>
              {generatedContent.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <Typography key={i} variant="h4" gutterBottom>{line.replace('# ', '')}</Typography>;
                }
                if (line.startsWith('## ')) {
                  return <Typography key={i} variant="h5" gutterBottom sx={{ mt: 3 }}>{line.replace('## ', '')}</Typography>;
                }
                if (line.startsWith('- ')) {
                  return <Typography key={i} component="li" sx={{ ml: 2 }}>{line.replace('- ', '')}</Typography>;
                }
                if (line === '') {
                  return <Box key={i} sx={{ mb: 1 }} />;
                }
                if (line === '---') {
                  return <Divider key={i} sx={{ my: 3 }} />;
                }
                return <Typography key={i} paragraph>{line}</Typography>;
              })}
            </Box>
          </Paper>
        </>
      )}

      {/* Dialog para enviar newsletter de teste */}
      <Dialog open={sendTestDialog} onClose={() => setSendTestDialog(false)}>
        <DialogTitle>Enviar Newsletter de Teste</DialogTitle>
        <DialogContent>
          <Typography paragraph sx={{ mb: 3 }}>
            Envie uma versão de teste desta newsletter para verificar como ficará para os destinatários.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Email de teste"
            type="email"
            fullWidth
            variant="outlined"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendTestDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSendTest} 
            variant="contained"
            disabled={!testEmail || loading}
          >
            {loading ? 'Enviando...' : 'Enviar Teste'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NewsletterGenerator;