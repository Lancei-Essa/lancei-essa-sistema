import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Grid, TextField, Button,
  Switch, FormControlLabel, Divider, Accordion, AccordionSummary, 
  AccordionDetails, Alert, Card, CardContent, Chip, Paper,
  CircularProgress, FormControl, InputLabel, Select, MenuItem,
  Collapse, IconButton
} from '@mui/material';
import { 
  Save, ExpandMore, TokenOutlined, Refresh, Add, Check,
  YouTube, Instagram, LinkedIn, Twitter, Facebook, AdminPanelSettings,
  ExpandLess, KeyboardArrowRight, Settings as SettingsIcon
} from '@mui/icons-material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import connectionMonitor from '../services/monitoring/connectionMonitor';
import CompanyManager from '../components/AdminPanel/CompanyManager';

// Importamos APIs das plataformas
import { getYouTubeAuthUrl } from '../services/platforms/youtube';
import { getInstagramAuthUrl } from '../services/platforms/instagram';

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

  // Estado das plataformas expandidas
  const [expandedPlatforms, setExpandedPlatforms] = useState({});
  
  // Estados de controle geral
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar status de conexão ao iniciar
  useEffect(() => {
    refreshConnectionStatus();
    
    // Adicionar listener para mensagens de OAuth
    const handleOAuthMessages = (event) => {
      // Verificar se a mensagem é do tipo OAuth
      if (event.data && (event.data.type === 'OAUTH_SUCCESS' || event.data.type === 'OAUTH_ERROR')) {
        console.log('Recebida mensagem OAuth:', event.data);
        
        if (event.data.type === 'OAUTH_SUCCESS') {
          alert(`Conexão com ${event.data.platform} realizada com sucesso!`);
          // Atualizar status após conexão bem-sucedida
          refreshConnectionStatus();
        } else {
          alert(`Erro na autenticação com ${event.data.platform}: ${event.data.error || 'Erro desconhecido'}`);
        }
      }
    };
    
    // Adicionar o listener
    window.addEventListener('message', handleOAuthMessages);
    
    // Limpar o listener ao desmontar o componente
    return () => {
      window.removeEventListener('message', handleOAuthMessages);
    };
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

  const handlePlatformToggle = (platformId) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }));
  };

  const [connectError, setConnectError] = useState(null);

  const handleConnect = async (platform) => {
    try {
      // Limpar erros anteriores
      setConnectError(null);
      console.log(`Iniciando conexão com ${platform}...`);
      
      let authUrl;
      
      // Obter URL de autenticação específica para a plataforma
      if (platform === 'youtube') {
        try {
          const response = await getYouTubeAuthUrl();
          console.log('Resposta do YouTube:', response);
          
          if (response && response.success && response.authUrl) {
            authUrl = response.authUrl;
          } else {
            throw new Error(`URL de autenticação inválida: ${JSON.stringify(response)}`);
          }
        } catch (error) {
          console.error('Erro ao obter URL de autenticação do YouTube:', error);
          throw error;
        }
      } else if (platform === 'instagram') {
        try {
          const response = await getInstagramAuthUrl();
          
          if (response && response.success && response.authUrl) {
            authUrl = response.authUrl;
          } else {
            throw new Error(`URL de autenticação inválida para Instagram`);
          }
        } catch (error) {
          console.error('Erro ao obter URL de autenticação do Instagram:', error);
          throw error;
        }
      } else {
        // Mensagem para plataformas não implementadas
        setConnectError(`Conexão com ${platform} será implementada em breve.`);
        return;
      }
      
      if (authUrl) {
        console.log(`Abrindo URL de autenticação: ${authUrl}`);
        
        // Abrir janela de autenticação
        const authWindow = window.open(authUrl, 'OAuth', 'width=600,height=700');
        
        // Verificar se a janela foi bloqueada pelo navegador
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          setConnectError('Pop-up bloqueado! Por favor, permita pop-ups para este site e tente novamente.');
          return;
        }
        
        // Expandir automaticamente a plataforma
        setExpandedPlatforms(prev => ({
          ...prev,
          [platform]: true
        }));
        
        // Verificar conexão após um tempo para dar chance ao usuário de autorizar
        setTimeout(() => {
          refreshConnectionStatus();
        }, 10000); // 10 segundos
      } else {
        throw new Error('URL de autenticação não disponível');
      }
    } catch (error) {
      console.error(`Erro ao conectar com ${platform}:`, error);
      
      // Extrair mensagem de erro mais útil
      let errorMessage = error.message || 'Erro desconhecido';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      setConnectError(`Erro ao iniciar conexão com ${platform}: ${errorMessage}`);
      
      // Expandir a plataforma para mostrar o erro
      setExpandedPlatforms(prev => ({
        ...prev,
        [platform]: true
      }));
    }
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

  // Renderizar o conteúdo unificado de gerenciamento de redes sociais
  const renderSocialMediaManagement = () => (
    <Box sx={{ mt: 2 }}>
      {/* Seletor de empresa e informações gerais */}
      <Box sx={{ mb: 3 }}>
        <FormControl variant="outlined" sx={{ minWidth: 200 }}>
          <InputLabel>Empresa</InputLabel>
          <Select
            value={selectedCompany}
            onChange={handleCompanyChange}
            label="Empresa"
            size="small"
          >
            {companies.map(company => (
              <MenuItem key={company.id} value={company.id}>
                {company.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          {lastRefresh && (
            <Typography variant="caption">
              Última verificação: {lastRefresh.toLocaleTimeString()}
            </Typography>
          )}
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
      </Box>


      {/* Mensagem de erro, se houver */}
      {connectError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setConnectError(null)}>
          {connectError}
        </Alert>
      )}

      {/* Detalhes e configurações por plataforma */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Expanda uma plataforma abaixo para ver e gerenciar suas configurações.
        Cada empresa pode ter suas próprias credenciais para as redes sociais.
      </Alert>

      {PLATFORMS.map((platform) => {
        const status = connectionStatus[platform.id];
        const isExpanded = expandedPlatforms[platform.id] || false;
        
        return (
          <Card 
            variant="outlined" 
            key={platform.id} 
            sx={{ 
              mb: 2,
              borderColor: isExpanded ? 'primary.main' : 'inherit',
              transition: 'all 0.2s'
            }}
          >
            <CardContent 
              sx={{ 
                p: '12px !important', 
                '&:last-child': { pb: '12px !important' } 
              }}
            >
              {/* Cabeçalho da plataforma */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between', 
                  cursor: 'pointer',
                  py: 1
                }}
                onClick={() => handlePlatformToggle(platform.id)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {platform.icon}
                  <Typography variant="h6" sx={{ ml: 1, fontSize: '1.1rem' }}>
                    {platform.name}
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    {getStatusChip(status)}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button 
                    size="small" 
                    color="primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(platform.id);
                    }}
                    sx={{ mr: 2 }}
                  >
                    {(!status || !status.connected) ? "Conectar" : "Reconectar"}
                  </Button>
                  
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlatformToggle(platform.id);
                    }}
                  >
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>
              
              {/* Conteúdo expandido da plataforma */}
              <Collapse in={isExpanded}>
                <Divider sx={{ my: 1.5 }} />
                
                <Grid container spacing={3}>
                  {/* Coluna de status */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Status da Conexão
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Status:
                        </Typography>
                        <Typography variant="body1">
                          {status?.connected ? 'Conectado' : 'Não conectado'}
                        </Typography>
                      </Box>
                      
                      {status?.connected && (
                        <>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Expira em:
                            </Typography>
                            <Typography variant="body1">
                              {status.tokenExpiresIn ? `${status.tokenExpiresIn} dias` : 'N/A'}
                            </Typography>
                          </Box>
                          
                          {status?.profile && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Conta conectada:
                              </Typography>
                              <Typography variant="body1">
                                {status.profile.name || 'Não disponível'}
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                      
                      {status?.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {status.error}
                        </Alert>
                      )}
                    </Box>
                  </Grid>
                  
                  {/* Coluna de credenciais */}
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Credenciais da API
                    </Typography>
                    
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
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Client Secret"
                              value={companyCredentials[selectedCompany]?.youtube?.clientSecret || ''}
                              onChange={(e) => handleCredentialChange('youtube', 'clientSecret', e.target.value)}
                              type="password"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="API Key"
                              value={companyCredentials[selectedCompany]?.youtube?.apiKey || ''}
                              onChange={(e) => handleCredentialChange('youtube', 'apiKey', e.target.value)}
                              type="password"
                              size="small"
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
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Client Secret"
                              value={companyCredentials[selectedCompany]?.instagram?.clientSecret || ''}
                              onChange={(e) => handleCredentialChange('instagram', 'clientSecret', e.target.value)}
                              type="password"
                              size="small"
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
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="API Secret"
                              value={companyCredentials[selectedCompany]?.twitter?.apiSecret || ''}
                              onChange={(e) => handleCredentialChange('twitter', 'apiSecret', e.target.value)}
                              type="password"
                              size="small"
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
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Client Secret"
                              value={companyCredentials[selectedCompany]?.linkedin?.clientSecret || ''}
                              onChange={(e) => handleCredentialChange('linkedin', 'clientSecret', e.target.value)}
                              type="password"
                              size="small"
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
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Client Secret"
                              value={companyCredentials[selectedCompany]?.tiktok?.clientSecret || ''}
                              onChange={(e) => handleCredentialChange('tiktok', 'clientSecret', e.target.value)}
                              type="password"
                              size="small"
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<Check />}
                      >
                        Verificar Credenciais
                      </Button>
                    </Box>

                    {/* Configurações avançadas específicas da plataforma */}
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Configurações Avançadas
                      </Typography>
                      
                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        {platform.id === 'youtube' && (
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={true}
                                    name="autoPublish"
                                    size="small"
                                  />
                                }
                                label="Publicar automaticamente novos episódios"
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={false}
                                    name="privacyMode"
                                    size="small"
                                  />
                                }
                                label="Definir vídeos como privados por padrão"
                              />
                            </Grid>
                          </Grid>
                        )}
                        
                        {platform.id === 'instagram' && (
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={true}
                                    name="autoPublish"
                                    size="small"
                                  />
                                }
                                label="Publicar automaticamente novos episódios"
                              />
                            </Grid>
                          </Grid>
                        )}
                        
                        {(platform.id === 'twitter' || platform.id === 'linkedin' || platform.id === 'tiktok') && (
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma configuração avançada disponível para esta plataforma.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
      
      {/* Botão para adicionar novas empresas */}
      {isAdmin && (
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
      )}
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
              {renderSocialMediaManagement()}
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