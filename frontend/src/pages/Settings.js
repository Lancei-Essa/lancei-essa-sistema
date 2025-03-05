import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Divider, Accordion, AccordionSummary, AccordionDetails, Alert
} from '@mui/material';
import { Save, ExpandMore, Notifications, Instagram, YouTube, 
  LinkedIn, Twitter, Facebook, TokenOutlined, Security } from '@mui/icons-material';
import SocialMediaHub from '../components/SocialMediaHub';

const Settings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Lancei Essa',
    websiteUrl: 'https://lanceiessa.com.br',
    emailContact: 'contato@lanceiessa.com.br',
    defaultPublishTime: '12:00',
    autoSaveDrafts: true,
    notifyBeforePublish: true,
    notifyAfterPublish: true,
  });

  const [socialMediaSettings, setSocialMediaSettings] = useState({
    instagram: { connected: true, username: '@lanceiessa', autoPublish: true },
    youtube: { connected: true, username: 'Lancei Essa', autoPublish: true },
    linkedin: { connected: false, username: '', autoPublish: false },
    twitter: { connected: false, username: '', autoPublish: false },
    facebook: { connected: false, username: '', autoPublish: false }
  });

  const [apiSettings, setApiSettings] = useState({
    youtubeApiKey: '••••••••••••••••••••••••',
    instagramToken: '••••••••••••••••••••••••',
    linkedinToken: '',
    twitterToken: '',
    facebookToken: ''
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGeneralChange = (e) => {
    const { name, value, checked } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: e.target.type === 'checkbox' ? checked : value
    });
  };

  const handleSocialMediaChange = (platform, field, value) => {
    setSocialMediaSettings({
      ...socialMediaSettings,
      [platform]: {
        ...socialMediaSettings[platform],
        [field]: value
      }
    });
  };

  const handleApiChange = (e) => {
    const { name, value } = e.target;
    setApiSettings({
      ...apiSettings,
      [name]: value
    });
  };

  const handleSaveSettings = () => {
    setLoading(true);
    // Simulando uma chamada de API
    setTimeout(() => {
      // Em uma aplicação real, salvaríamos no backend
      // api.post('/settings', { generalSettings, socialMediaSettings, apiSettings })
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Configurações
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configurações salvas com sucesso!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="general-settings-content"
              id="general-settings-header"
            >
              <Typography variant="h6">Configurações Gerais</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nome da Empresa"
                    name="companyName"
                    value={generalSettings.companyName}
                    onChange={handleGeneralChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="URL do Website"
                    name="websiteUrl"
                    value={generalSettings.websiteUrl}
                    onChange={handleGeneralChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email de Contato"
                    name="emailContact"
                    type="email"
                    value={generalSettings.emailContact}
                    onChange={handleGeneralChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Horário Padrão de Publicação"
                    name="defaultPublishTime"
                    type="time"
                    value={generalSettings.defaultPublishTime}
                    onChange={handleGeneralChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Preferências de Notificação
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={generalSettings.autoSaveDrafts}
                          onChange={handleGeneralChange}
                          name="autoSaveDrafts"
                        />
                      }
                      label="Salvar rascunhos automaticamente"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={generalSettings.notifyBeforePublish}
                          onChange={handleGeneralChange}
                          name="notifyBeforePublish"
                        />
                      }
                      label="Notificar antes de publicações agendadas (1 hora antes)"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={generalSettings.notifyAfterPublish}
                          onChange={handleGeneralChange}
                          name="notifyAfterPublish"
                        />
                      }
                      label="Notificar após publicações"
                    />
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="social-media-content"
              id="social-media-header"
            >
              <Typography variant="h6">Redes Sociais</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {/* Utilizamos o componente SocialMediaHub aqui */}
              <SocialMediaHub />
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="api-keys-content"
              id="api-keys-header"
            >
              <Typography variant="h6">Chaves de API</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 3 }}>
                As chaves de API são usadas para integração com plataformas externas. Mantenha essas informações seguras.
              </Alert>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="YouTube API Key"
                    name="youtubeApiKey"
                    value={apiSettings.youtubeApiKey}
                    onChange={handleApiChange}
                    type="password"
                    InputProps={{
                      startAdornment: <TokenOutlined sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Instagram Token"
                    name="instagramToken"
                    value={apiSettings.instagramToken}
                    onChange={handleApiChange}
                    type="password"
                    InputProps={{
                      startAdornment: <TokenOutlined sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                {/* Outros tokens de API seguem o mesmo padrão */}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Settings;