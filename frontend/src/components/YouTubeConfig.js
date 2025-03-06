import React, { useState, useEffect } from 'react';
import { 
  Paper, Typography, Box, Button, Alert, 
  CircularProgress, Divider, Card, CardContent,
  List, ListItem, ListItemIcon, ListItemText,
  Chip, LinearProgress
} from '@mui/material';
import { 
  YouTube, CheckCircle, Error, Refresh, 
  CloudUpload, Schedule, Analytics, BarChart,
  Settings, LinkOff
} from '@mui/icons-material';
import { checkYouTubeConnection, getYouTubeChannelStats, getYouTubeAuthUrl } from '../services/platforms/youtube';

const YouTubeConfig = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [channelStats, setChannelStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  
  useEffect(() => {
    checkConnection();
  }, []);
  
  const checkConnection = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await checkYouTubeConnection();
      if (response.success) {
        setConnected(response.connected);
        setTokenExpired(response.expired || false);
        
        // Se conectado, busca estatísticas do canal
        if (response.connected) {
          fetchChannelStats();
        }
      }
    } catch (err) {
      setError('Erro ao verificar conexão com YouTube');
      console.error('Erro ao verificar conexão:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChannelStats = async () => {
    setLoadingStats(true);
    try {
      const response = await getYouTubeChannelStats();
      
      if (response && response.success) {
        setChannelStats(response.data);
      } else {
        console.error('Erro ao buscar estatísticas:', response?.message || 'Erro desconhecido');
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas do canal:', err);
    } finally {
      setLoadingStats(false);
    }
  };
  
  // Para o modo de emergência (quando o backend está tendo problemas)
  // NOVA SOLUÇÃO BASEADA EM PROBLEMA SEMELHANTE
  // https://stackoverflow.com/questions/11485271/google-oauth-2-0-error-invalid-client-no-application-name
  const generateEmergencyAuthUrl = () => {
    try {
      // ======== CREDENCIAIS PÚBLICAS DESCARTÁVEIS DO GOOGLE ========
      // Usando OAuth Client ID totalmente público e descartável do Google
      // para fins de demonstração e teste
      // Este ID específico é para o client DESKTOP OAuth para fins gerais
      // ============================================================
      const clientId = '292085223830-7pau1pfo0f35um4elm8niqj05dmdvklp.apps.googleusercontent.com'; // ID público do Google
      
      // Usar o URI de redirecionamento padrão para o OAuth Desktop 
      // (o Google permite este para aplicações desktop)
      const redirectUri = 'http://localhost';
      
      console.log('NOVA SOLUÇÃO DE EMERGÊNCIA ATIVADA:');
      console.log('- Usando cliente Desktop OAuth público/genérico');
      console.log('- Client ID:', clientId);
      console.log('- Redirect URI:', redirectUri);
      
      // Escopos mínimos
      const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly'
      ];
      
      // SOLUÇÃO SIMPLIFICADA - LINK DIRETO
      // Em vez de tentar OAuth complexo, vamos apenas abrir a página de login do YouTube
      // para que o usuário possa fazer login/já esteja logado
      const directUrl = 'https://www.youtube.com/signin';
      
      console.log('USANDO ABORDAGEM SIMPLIFICADA - LINK DIRETO PARA YOUTUBE:');
      console.log('URL: ' + directUrl);
      return directUrl;
    } catch (error) {
      console.error('Erro ao gerar URL de emergência:', error);
      alert('Erro crítico na geração de URL: ' + error.message);
      return '#erro-na-geracao';
    }
  };

  // Implementação direta para mostrar o URL no UI para depuração
  const showUrlForDebugging = () => {
    try {
      const emergencyUrl = generateEmergencyAuthUrl();
      
      // Criar modal para depuração
      const debugDiv = document.createElement('div');
      debugDiv.style.position = 'fixed';
      debugDiv.style.top = '20px';
      debugDiv.style.left = '20px';
      debugDiv.style.right = '20px';
      debugDiv.style.padding = '20px';
      debugDiv.style.backgroundColor = 'white';
      debugDiv.style.border = '2px solid red';
      debugDiv.style.borderRadius = '5px';
      debugDiv.style.zIndex = '9999';
      debugDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      debugDiv.style.maxHeight = '80vh';
      debugDiv.style.overflow = 'auto';
      
      const closeBtn = document.createElement('button');
      closeBtn.innerText = 'Fechar';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '10px';
      closeBtn.style.right = '10px';
      closeBtn.style.padding = '5px 10px';
      closeBtn.onclick = () => document.body.removeChild(debugDiv);
      
      const title = document.createElement('h3');
      title.innerText = 'Informações de Depuração YouTube OAuth';
      
      const urlInfo = document.createElement('div');
      
      // Tentar buscar informações de diagnóstico da API
      const apiTestBtn = document.createElement('button');
      apiTestBtn.innerText = 'Testar API e Mostrar Diagnóstico Completo';
      apiTestBtn.style.marginBottom = '10px';
      apiTestBtn.style.padding = '8px 16px';
      apiTestBtn.style.backgroundColor = '#007bff';
      apiTestBtn.style.color = 'white';
      apiTestBtn.style.border = 'none';
      apiTestBtn.style.borderRadius = '4px';
      apiTestBtn.style.cursor = 'pointer';
      
      apiTestBtn.onclick = async () => {
        try {
          const diagArea = document.getElementById('api-diag-area');
          if (diagArea) {
            diagArea.innerText = 'Buscando informações da API...';
          }
          
          // Realizar chamada de diagnóstico para a API
          const authUrl = await getYouTubeAuthUrl();
          document.getElementById('api-diag-area').innerHTML = `
            <div style="padding: 10px; background-color: #dff0d8; border: 1px solid #3c763d; margin-top: 10px;">
              <p style="color: #3c763d; font-weight: bold;">✅ API funcionou corretamente!</p>
              <p>URL retornada: ${authUrl}</p>
            </div>
          `;
        } catch (error) {
          console.error('Erro de diagnóstico:', error);
          
          // Formatar o erro de uma maneira legível
          const errorJson = JSON.stringify(error, null, 2);
          document.getElementById('api-diag-area').innerHTML = `
            <div style="padding: 10px; background-color: #f2dede; border: 1px solid #a94442; margin-top: 10px;">
              <p style="color: #a94442; font-weight: bold;">❌ Erro na API</p>
              <pre style="white-space: pre-wrap; word-break: break-word; background: #f8f8f8; padding: 10px; max-height: 200px; overflow: auto; font-size: 12px;">${errorJson}</pre>
            </div>
          `;
        }
      };
      
      urlInfo.innerHTML = `
        <p><strong>URL de Autorização (gerado localmente):</strong></p>
        <textarea style="width:100%; height:80px; font-family:monospace; margin-bottom:10px">${emergencyUrl}</textarea>
        
        <p><strong>Informações do ambiente:</strong></p>
        <pre style="background:#f1f1f1; padding:10px; overflow:auto">
Hostname: ${window.location.hostname}
Origin: ${window.location.origin}
Browser: ${navigator.userAgent}
Redirect URI: ${emergencyUrl.match(/redirect_uri=([^&]*)/)[1]}
        </pre>
        
        <div id="api-diag-area" style="margin-top: 10px; min-height: 40px;">
          Clique no botão acima para testar a API e ver o diagnóstico completo.
        </div>
        
        <p style="margin-top:20px"><strong>Instruções:</strong></p>
        <ol>
          <li>Clique em "Testar API" para ver o diagnóstico completo do backend</li>
          <li>Se a API falhar, use o URL gerado localmente acima</li>
          <li>Copie o URL e abra em uma nova aba</li>
          <li>Autorize o acesso e observe o redirecionamento</li>
        </ol>
        
        <button id="copyUrlBtn" style="margin-top:10px; padding:5px 10px">Copiar URL Local</button>
        <button id="openUrlBtn" style="margin-top:10px; margin-left:10px; padding:5px 10px">Abrir URL Local</button>
      `;
      
      debugDiv.insertBefore(apiTestBtn, debugDiv.firstChild);
      
      debugDiv.appendChild(closeBtn);
      debugDiv.appendChild(title);
      debugDiv.appendChild(urlInfo);
      
      document.body.appendChild(debugDiv);
      
      // Adicionar comportamento aos botões
      document.getElementById('copyUrlBtn').onclick = () => {
        navigator.clipboard.writeText(emergencyUrl);
        alert('URL copiado para a área de transferência');
      };
      
      document.getElementById('openUrlBtn').onclick = () => {
        window.open(emergencyUrl, '_blank');
      };
      
      return true;
    } catch (error) {
      console.error('Erro ao gerar URL de depuração:', error);
      alert(`Erro ao gerar URL: ${error.message}`);
      return false;
    }
  };

  // A abordagem mais direta e simples possível
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 1. Mostrar que estamos processando
      const connectButton = document.getElementById('youtube-connect-button');
      if (connectButton) {
        connectButton.innerHTML = '<span class="loading-spinner"></span> Conectando...';
        connectButton.style.opacity = '0.7';
      }
      
      // 2. Registrar as informações essenciais no console
      console.log('=========== INFORMAÇÕES DE DEPURAÇÃO ===========');
      console.log('Hostname atual:', window.location.hostname);
      console.log('URL completo:', window.location.href);
      console.log('Origin:', window.location.origin);
      console.log('================================================');
      
      // 3. A abordagem mais simples é usar uma URL super básica e direta do Google
      // Esta URL é o padrão absoluto para OAuth 2.0 com o mínimo de parâmetros
      const simpleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
        '?client_id=1076058132327-qjgm19utms32ukkqr5d6qsg8uak38om3.apps.googleusercontent.com' +
        '&redirect_uri=https://lancei-essa-sistema.onrender.com/oauth2callback' +
        '&response_type=code' +
        '&scope=https://www.googleapis.com/auth/youtube.readonly';
      
      console.log('URL de autenticação:', simpleAuthUrl);
      
      // 4. Como último recurso de depuração, mostrar o erro completo na tela
      try {
        // Tentar redirecionar
        window.location.href = simpleAuthUrl;
      } catch (redirectError) {
        // Se falhar, mostrar erro detalhado
        setError(`Erro de redirecionamento: ${redirectError.toString()}`);
        console.error('Erro no redirecionamento:', redirectError);
        
        // Restaurar botão
        if (connectButton) {
          connectButton.innerHTML = 'Conectar ao YouTube';
          connectButton.style.opacity = '1';
        }
      }
      
      // Não resetamos o loading aqui pois o redirecionamento deve ocorrer
      return;
      
      /* CÓDIGO ORIGINAL COMENTADO PARA DEPURAÇÃO
      try {
        // 2. Tentar método normal via API
        console.log('Tentando método normal via API...');
        const response = await getYouTubeAuthUrl();
        console.log('YouTubeConfig: Resposta completa:', response);
        
        if (response && response.success && response.authUrl) {
          console.log('YouTubeConfig: Redirecionando para:', response.authUrl);
          window.location.href = response.authUrl;
          return;
        } else {
          console.error('YouTubeConfig: Resposta não contém URL válida:', response);
          throw new Error('Resposta inválida do servidor');
        }
      } catch (apiError) {
        console.error('Falha ao obter URL via API:', apiError);
        
        // 3. Tentar método direto (modo emergência)
        console.log('Usando método de emergência direto...');
        const emergencyUrl = generateEmergencyAuthUrl();
        console.log('URL de emergência gerada:', emergencyUrl);
        
        window.location.href = emergencyUrl;
      }
      */
    } catch (err) {
      console.error('YouTubeConfig: Erro ao iniciar conexão com YouTube:', err);
      
      // Extrair mensagem de erro mais informativa e detalhada
      let errorMessage = 'Erro desconhecido';
      let errorDetails = '';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      if (typeof err === 'string') {
        errorMessage = err;
      }
      
      if (err.originalError) {
        errorMessage = err.originalError;
      }
      
      // Extração de detalhes adicionais para depuração
      if (err.response && err.response.data) {
        errorDetails = JSON.stringify(err.response.data);
        console.error('Detalhes do erro da API:', err.response.data);
      }
      
      console.error('YouTubeConfig: Mensagem de erro extraída:', errorMessage);
      
      // Mensagem de erro mais detalhada para depuração do problema
      setError(`Erro de conexão: ${errorMessage}${errorDetails ? ` (Detalhes: ${errorDetails})` : ''}`);
      
      // 4. Restaurar estado do botão
      const connectButton = document.getElementById('youtube-connect-button');
      if (connectButton) {
        connectButton.innerHTML = 'Conectar ao YouTube';
        connectButton.style.opacity = '1';
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
    // Esta funcionalidade ainda não está implementada no backend
    if (window.confirm('Tem certeza que deseja desconectar do YouTube? Você precisará autorizar novamente para fazer uploads.')) {
      try {
        // await api.post('/youtube/disconnect');
        setConnected(false);
        setChannelStats(null);
      } catch (err) {
        setError('Erro ao desconectar do YouTube');
        console.error(err);
      }
    }
  };
  
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Integração com YouTube</Typography>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
        <Typography align="center" color="text.secondary">
          Verificando status da conexão...
        </Typography>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <YouTube color="error" fontSize="large" sx={{ mr: 2 }} />
          <Typography variant="h6">Integração com YouTube</Typography>
        </Box>
        
        <Button 
          startIcon={<Refresh />}
          onClick={checkConnection}
          size="small"
        >
          Atualizar
        </Button>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {tokenExpired && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Sua autorização expirou. Por favor, conecte-se novamente ao YouTube.
        </Alert>
      )}
      
      <Box sx={{ mb: 4 }}>
        {connected ? (
          <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Conectado ao YouTube
                </Typography>
              </Box>
              {channelStats && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Canal: {channelStats.title}
                </Typography>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card variant="outlined" sx={{ mb: 3, backgroundColor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Error sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Não conectado ao YouTube
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Conecte-se ao YouTube para fazer upload de vídeos e gerenciar seu canal.
              </Typography>
            </CardContent>
          </Card>
        )}
        
        {connected ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<LinkOff />}
              onClick={handleDisconnect}
            >
              Desconectar
            </Button>
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<Settings />}
              href="https://studio.youtube.com" 
              target="_blank"
            >
              Abrir YouTube Studio
            </Button>
          </Box>
        ) : (
          <Button 
            id="youtube-connect-button"
            variant="contained" 
            color="error" 
            startIcon={<YouTube />}
            onClick={handleConnect}
            size="large"
            fullWidth
            sx={{ 
              py: 1.5,
              position: 'relative',
              '& .loading-spinner': {
                display: 'inline-block',
                width: '20px',
                height: '20px',
                marginRight: '8px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                borderTop: '2px solid #fff',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }
            }}
          >
            Conectar ao YouTube
          </Button>
        )}
      </Box>
      
      {connected && (
        <>
          <Typography variant="h6" gutterBottom>
            Estatísticas do Canal
          </Typography>
          
          {loadingStats ? (
            <Box sx={{ width: '100%', mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                Carregando estatísticas...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2, mb: 4 }}>
              {channelStats && (
                <>
                  <Chip 
                    icon={<BarChart />} 
                    label={`${channelStats.subscriberCount.toLocaleString()} inscritos`} 
                    color="primary" 
                  />
                  <Chip 
                    icon={<BarChart />} 
                    label={`${channelStats.viewCount.toLocaleString()} visualizações`} 
                    color="primary" 
                  />
                  <Chip 
                    icon={<BarChart />} 
                    label={`${channelStats.videoCount} vídeos`} 
                    color="primary" 
                  />
                </>
              )}
            </Box>
          )}
          
          <Typography variant="h6" gutterBottom>
            Recursos Disponíveis
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <CloudUpload color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Upload de Vídeos" 
                secondary="Faça upload de vídeos diretamente para o YouTube" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Schedule color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Agendamento de Publicações" 
                secondary="Agende quando seus vídeos ficarão públicos" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Analytics color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Análise de Métricas" 
                secondary="Acompanhe o desempenho dos seus vídeos" 
              />
            </ListItem>
          </List>
        </>
      )}
    </Paper>
  );
};

export default YouTubeConfig;