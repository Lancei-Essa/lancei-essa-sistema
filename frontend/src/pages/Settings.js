import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Grid, TextField, Button,
  Switch, FormControlLabel, Divider, Accordion, AccordionSummary, 
  AccordionDetails, Alert, Tabs, Tab, Card, CardContent, Chip,
  CircularProgress, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Save, ExpandMore, TokenOutlined, Refresh, Add, Check,
  YouTube, Instagram, LinkedIn, Twitter, Facebook, AdminPanelSettings
} from '@mui/icons-material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SocialMediaHub from '../components/SocialMediaHub';
import connectionMonitor from '../services/monitoring/connectionMonitor';
import CompanyManager from '../components/AdminPanel/CompanyManager';

// Importamos apenas as partes que vamos usar
import { getStatusIcon, getStatusChip } from '../components/StatusDashboard/ConnectionUtils';

// Plataformas suportadas
const PLATFORMS = [
  { 
    id: 'youtube', 
    name: 'YouTube', 
    icon: <YouTube sx={{ color: '#FF0000' }} fontSize="large" />,
    checkEndpoint: '/api/youtube/check-connection',
  },
  { 
    id: 'instagram', 
    name: 'Instagram', 
    icon: <Instagram sx={{ color: '#C13584' }} fontSize="large" />, 
    checkEndpoint: '/api/instagram/check-connection',
  },
  { 
    id: 'twitter', 
    name: 'Twitter', 
    icon: <Twitter sx={{ color: '#1DA1F2' }} fontSize="large" />,
    checkEndpoint: '/api/twitter/check-connection', 
  },
  { 
    id: 'linkedin', 
    name: 'LinkedIn', 
    icon: <LinkedIn sx={{ color: '#0077B5' }} fontSize="large" />,
    checkEndpoint: '/api/linkedin/check-connection',
  },
  { 
    id: 'tiktok', 
    name: 'TikTok', 
    icon: <MusicNoteIcon sx={{ color: '#000000' }} fontSize="large" />,
    checkEndpoint: '/api/tiktok/check-connection',
  }
];

