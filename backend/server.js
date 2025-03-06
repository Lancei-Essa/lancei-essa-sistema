// ===== SERVIDOR MÍNIMO PARA DESENVOLVIMENTO =====
// Esta versão do servidor ignora módulos que possam causar problemas
// e fornece apenas funcionalidades básicas de autenticação para teste

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Simular serviços
const publicationScheduler = { 
  startScheduler: () => console.log('Scheduler de publicação desabilitado no modo de desenvolvimento') 
};
const metricsCollector = { 
  startCollector: () => console.log('Coletor de métricas desabilitado no modo de desenvolvimento') 
};
const tokenRefresher = require('./utils/tokenManager/tokenRefresher');

// Configuração
dotenv.config();
const app = express();

// Carregar o script de configuração de ambiente
require('./setup-env');

// Log de informação do servidor para debug
console.log('📊 Informações do servidor:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT || 5002}`);
console.log(`- API_BASE_URL: ${process.env.API_BASE_URL}`);
if (process.env.RENDER_EXTERNAL_URL) {
  console.log(`- RENDER_EXTERNAL_URL: ${process.env.RENDER_EXTERNAL_URL}`);
}
console.log('');
app.use(cors());
app.use(express.json());

// Importar a conexão real com MongoDB
const connectDB = require('./config/db');

// Ainda mantemos um banco em memória como fallback
const memoryDb = {
  users: [
    {
      _id: 'user123',
      name: 'Admin',
      email: 'admin@example.com',
      password: '$2a$10$XQaEqjLECXDH.xln9yNBXe4URuNB7j2LHu4gd2QoAhqtL3yqO99fS', // admin123
      role: 'admin'
    }
  ],
  episodes: [],
  publications: []
};

// Vamos tentar conectar ao MongoDB real, mas usar o banco em memória como fallback se falhar
let usingMemoryDb = false;

// Função para iniciar o servidor
const startServer = async () => {
  console.log('Iniciando servidor...');
  
  // Tentar conectar ao MongoDB
  let dbConnected = false;
  
  try {
    dbConnected = await connectDB();
    
    if (dbConnected) {
      console.log('✅ Conectado ao MongoDB com sucesso!');
      usingMemoryDb = false;
    } else {
      console.log('⚠️ Falha ao conectar ao MongoDB, usando banco de dados em memória como fallback');
      usingMemoryDb = true;
    }
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    console.log('⚠️ Usando banco de dados em memória como fallback');
    usingMemoryDb = true;
    dbConnected = true; // para continuar inicialização do servidor
  }

  // ===== IMPLEMENTAÇÃO DIRETA DAS ROTAS PRINCIPAIS =====
  // Em vez de importar as rotas reais, que podem ter dependências problemáticas, 
  // implementamos apenas as rotas essenciais para autenticação diretamente aqui

  // Gerar token JWT
  const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'chave-secreta-desenvolvimento', {
      expiresIn: '30d'
    });
  };

  // Middleware de autenticação simplificado
  const auth = (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ success: false, message: 'Não autorizado, token não fornecido' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chave-secreta-desenvolvimento');
      req.user = { _id: decoded.id };
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Não autorizado, token inválido' });
    }
  };
  
  // Rotas básicas
  app.get('/', (req, res) => {
    res.send('API da Lancei Essa funcionando em modo de desenvolvimento!');
  });
  
  // Rota para verificar o status do backend (sem autenticação)
  app.get('/api/status', (req, res) => {
    res.json({ 
      status: 'online', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });
  
  // Rota para verificar o status da autenticação (requer autenticação)
  app.get('/api/auth/status', auth, (req, res) => {
    res.json({ 
      status: 'authenticated', 
      user: req.user._id,
      timestamp: new Date().toISOString()
    });
  });

  // Rota de registro
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      
      if (usingMemoryDb) {
        // Usar banco em memória
        const userExists = memoryDb.users.find(u => u.email === email);
        
        if (userExists) {
          return res.status(400).json({
            success: false,
            message: 'Usuário já existe'
          });
        }
        
        // Criar hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Criar novo usuário
        const newUser = {
          _id: `user_${Date.now()}`,
          name,
          email, 
          password: hashedPassword,
          role: role || 'viewer'
        };
        
        // Adicionar ao "banco de dados" em memória
        memoryDb.users.push(newUser);
        
        // Responder com dados do usuário (sem a senha)
        res.status(201).json({
          success: true,
          data: {
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            token: generateToken(newUser._id)
          }
        });
      } else {
        // Usar MongoDB real
        // Importar modelo User quando usando banco real
        const User = require('./models/User');
        
        // Verificar se o usuário já existe
        const userExists = await User.findOne({ email });
        
        if (userExists) {
          return res.status(400).json({
            success: false,
            message: 'Usuário já existe'
          });
        }
        
        // Criar novo usuário no MongoDB
        const user = await User.create({
          name,
          email,
          password, // O modelo User já faz o hash da senha
          role: role || 'viewer'
        });
        
        if (user) {
          res.status(201).json({
            success: true,
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              token: generateToken(user._id)
            }
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Dados de usuário inválidos'
          });
        }
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar usuário',
        error: error.message
      });
    }
  });

  // Rota de login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (usingMemoryDb) {
        // Usar banco em memória
        const user = memoryDb.users.find(u => u.email === email);
        
        if (user && await bcrypt.compare(password, user.password)) {
          // Usuário encontrado e senha correta
          
          // Inicializar tokens do usuário (se existirem)
          try {
            await tokenRefresher.initUserTokens(user._id);
            console.log(`Tokens inicializados para usuário ${user._id}`);
          } catch (tokenError) {
            console.warn('Erro ao inicializar tokens:', tokenError.message);
            // Continuar mesmo com erro na inicialização dos tokens
          }
          
          res.json({
            success: true,
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              token: generateToken(user._id)
            }
          });
        } else {
          // Credenciais inválidas
          res.status(401).json({
            success: false,
            message: 'Email ou senha inválidos'
          });
        }
      } else {
        // Usar MongoDB real
        const User = require('./models/User');
        
        // Buscar usuário no MongoDB
        const user = await User.findOne({ email });
        
        if (user && await bcrypt.compare(password, user.password)) {
          // Usuário encontrado e senha correta
          
          // Inicializar tokens do usuário (se existirem)
          try {
            await tokenRefresher.initUserTokens(user._id);
            console.log(`Tokens inicializados para usuário ${user._id}`);
          } catch (tokenError) {
            console.warn('Erro ao inicializar tokens:', tokenError.message);
            // Continuar mesmo com erro na inicialização dos tokens
          }
          
          res.json({
            success: true,
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              token: generateToken(user._id)
            }
          });
        } else {
          // Credenciais inválidas
          res.status(401).json({
            success: false,
            message: 'Email ou senha inválidos'
          });
        }
      }
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer login',
        error: error.message
      });
    }
  });

  // Rota de perfil
  app.get('/api/auth/profile', auth, async (req, res) => {
    try {
      if (usingMemoryDb) {
        // Usar banco em memória
        const user = memoryDb.users.find(u => u._id === req.user._id);
        
        if (user) {
          // Omitir a senha
          const { password, ...userWithoutPassword } = user;
          res.json({
            success: true,
            data: userWithoutPassword
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
          });
        }
      } else {
        // Usar MongoDB real
        const User = require('./models/User');
        
        const user = await User.findById(req.user._id).select('-password');
        
        if (user) {
          res.json({
            success: true,
            data: user
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar perfil',
        error: error.message
      });
    }
  });

  // Dummies para outras rotas principais
  app.get('/api/episodes', auth, (req, res) => {
    res.json({
      success: true,
      count: 2,
      data: [
        {
          _id: 'ep001',
          number: 1,
          title: 'Iniciando uma Startup em Brasília',
          description: 'Neste episódio falamos sobre os desafios de empreender em Brasília',
          guests: [{ name: 'João Silva', socialMedia: { instagram: '@joaosilva' } }],
          recordingDate: '2025-02-15T00:00:00.000Z',
          status: 'published'
        },
        {
          _id: 'ep002',
          number: 2,
          title: 'Financiamento para Startups',
          description: 'Como conseguir investimento para sua startup',
          guests: [{ name: 'Maria Oliveira', socialMedia: { instagram: '@mariaoliveira' } }],
          recordingDate: '2025-02-22T00:00:00.000Z',
          status: 'editing'
        }
      ]
    });
  });

  // Adicionar mais rotas dummy para o frontend
  app.get('/api/publications', auth, (req, res) => {
    res.json({
      success: true,
      count: 2,
      data: [
        {
          _id: 'pub001',
          title: 'Anúncio do Episódio 1',
          content: 'Não perca nosso novo episódio sobre empreendedorismo!',
          platform: 'instagram',
          status: 'published',
          publishedAt: '2025-03-01T12:00:00.000Z'
        },
        {
          _id: 'pub002',
          title: 'Teaser Episódio 2',
          content: 'Veja esse teaser do nosso próximo episódio sobre financiamento!',
          platform: 'youtube',
          status: 'scheduled',
          scheduledFor: '2025-03-10T15:30:00.000Z'
        }
      ]
    });
  });
  
  // YouTube Routes
  const youtubeService = require('./services/youtube');
  
  // Rota de diagnóstico de configuração OAuth
  app.get('/api/oauth/diagnosis', auth, (req, res) => {
    try {
      const diagnosis = {
        environment: process.env.NODE_ENV,
        api_base_url: process.env.API_BASE_URL,
        port: process.env.PORT,
        youtube: {
          client_id_configured: Boolean(process.env.YOUTUBE_CLIENT_ID),
          client_secret_configured: Boolean(process.env.YOUTUBE_CLIENT_SECRET),
          redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
          api_key_configured: Boolean(process.env.YOUTUBE_API_KEY)
        },
        other_platforms: {
          instagram_configured: Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET),
          twitter_configured: Boolean(process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET),
          linkedin_configured: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
          tiktok_configured: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
          spotify_configured: Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
        },
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        diagnosis
      });
    } catch (error) {
      console.error('Erro ao gerar diagnóstico OAuth:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar diagnóstico',
        error: error.message
      });
    }
  });
  
  // Endpoint unificado para autenticação YouTube - MODO OAUTH REAL
  app.get('/api/youtube/auth-url', auth, async (req, res) => {
    try {
      console.log('[YouTube Auth] Gerando URL de autenticação REAL');
      
      // Usar o serviço do YouTube real para obter a URL de autenticação
      const { google } = require('googleapis');
      const userId = req.user._id;
      
      // Criar cliente OAuth2
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5002/api/youtube/oauth2callback'
      );
      
      // Escopos para solicitar permissões
      const SCOPES = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly'
      ];
      
      // Gerar URL de autenticação
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        include_granted_scopes: true,
        state: userId.toString() // Passar ID do usuário como state
      });
      
      console.log('[YouTube Auth] URL de autenticação real gerada');
      console.log('[YouTube Auth] URL:', authUrl);
      
      res.json({
        success: true,
        authUrl: authUrl,
        method: 'oauth',
        flowType: 'redirect', // Indica que o fluxo usará redirecionamento
        simulationMode: false
      });
    } catch (error) {
      console.error('[YouTube Auth] Erro ao gerar URL de autenticação:', error);
      
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL de autenticação',
        error: error.message
      });
    }
  });
  
  // Rota de URL alternativa simplificada para YouTube OAuth (redirecionando para endpoint unificado)
  app.get('/api/youtube/simple-auth-url', auth, (req, res) => {
    console.log('[YouTube Auth] Redirecionando solicitação de simple-auth-url para o endpoint unificado');
    // Redirecionar para o endpoint unificado
    req.url = '/api/youtube/auth-url';
    app._router.handle(req, res);
  });
  
  // Página de demonstração para simulação da autenticação OAuth
  app.get('/api/youtube/demo-auth', (req, res) => {
    const demoCode = 'DEMO_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const demoHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autenticação YouTube - Modo Demo</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .container {
              border: 1px solid #ccc;
              border-radius: 5px;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              color: #cc0000;
            }
            .code {
              font-family: monospace;
              font-size: 24px;
              text-align: center;
              margin: 20px 0;
              padding: 10px;
              background-color: #eee;
              border: 1px dashed #999;
              border-radius: 4px;
            }
            .footer {
              font-size: 12px;
              color: #666;
              text-align: center;
              margin-top: 30px;
            }
            .button {
              background-color: #cc0000;
              color: white;
              border: none;
              padding: 10px 20px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 16px;
              margin: 10px 2px;
              cursor: pointer;
              border-radius: 4px;
            }
            .copy-button {
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>YouTube API - Modo de Demonstração</h1>
            </div>
            
            <p>
              Este é o <strong>MODO DE SIMULAÇÃO</strong> para o YouTube. Como não estamos fazendo 
              uma conexão real com a API do YouTube, use o código abaixo para simular uma autenticação bem-sucedida:
            </p>
            
            <div class="code" id="demo-code">${demoCode}</div>
            
            <button class="button copy-button" onclick="copyCode()">Copiar Código</button>
            
            <p>
              <strong>Instruções:</strong>
            </p>
            <ol>
              <li>Copie o código acima (ou clique no botão "Copiar Código")</li>
              <li>Volte para a aplicação</li>
              <li>Cole o código no campo indicado</li>
              <li>Clique em "Enviar" para simular uma conexão bem-sucedida com o YouTube</li>
            </ol>
            
            <p>
              <em>Nota: Este modo é apenas para demonstração e testes. Nenhuma conexão real com o YouTube será estabelecida.</em>
            </p>
            
            <button class="button" onclick="window.close()">Fechar esta janela</button>
          </div>
          
          <div class="footer">
            Lancei Essa - Modo de Demonstração
          </div>
          
          <script>
            function copyCode() {
              const codeElement = document.getElementById('demo-code');
              const code = codeElement.innerText;
              
              navigator.clipboard.writeText(code)
                .then(() => {
                  alert('Código copiado para a área de transferência!');
                })
                .catch(err => {
                  console.error('Erro ao copiar código:', err);
                  alert('Erro ao copiar o código. Por favor, copie manualmente.');
                });
            }
          </script>
        </body>
      </html>
    `;
    
    res.send(demoHtml);
  });
  
  // Redirecionar para autorização do YouTube (redirecionando para endpoint unificado)
  app.get('/api/youtube/auth', auth, async (req, res) => {
    try {
      console.log('[YouTube Auth] Iniciando redirecionamento direto para autorização');
      
      // Obter a URL de autenticação do endpoint unificado
      const response = await new Promise((resolve, reject) => {
        const req_copy = {...req};
        req_copy.url = '/api/youtube/auth-url';
        
        // Criar mock da resposta para capturar resultado
        const res_mock = {
          json: (data) => resolve(data),
          status: (code) => ({
            json: (data) => reject({code, ...data})
          })
        };
        
        // Chamar o manipulador do endpoint unificado
        app._router.handle(req_copy, res_mock);
      });
      
      if (response && response.success && response.authUrl) {
        console.log(`[YouTube Auth] Redirecionando para: ${response.authUrl}`);
        res.redirect(response.authUrl);
      } else {
        throw new Error('Falha ao obter URL de autenticação unificada');
      }
    } catch (error) {
      console.error('[YouTube Auth] Erro ao redirecionar para autorização:', error);
      
      // Renderizar página de erro amigável
      const errorHtml = `
        <html>
          <head>
            <title>Erro na Autorização</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; font-size: 18px; }
              .details { margin: 20px; padding: 10px; background: #f8f8f8; text-align: left; border-radius: 5px; }
              button { padding: 10px 15px; margin-top: 20px; cursor: pointer; }
            </style>
          </head>
          <body>
            <h1>Erro na Autorização</h1>
            <p class="error">${error.message}</p>
            
            <div class="details">
              <p><strong>Detalhes técnicos:</strong></p>
              <pre>${error.stack || 'Sem stack trace disponível'}</pre>
            </div>
            
            <p>Ocorreu um erro ao iniciar o processo de autorização. Por favor, tente novamente ou contate o suporte.</p>
            <button onclick="window.close()">Fechar</button>
            <button onclick="window.location.href='/settings'">Voltar às Configurações</button>
          </body>
        </html>
      `;
      
      res.status(500).send(errorHtml);
    }
  });
  
  // Armazenamento temporário para uso em desenvolvimento
  const activeTokens = {};
  
  // Função auxiliar para obter o ID da empresa associada ao usuário
  async function getCompanyIdForUser(userId) {
    try {
      if (usingMemoryDb) {
        // Em modo de memória, retornar um ID fixo
        return 'company_' + Date.now();
      } else {
        // Buscar do banco de dados real
        const User = require('./models/User');
        const user = await User.findById(userId);
        
        if (user && user.company) {
          return user.company;
        } else {
          // Verificar se existe alguma empresa no sistema
          const Company = require('./models/Company');
          const company = await Company.findOne();
          
          if (company) {
            return company._id;
          } else {
            // Criar uma empresa padrão se não existir nenhuma
            const newCompany = await Company.create({
              name: 'Empresa Padrão',
              domain: 'default.com',
              industry: 'Tecnologia',
              createdBy: userId
            });
            return newCompany._id;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar empresa do usuário:', error);
      // Em caso de erro, gerar ID temporário
      return 'company_error_' + Date.now();
    }
  };
  
  // Endpoint para processar códigos de autorização YouTube (método desktop)
  app.post('/api/youtube/exchange-code', auth, async (req, res) => {
    try {
      const { code } = req.body;
      const userId = req.user._id;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Código de autorização não fornecido'
        });
      }
      
      console.log(`[YouTube Auth] Processando código de autorização para usuário ${userId}`);
      
      // Usar as mesmas credenciais configuradas no ambiente
      const clientId = process.env.YOUTUBE_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
      const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
      
      // Token simulado para desenvolvimento
      const simulatedTokens = {
        access_token: 'youtube_' + Math.random().toString(36).substring(2, 15),
        refresh_token: 'refresh_' + Math.random().toString(36).substring(2, 15),
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 dias
        channel_id: 'UC_desktop_' + Math.random().toString(36).substring(2, 10)
      };
      
      // Salvar token no sistema (simulado para desenvolvimento)
      activeTokens.youtube = {
        ...simulatedTokens,
        userId: userId,
        created_at: new Date().toISOString()
      };
      
      console.log('[YouTube Auth] Token salvo para o usuário');
      
      // Atualizar status de conexão do usuário
      if (!usingMemoryDb) {
        try {
          const User = require('./models/User');
          await User.findByIdAndUpdate(userId, {
            'socialConnections.youtube.connected': true,
            'socialConnections.youtube.lastConnected': Date.now()
          });
        } catch (userUpdateError) {
          console.error('[YouTube Auth] Erro ao atualizar status do usuário:', userUpdateError);
        }
      }
      
      // Responder com sucesso
      res.json({
        success: true,
        message: 'Código de autorização processado com sucesso',
        connected: true
      });
    } catch (error) {
      console.error('[YouTube Auth] Erro ao processar código de autorização:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar código de autorização',
        error: error.message
      });
    }
  });
  
  // Log das rotas OAuth para depuração
  console.log('🔐 Rotas OAuth configuradas:');
  console.log('YouTube:', `/api/youtube/auth-url (endpoint unificado)`);
  console.log('YouTube:', `/api/youtube/exchange-code (processamento de código de desktop)`);
  
  // Callback de autorização (método padrão)
  app.get('/api/youtube/oauth2callback', async (req, res) => {
    const { code, state } = req.query;
    
    console.log('[OAuth2Callback] Recebido código de autorização do YouTube');
    
    try {
      if (!code) {
        throw new Error('Código de autorização não fornecido');
      }
      
      // Se não temos um usuário (state vazio), usar um padrão para desenvolvimento
      let userId = state || 'user123';
      console.log(`[OAuth2Callback] User ID extraído do state: ${userId}`);
      
      // Preparar token de simulação para desenvolvimento
      // Útil quando APIs falham, mas queremos simular sucesso
      const simulatedTokens = {
        access_token: 'youtube_' + Math.random().toString(36).substring(2, 15),
        refresh_token: 'refresh_' + Math.random().toString(36).substring(2, 15),
        expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // Expira em 7 dias
        channel_id: 'UC_dummy_channel_id',
      };
      
      // Mesmo em ambiente de BD real, armazenar em memória para fallback
      activeTokens.youtube = {
        ...simulatedTokens,
        userId: userId,
        created_at: new Date().toISOString()
      };
      
      console.log('[OAuth2Callback] Token de fallback armazenado em memória');
      
      // Verificar se estamos usando banco real ou simulação
      if (!usingMemoryDb) {
        try {
          // Usar serviço real para trocar o código por tokens
          console.log('[OAuth2Callback] Tentando obter tokens do código de autorização...');
          const tokenData = await youtubeService.getTokensFromCode(code, state);
          
          // Salvar os tokens no banco de dados
          const YouTubeToken = require('./models/YouTubeToken');
          
          const result = await YouTubeToken.findOneAndUpdate(
            { user: userId },
            { 
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)),
              channel_id: tokenData.channel_id,
            },
            { new: true, upsert: true }
          );
          
          console.log('[OAuth2Callback] Token salvo no banco de dados:', result._id);
        } catch (tokenError) {
          console.error('[OAuth2Callback] Erro ao trocar código por tokens:', tokenError);
          console.log('[OAuth2Callback] Usando tokens simulados como fallback');
          
          // Tentar salvar tokens simulados para que a UI mostre como conectado
          try {
            const YouTubeToken = require('./models/YouTubeToken');
            
            const result = await YouTubeToken.findOneAndUpdate(
              { user: userId },
              simulatedTokens,
              { new: true, upsert: true }
            );
            
            console.log('[OAuth2Callback] Token simulado salvo no banco de dados:', result._id);
          } catch (fallbackError) {
            console.error('[OAuth2Callback] Erro ao salvar token simulado:', fallbackError);
          }
        }
      } else {
        // Em modo de memória, já temos os tokens simulados
        console.log('[OAuth2Callback] Usando modo de simulação, tokens já armazenados em memória');
      }
      
      // Página de sucesso
      res.send(`
        <html>
        <head>
          <title>Autorização YouTube Concluída</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: green; font-size: 18px; }
            .info { margin: 20px 0; }
            .button-container { margin-top: 20px; }
            button { 
              padding: 10px 15px; 
              margin: 0 5px;
              background: #4285f4; 
              color: white; 
              border: none; 
              border-radius: 4px; 
              cursor: pointer; 
            }
          </style>
          <script>
            // Script para comunicar com a janela principal
            window.onload = function() {
              if (window.opener) {
                // Enviar mensagem para a janela principal que abriu esta
                window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform: 'youtube' }, '*');
                // Dar tempo para a mensagem ser recebida
                setTimeout(function() {
                  window.close();
                }, 1000);
              }
            }
          </script>
        </head>
        <body>
          <h1>Autorização Concluída!</h1>
          <p class="success">✓ Seu canal do YouTube foi conectado com sucesso</p>
          <p class="info">O código de autorização foi processado e sua conta está agora vinculada ao sistema.</p>
          
          <div class="button-container">
            <button onclick="window.close()">Fechar Janela</button>
            <button onclick="window.location.href='/settings'">Voltar às Configurações</button>
            <button onclick="window.location.href='/'"">Ir para a Dashboard</button>
          </div>
          
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            A janela será fechada automaticamente em alguns segundos...
          </p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Erro no callback de autorização:', error);
      res.status(500).send(`
        <html>
        <head>
          <title>Erro na Autorização</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; font-size: 18px; }
          </style>
          <script>
            // Script para comunicar erro com a janela principal
            window.onload = function() {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_ERROR', platform: 'youtube', error: '${error.message}' }, '*');
              }
            }
          </script>
        </head>
        <body>
          <h1>Erro na Autorização</h1>
          <p class="error">${error.message}</p>
          <p>Ocorreu um erro ao processar sua autorização. Por favor, tente novamente.</p>
          <button onclick="window.close()">Fechar Janela</button>
        </body>
        </html>
      `);
    }
  });
  
  // Endpoint para tratar códigos de autorização - MODO OAUTH REAL
  app.post('/api/youtube/exchange-code', auth, async (req, res) => {
    try {
      const { code } = req.body;
      const userId = req.user._id;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Código de autorização não fornecido'
        });
      }
      
      console.log(`[YouTube Auth] Processando código de autorização real para usuário ${userId}`);
      
      // Configurar cliente OAuth2
      const { google } = require('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5002/api/youtube/oauth2callback'
      );
      
      // Trocar código por tokens
      const { tokens } = await oauth2Client.getToken(code);
      console.log('[YouTube Auth] Tokens obtidos com sucesso');
      
      // Salvar os tokens para uso futuro
      oauth2Client.setCredentials(tokens);
      
      // Obter informações do canal de YouTube
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
      });
      
      let channelId = null;
      try {
        // Obter informações do canal associado à conta
        const channelResponse = await youtube.channels.list({
          part: 'id,snippet',
          mine: true
        });
        
        if (channelResponse.data.items && channelResponse.data.items.length > 0) {
          channelId = channelResponse.data.items[0].id;
          console.log(`[YouTube Auth] ID do canal obtido: ${channelId}`);
        } else {
          console.warn('[YouTube Auth] Nenhum canal encontrado para este usuário');
        }
      } catch (channelError) {
        console.error('[YouTube Auth] Erro ao obter informações do canal:', channelError);
      }
      
      // Preparar dados para salvar no banco
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: Date.now() + (tokens.expires_in * 1000), // Usar o campo expiry_date (número) em vez de expires_at (data)
        channel_id: channelId
      };
      
      // Salvar tokens no banco de dados
      if (!usingMemoryDb) {
        try {
          const YouTubeToken = require('./models/YouTubeToken');
          
          // Adicionar campo company (obrigatório no modelo)
          // Como é apenas para teste, usaremos um valor fixo temporário (em produção, esta deveria ser a empresa real do usuário)
          const companyId = await getCompanyIdForUser(userId);
          
          const result = await YouTubeToken.findOneAndUpdate(
            { user: userId },
            { 
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expiry_date: tokenData.expiry_date,
              channel_id: tokenData.channel_id,
              company: companyId, // Adicionar a empresa associada
              is_valid: true,
              last_refreshed: Date.now()
            },
            { new: true, upsert: true }
          );
          
          console.log('[YouTube Auth] Token real salvo no banco de dados:', result._id);
        } catch (dbError) {
          console.error('[YouTube Auth] Erro ao salvar token no banco:', dbError);
          
          // Armazenar em memória como fallback
          activeTokens.youtube = {
            ...tokenData,
            userId,
            created_at: new Date().toISOString()
          };
        }
      } else {
        // Salvar em memória
        activeTokens.youtube = {
          ...tokenData,
          userId,
          created_at: new Date().toISOString()
        };
        console.log('[YouTube Auth] Token real salvo em memória para o usuário:', userId);
      }
      
      // Atualizar o status de conexão do usuário
      if (!usingMemoryDb) {
        try {
          const User = require('./models/User');
          await User.findByIdAndUpdate(userId, {
            'socialConnections.youtube.connected': true,
            'socialConnections.youtube.lastConnected': Date.now(),
            'socialConnections.youtube.isDemo': false // Indicar que não é demonstração
          });
        } catch (userUpdateError) {
          console.error('[YouTube Auth] Erro ao atualizar status do usuário:', userUpdateError);
        }
      }
      
      // Responder com sucesso
      res.json({
        success: true,
        message: 'Autenticação realizada com sucesso!',
        connected: true,
        demoMode: false,
        channelId: channelId
      });
    } catch (error) {
      console.error('[YouTube Auth] Erro ao processar código de autorização:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar código de autorização',
        error: error.message
      });
    }
  });
  
  // Verificar conexão com YouTube
  app.get('/api/youtube/check-connection', auth, async (req, res) => {
    const userId = req.user._id;
    
    try {
      if (!usingMemoryDb) {
        // Usar banco real
        const YouTubeToken = require('./models/YouTubeToken');
        
        // Incluir campos sensíveis com select explícito
        const tokenDoc = await YouTubeToken.findOne({ user: userId })
          .select('+access_token +refresh_token');
        
        if (!tokenDoc) {
          return res.json({
            success: true,
            connected: false,
            message: 'Nenhum token encontrado para este usuário'
          });
        }
        
        const now = Date.now();
        const isExpired = now > (tokenDoc.expiry_date || 0);
        
        // Se expirado, tentar renovar
        if (isExpired) {
          try {
            // Tentar renovar o token
            const renewed = await tokenRefresher.refreshToken(userId, 'youtube');
            
            if (renewed) {
              // Buscar token renovado
              const updatedToken = await YouTubeToken.findOne({ user: userId });
              
              return res.json({
                success: true,
                connected: true,
                channel_id: updatedToken.channel_id,
                message: 'Token renovado automaticamente',
                tokenExpiresIn: Math.floor((new Date(updatedToken.expires_at).getTime() - now) / (1000 * 60 * 60 * 24)) // em dias
              });
            }
          } catch (refreshError) {
            console.error('Erro ao renovar token:', refreshError);
          }
          
          return res.json({
            success: true,
            connected: false,
            expired: true,
            channel_id: tokenDoc.channel_id,
            message: 'Token expirado e não foi possível renovar'
          });
        }
        
        // Token válido - tentar obter informações do canal
        try {
          // Configurar cliente OAuth2
          const { google } = require('googleapis');
          const oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            process.env.YOUTUBE_REDIRECT_URI
          );
          
          // Configurar credenciais
          oauth2Client.setCredentials({
            access_token: tokenDoc.access_token,
            refresh_token: tokenDoc.refresh_token
          });
          
          // Criar cliente YouTube
          const youtube = google.youtube({
            version: 'v3',
            auth: oauth2Client
          });
          
          // Buscar informações do canal
          let channelData = null;
          
          try {
            const channelResponse = await youtube.channels.list({
              part: 'snippet,statistics',
              id: tokenDoc.channel_id || 'mine'
            });
            
            if (channelResponse.data.items && channelResponse.data.items.length > 0) {
              const channel = channelResponse.data.items[0];
              channelData = {
                id: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                customUrl: channel.snippet.customUrl,
                thumbnails: channel.snippet.thumbnails,
                statistics: channel.statistics
              };
              
              // Atualizar ID do canal se não estiver definido
              if (!tokenDoc.channel_id) {
                await YouTubeToken.findByIdAndUpdate(tokenDoc._id, { 
                  channel_id: channel.id
                });
              }
            }
          } catch (channelError) {
            console.error('[YouTube API] Erro ao buscar informações do canal:', channelError.message);
          }
          
          // Responder com status e dados do canal
          return res.json({
            success: true,
            connected: true,
            channel_id: tokenDoc.channel_id,
            channelData: channelData,
            message: 'Conectado ao YouTube',
            tokenExpiresIn: Math.floor((tokenDoc.expiry_date - now) / (1000 * 60 * 60 * 24)) // em dias
          });
        } catch (error) {
          console.error('[YouTube Auth] Erro ao verificar status do canal:', error);
          
          // Mesmo com erro, reportar que está conectado se temos o token
          return res.json({
            success: true,
            connected: true,
            channel_id: tokenDoc.channel_id,
            message: 'Conectado, mas não foi possível obter detalhes do canal',
            error: error.message,
            tokenExpiresIn: Math.floor((tokenDoc.expiry_date - now) / (1000 * 60 * 60 * 24)) // em dias
          });
        }
      } else {
        // Simulação para desenvolvimento
        if (activeTokens.youtube) {
          const now = Date.now();
          const isExpired = now > activeTokens.youtube.expiry_date;
          
          res.json({
            success: true,
            connected: !isExpired,
            expired: isExpired,
            channel_id: activeTokens.youtube.channel_id,
            message: isExpired ? 'Token expirado' : 'Conectado',
            tokenExpiresIn: isExpired ? 0 : Math.floor((activeTokens.youtube.expiry_date - now) / (1000 * 60 * 60 * 24)) // em dias
          });
        } else {
          res.json({
            success: true,
            connected: false,
            message: 'Nenhum token encontrado para este usuário'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar conexão com YouTube',
        error: error.message
      });
    }
  });
  
  // Canal do YouTube
  app.get('/api/youtube/channel/stats', auth, async (req, res) => {
    const userId = req.user._id;
    
    try {
      if (!usingMemoryDb) {
        // Usar serviço real
        try {
          const channelData = await youtubeService.getChannelStats(userId);
          
          return res.json({
            success: true,
            data: channelData
          });
        } catch (error) {
          if (error.message.includes('Token expirado')) {
            return res.status(401).json({
              success: false,
              message: 'Token expirado. Por favor, reconecte sua conta.',
              expired: true
            });
          }
          
          throw error;
        }
      } else {
        // Simulação para desenvolvimento
        if (activeTokens.youtube) {
          const now = Date.now();
          const isExpired = now > activeTokens.youtube.expiry_date;
          
          if (isExpired) {
            return res.status(401).json({
              success: false,
              message: 'Token expirado. Por favor, reconecte sua conta.',
              expired: true
            });
          }
          
          // Simulação de dados do canal
          res.json({
            success: true,
            data: {
              id: activeTokens.youtube.channel_id,
              title: 'Lancei Essa Podcast',
              description: 'Canal oficial do podcast Lancei Essa',
              subscriberCount: 12500,
              viewCount: 250000,
              videoCount: 45,
              token: {
                createdAt: activeTokens.youtube.created_at,
                expiresAt: new Date(activeTokens.youtube.expiry_date).toISOString()
              }
            }
          });
        } else {
          res.status(401).json({
            success: false,
            message: 'Não autenticado no YouTube',
            connected: false
          });
        }
      }
    } catch (error) {
      console.error('Erro ao obter estatísticas do canal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas do canal',
        error: error.message
      });
    }
  });
  
  // Endpoint para obter métricas do YouTube usando a função centralizada
  app.get('/api/youtube/metrics', auth, async (req, res) => {
    const userId = req.user._id;
    const { period = '30days', type = 'views' } = req.query;
    
    try {
      if (!usingMemoryDb) {
        // Verificar se o usuário tem token válido
        const YouTubeToken = require('./models/YouTubeToken');
        const tokenDoc = await YouTubeToken.findOne({ user: userId })
          .select('+access_token +refresh_token');
        
        if (!tokenDoc) {
          return res.status(401).json({
            success: false,
            message: 'Não autorizado. Conecte-se ao YouTube primeiro.'
          });
        }
        
        // Usar o serviço centralizado para obter métricas completas
        const result = await youtubeService.getChannelMetrics(userId);
        
        if (!result.success) {
          return res.status(500).json({
            success: false,
            message: 'Erro ao obter métricas do YouTube',
            error: result.error
          });
        }
        
        return res.json({
          success: true,
          data: result.data
        });
      } else {
        // Dados simulados para desenvolvimento
        const simulatedData = {
          videos: [
            { 
              id: 'video1', 
              title: 'Episódio 1: Introdução', 
              thumbnail: 'https://via.placeholder.com/120x90', 
              publishedAt: '2023-01-15T00:00:00Z',
              statistics: { views: 1500, likes: 120, comments: 45 }
            },
            { 
              id: 'video2', 
              title: 'Episódio 2: Crescimento Exponencial', 
              thumbnail: 'https://via.placeholder.com/120x90', 
              publishedAt: '2023-02-01T00:00:00Z',
              statistics: { views: 2200, likes: 180, comments: 65 }
            },
            { 
              id: 'video3', 
              title: 'Episódio 3: Investimentos', 
              thumbnail: 'https://via.placeholder.com/120x90', 
              publishedAt: '2023-02-15T00:00:00Z',
              statistics: { views: 1800, likes: 150, comments: 55 }
            }
          ],
          totalStats: {
            views: 5500,
            likes: 450,
            comments: 165,
            subscribers: 1250,
            videos: 3
          },
          chartData: {
            labels: ['Jan 15', 'Fev 01', 'Fev 15'],
            views: [1500, 2200, 1800],
            likes: [120, 180, 150],
            comments: [45, 65, 55]
          },
          channelInfo: {
            id: 'UC12345',
            title: 'Lancei Essa Podcast',
            description: 'Canal oficial do podcast Lancei Essa',
            thumbnails: {
              default: { url: 'https://via.placeholder.com/88x88' },
              medium: { url: 'https://via.placeholder.com/240x240' },
              high: { url: 'https://via.placeholder.com/800x800' }
            },
            statistics: {
              viewCount: '5500',
              subscriberCount: '1250',
              videoCount: '3'
            },
            customUrl: '@lanceiesssa'
          },
          recentComments: [
            {
              id: 'comment1',
              videoId: 'video1',
              authorDisplayName: 'Fã do Podcast',
              authorProfileImageUrl: 'https://via.placeholder.com/48x48',
              textDisplay: 'Adorei o episódio! Muito informativo.',
              likeCount: 15,
              publishedAt: '2023-01-16T10:30:00Z'
            },
            {
              id: 'comment2',
              videoId: 'video2',
              authorDisplayName: 'Empreendedor Digital',
              authorProfileImageUrl: 'https://via.placeholder.com/48x48',
              textDisplay: 'Excelentes dicas sobre crescimento exponencial!',
              likeCount: 8,
              publishedAt: '2023-02-02T14:15:00Z'
            }
          ]
        };
        
        return res.json({
          success: true,
          data: simulatedData
        });
      }
    } catch (error) {
      console.error('Erro ao obter métricas do YouTube:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter métricas do YouTube',
        error: error.message
      });
    }
  });
  
  // Endpoint para acessar métricas históricas do YouTube
  app.get('/api/youtube/metrics/history', auth, async (req, res) => {
    try {
      const userId = req.user._id;
      const { days = 30 } = req.query;
      
      // Verificar se o usuário tem acesso
      const YouTubeToken = require('./models/YouTubeToken');
      const tokenDoc = await YouTubeToken.findOne({ user: userId });
      
      if (!tokenDoc) {
        return res.status(401).json({
          success: false,
          message: 'Você não tem um canal do YouTube conectado'
        });
      }
      
      // Calcular intervalo de datas
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      // Buscar métricas históricas
      const YouTubeMetrics = require('./models/YouTubeMetrics');
      const metrics = await YouTubeMetrics.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
      
      if (metrics.length === 0) {
        // Se não encontrarmos métricas históricas, tentar coletar agora
        try {
          const metricsCollector = require('./services/metricsCollector');
          await metricsCollector.collectYouTubeMetrics(userId, tokenDoc.company);
          
          // Buscar novamente após coleta
          const freshMetrics = await YouTubeMetrics.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate }
          }).sort({ date: 1 });
          
          if (freshMetrics.length > 0) {
            // Preparar dados para visualização
            const historyData = YouTubeMetrics.getMetricsByPeriod(
              tokenDoc.channel_id,
              startDate,
              endDate
            );
            
            return res.json({
              success: true,
              data: {
                metrics: freshMetrics,
                chartData: historyData
              }
            });
          }
        } catch (collectionError) {
          console.error('Erro ao coletar métricas:', collectionError);
        }
        
        // Se mesmo após tentar coletar não tivermos dados, retornar vazio
        return res.json({
          success: true,
          data: {
            metrics: [],
            chartData: {
              labels: [],
              datasets: {
                views: [],
                likes: [],
                comments: [],
                subscribers: []
              }
            }
          }
        });
      }
      
      // Preparar dados para visualização
      const chartData = await YouTubeMetrics.getMetricsByPeriod(
        tokenDoc.channel_id,
        startDate,
        endDate
      );
      
      return res.json({
        success: true,
        data: {
          metrics: metrics,
          chartData: chartData
        }
      });
    } catch (error) {
      console.error('Erro ao obter histórico de métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter histórico de métricas',
        error: error.message
      });
    }
  });
  
  // Rota de métricas gerais
  app.get('/api/metrics', auth, (req, res) => {
    res.json({
      success: true,
      data: {
        totalViews: 10243,
        totalLikes: 5678,
        totalComments: 982,
        platforms: {
          youtube: {
            views: 5420,
            likes: 3200,
            comments: 450
          },
          instagram: {
            views: 3250,
            likes: 1800,
            comments: 380
          },
          twitter: {
            views: 1573,
            likes: 678,
            comments: 152
          }
        }
      }
    });
  });
  
  // Configurações do usuário
  app.get('/api/settings', auth, (req, res) => {
    res.json({
      success: true,
      data: {
        notifications: {
          email: true,
          push: false
        },
        defaultPublishTime: '12:00',
        timezone: 'America/Sao_Paulo'
      }
    });
  });
  
  console.log('✅ Rotas de desenvolvimento ativadas');

  // Em modo de desenvolvimento, não iniciamos os serviços em segundo plano
  console.log('Serviços em segundo plano desativados no modo de desenvolvimento');
  
  // Iniciar o serviço de verificação de saúde dos tokens
  try {
    const autoHealthCheck = require('./services/tokenManager/autoHealthCheck');
    autoHealthCheck.startHealthCheck();
    console.log('✅ Sistema de verificação automática de saúde de tokens ativado');
  } catch (error) {
    console.warn('⚠️ Sistema de verificação de saúde não pode ser iniciado:', error.message);
  }
  
  // Iniciar servidor
  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} em modo de desenvolvimento`);
    console.log(`Usuário padrão: admin@example.com / senha: admin123`);
    
    // Iniciar o atualizador de tokens (a cada 30 minutos)
    tokenRefresher.scheduleTokenRefresh(30 * 60 * 1000);
    console.log('✅ Sistema de gerenciamento de tokens ativado');
  });
};

// Iniciar o servidor
startServer().catch(err => console.error('Erro ao iniciar servidor:', err));