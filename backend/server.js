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

  // Rotas básicas
  app.get('/', (req, res) => {
    res.send('API da Lancei Essa funcionando em modo de desenvolvimento!');
  });

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
  
  // Obter URL de autenticação
  app.get('/api/youtube/auth-url', auth, (req, res) => {
    try {
      const userId = req.user._id;
      const authUrl = youtubeService.getAuthUrl(userId);
      
      res.json({
        success: true,
        authUrl
      });
    } catch (error) {
      console.error('Erro ao gerar URL de autenticação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar URL de autenticação',
        error: error.message
      });
    }
  });
  
  // Redirecionar para autorização do YouTube
  app.get('/api/youtube/auth', auth, (req, res) => {
    try {
      const userId = req.user._id;
      const authUrl = youtubeService.getAuthUrl(userId);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Erro ao redirecionar para autorização:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao redirecionar para autorização',
        error: error.message
      });
    }
  });
  
  // Armazenamento temporário para uso em desenvolvimento
  const activeTokens = {};
  
  // Callback de autorização
  app.get('/api/youtube/oauth2callback', async (req, res) => {
    const { code, state } = req.query;
    
    try {
      if (!code) {
        throw new Error('Código de autorização não fornecido');
      }
      
      let userId = state;
      
      // Verificar se estamos usando banco real ou simulação
      if (!usingMemoryDb) {
        // Usar serviço real para trocar o código por tokens
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
        
        console.log('Token salvo no banco de dados:', result._id);
      } else {
        // Simulação para desenvolvimento
        const tokens = {
          access_token: 'youtube_' + Math.random().toString(36).substring(2, 15),
          refresh_token: 'refresh_' + Math.random().toString(36).substring(2, 15),
          expiry_date: Date.now() + (60 * 60 * 1000) // Expira em 1 hora
        };
        
        // Armazenar em memória
        activeTokens.youtube = {
          ...tokens,
          userId: state || 'user123',
          channel_id: 'UC_dummy_channel_id',
          created_at: new Date().toISOString()
        };
        
        console.log('Token simulado salvo:', activeTokens.youtube);
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
            button { padding: 10px 15px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; }
          </style>
          <script>
            // Script para comunicar com a janela principal
            window.onload = function() {
              if (window.opener) {
                // Enviar mensagem para a janela principal que abriu esta
                window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform: 'youtube' }, '*');
              }
            }
          </script>
        </head>
        <body>
          <h1>Autorização Concluída!</h1>
          <p class="success">✓ Seu canal do YouTube foi conectado com sucesso</p>
          <p class="info">O código de autorização foi processado e sua conta está agora vinculada ao sistema.</p>
          <p>Você pode fechar esta janela e voltar para o aplicativo.</p>
          <button onclick="window.close()">Fechar Janela</button>
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
  
  // Verificar conexão com YouTube
  app.get('/api/youtube/check-connection', auth, async (req, res) => {
    const userId = req.user._id;
    
    try {
      if (!usingMemoryDb) {
        // Usar banco real
        const YouTubeToken = require('./models/YouTubeToken');
        
        const tokenDoc = await YouTubeToken.findOne({ user: userId });
        
        if (!tokenDoc) {
          return res.json({
            success: true,
            connected: false,
            message: 'Nenhum token encontrado para este usuário'
          });
        }
        
        const now = Date.now();
        const isExpired = now > new Date(tokenDoc.expires_at).getTime();
        
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
        
        // Token válido
        return res.json({
          success: true,
          connected: true,
          channel_id: tokenDoc.channel_id,
          message: 'Conectado',
          tokenExpiresIn: Math.floor((new Date(tokenDoc.expires_at).getTime() - now) / (1000 * 60 * 60 * 24)) // em dias
        });
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
        // Verificar se temos um token ativo
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
  
  // Rota de métricas
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