const Settings = () => {
  // Estados gerais
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Lancei Essa',
    websiteUrl: 'https://lanceiessa.com.br',
    emailContact: 'contato@lanceiessa.com.br',
    defaultPublishTime: '12:00',
    autoSaveDrafts: true,
    notifyBeforePublish: true,
    notifyAfterPublish: true,
  });
  
  // Estado para verificar se o usuário é administrador
  const [isAdmin, setIsAdmin] = useState(true); // Em produção, isso seria determinado pelo contexto de autenticação

  // Estados de API/credenciais
  const [companies, setCompanies] = useState([
    { id: 1, name: 'Lancei Essa' },
    { id: 2, name: 'Empresa Demo' }
  ]);
  const [selectedCompany, setSelectedCompany] = useState(1);
  const [companyCredentials, setCompanyCredentials] = useState({
    1: {
      youtube: { clientId: '••••••••••••••••••••••••', clientSecret: '••••••••••••••••••••••••', apiKey: '•••••••••••••••••' },
      instagram: { clientId: '••••••••••••••••••••••••', clientSecret: '••••••••••••••••••••••••' },
      twitter: { apiKey: '', apiSecret: '' },
      linkedin: { clientId: '', clientSecret: '' },
      tiktok: { clientKey: '', clientSecret: '' }
    },
    2: {
      youtube: { clientId: '', clientSecret: '', apiKey: '' },
      instagram: { clientId: '', clientSecret: '' },
      twitter: { apiKey: '', apiSecret: '' },
      linkedin: { clientId: '', clientSecret: '' },
      tiktok: { clientKey: '', clientSecret: '' }
    }
  });

  // Estados de conexão
  const [connectionStatus, setConnectionStatus] = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Estado da guia ativa na seção de redes sociais
  const [socialMediaTab, setSocialMediaTab] = useState(0);

  // Estados de controle geral
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar status de conexão ao iniciar
  useEffect(() => {
    refreshConnectionStatus();
  }, []);

  // Verificar status de todas as conexões
  const refreshConnectionStatus = async () => {
    setLoadingConnections(true);
    
    try {
      // Obtém os status de conexão usando o serviço
      const statuses = await connectionMonitor.checkAllConnections();
      
      // Atualiza o estado com os status obtidos
      setConnectionStatus(statuses);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Erro ao verificar status das conexões:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Handlers de formulário
  const handleGeneralChange = (e) => {
    const { name, value, checked } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: e.target.type === 'checkbox' ? checked : value
    });
  };

  const handleCompanyChange = (e) => {
    setSelectedCompany(e.target.value);
  };

  const handleCredentialChange = (platform, field, value) => {
    setCompanyCredentials({
      ...companyCredentials,
      [selectedCompany]: {
        ...companyCredentials[selectedCompany],
        [platform]: {
          ...companyCredentials[selectedCompany][platform],
          [field]: value
        }
      }
    });
  };

  const handleSocialMediaTabChange = (event, newValue) => {
    setSocialMediaTab(newValue);
  };

  const handleConnect = async (platform) => {
    // Lógica para iniciar conexão com a plataforma
    console.log(`Conectando com ${platform}...`);
    // Em uma implementação real, aqui abriríamos o fluxo OAuth
  };

  const handleSaveSettings = () => {
    setLoading(true);
    // Simulando uma chamada de API
    setTimeout(() => {
      // Em uma aplicação real, salvaríamos no backend
      // api.post('/settings', { generalSettings, companyCredentials })
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1000);
  };

  // Componentes para as diferentes guias de redes sociais
  const renderConnectionStatus = () => (
    <Box sx={{ mt: 2 }}>
      {lastRefresh && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="caption">
            Última verificação: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <Button 
            startIcon={<Refresh />}
            size="small"
            variant="outlined"
            onClick={refreshConnectionStatus}
            disabled={loadingConnections}
          >
            Atualizar Status
          </Button>
        </Box>
      )}

      {loadingConnections ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {PLATFORMS.map((platform) => {
            const status = connectionStatus[platform.id];
            
            return (
              <Grid item xs={12} sm={6} md={4} key={platform.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      mb: 2 
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {platform.icon}
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          {platform.name}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getStatusChip(status)}
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {status?.connected ? 
                          status.tokenExpiresIn ? `Token expira em ${status.tokenExpiresIn} dias` : 'Conectado' 
                          : 'Não conectado'}
                      </Typography>
                      
                      <Button 
                        size="small" 
                        color="primary" 
                        onClick={() => handleConnect(platform.id)}
                      >
                        {(!status || !status.connected) ? "Conectar" : "Reconectar"}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );

  const renderCompanyCredentials = () => (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth variant="outlined">
          <InputLabel>Empresa</InputLabel>
          <Select
            value={selectedCompany}
            onChange={handleCompanyChange}
            label="Empresa"
          >
            {companies.map(company => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Estas credenciais são usadas para autenticar o sistema com as APIs das plataformas.
        Cada empresa pode ter suas próprias credenciais para as diferentes redes sociais.
      </Alert>

      <Grid container spacing={3}>
        {PLATFORMS.map((platform) => (
          <Grid item xs={12} key={platform.id}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {platform.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {platform.name}
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  {platform.id === 'youtube' && (
                    <>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Client ID"
                          value={companyCredentials[selectedCompany]?.youtube?.clientId || ''}
                          onChange={(e) => handleCredentialChange('youtube', 'clientId', e.target.value)}
                          type="password"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Client Secret"
                          value={companyCredentials[selectedCompany]?.youtube?.clientSecret || ''}
                          onChange={(e) => handleCredentialChange('youtube', 'clientSecret', e.target.value)}
                          type="password"
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="API Key"
                          value={companyCredentials[selectedCompany]?.youtube?.apiKey || ''}
                          onChange={(e) => handleCredentialChange('youtube', 'apiKey', e.target.value)}
                          type="password"
                        />
                      </Grid>
                    </>
                  )}

                  {platform.id === 'instagram' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Client ID"
                          value={companyCredentials[selectedCompany]?.instagram?.clientId || ''}
                          onChange={(e) => handleCredentialChange('instagram', 'clientId', e.target.value)}
                          type="password"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Client Secret"
                          value={companyCredentials[selectedCompany]?.instagram?.clientSecret || ''}
                          onChange={(e) => handleCredentialChange('instagram', 'clientSecret', e.target.value)}
                          type="password"
                        />
                      </Grid>
                    </>
                  )}

                  {platform.id === 'twitter' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="API Key"
                          value={companyCredentials[selectedCompany]?.twitter?.apiKey || ''}
                          onChange={(e) => handleCredentialChange('twitter', 'apiKey', e.target.value)}
                          type="password"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="API Secret"
                          value={companyCredentials[selectedCompany]?.twitter?.apiSecret || ''}
                          onChange={(e) => handleCredentialChange('twitter', 'apiSecret', e.target.value)}
                          type="password"
                        />
                      </Grid>
                    </>
                  )}

                  {platform.id === 'linkedin' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Client ID"
                          value={companyCredentials[selectedCompany]?.linkedin?.clientId || ''}
                          onChange={(e) => handleCredentialChange('linkedin', 'clientId', e.target.value)}
                          type="password"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Client Secret"
                          value={companyCredentials[selectedCompany]?.linkedin?.clientSecret || ''}
                          onChange={(e) => handleCredentialChange('linkedin', 'clientSecret', e.target.value)}
                          type="password"
                        />
                      </Grid>
                    </>
                  )}

                  {platform.id === 'tiktok' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Client Key"
                          value={companyCredentials[selectedCompany]?.tiktok?.clientKey || ''}
                          onChange={(e) => handleCredentialChange('tiktok', 'clientKey', e.target.value)}
                          type="password"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Client Secret"
                          value={companyCredentials[selectedCompany]?.tiktok?.clientSecret || ''}
                          onChange={(e) => handleCredentialChange('tiktok', 'clientSecret', e.target.value)}
                          type="password"
                        />
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<Check />}
                      >
                        Verificar Credenciais
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<Add />}
          sx={{ mr: 1 }}
        >
          Adicionar Empresa
        </Button>
      </Box>
    </Box>
  );

  const renderPlatformSettings = () => (
    <Box sx={{ mt: 2 }}>
      <SocialMediaHub />
    </Box>
  );

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
        {/* Configurações Gerais */}
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

        {/* Gerenciamento de Redes Sociais (Unificado) */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="social-media-management-content"
              id="social-media-management-header"
            >
              <Typography variant="h6">Gerenciamento de Redes Sociais</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Tabs 
                value={socialMediaTab} 
                onChange={handleSocialMediaTabChange}
                variant="fullWidth"
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="Status de Conexões" />
                <Tab label="Credenciais por Empresa" />
                <Tab label="Configurações de Plataformas" />
              </Tabs>

              {/* Conteúdo baseado na guia selecionada */}
              {socialMediaTab === 0 && renderConnectionStatus()}
              {socialMediaTab === 1 && renderCompanyCredentials()}
              {socialMediaTab === 2 && renderPlatformSettings()}
            </AccordionDetails>
          </Accordion>
        </Grid>
        
        {/* Gerenciamento de Empresas (Apenas para administradores) */}
        {isAdmin && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="company-management-content"
                id="company-management-header"
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AdminPanelSettings sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Gerenciamento de Empresas</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Esta seção permite gerenciar empresas no sistema multi-tenant. Apenas administradores têm acesso a estas configurações.
                </Alert>
                
                <CompanyManager />
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Botão Salvar */}
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