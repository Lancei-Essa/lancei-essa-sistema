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

// Banco de dados em memória simulado para desenvolvimento
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

console.log('⚠️ Usando banco de dados em memória para desenvolvimento ⚠️');

// Função simplificada para iniciar o servidor
const startServer = async () => {
  // Não tente conectar a um banco de dados, use apenas o memoryDb
  console.log('Iniciando servidor em modo de desenvolvimento (sem banco de dados)');
  
  // Vamos considerar que o servidor está sempre "conectado" no modo de desenvolvimento
  const dbConnected = true;

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
      
      // Verificar se o usuário já existe
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
      
      // Adicionar ao "banco de dados"
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
      
      // Buscar usuário
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
  app.get('/api/auth/profile', auth, (req, res) => {
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
      const authUrl = youtubeService.getAuthUrl();
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
      const authUrl = youtubeService.getAuthUrl();
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
  
  // Simular armazenamento de tokens
  const activeTokens = {};
  
  // Callback de autorização
  app.get('/api/youtube/oauth2callback', async (req, res) => {
    const { code, state } = req.query;
    
    try {
      if (!code) {
        throw new Error('Código de autorização não fornecido');
      }
      
      // Simular chamada para obter tokens
      const tokens = {
        access_token: 'youtube_' + Math.random().toString(36).substring(2, 15),
        refresh_token: 'refresh_' + Math.random().toString(36).substring(2, 15),
        expiry_date: Date.now() + (60 * 60 * 1000) // Expira em 1 hora
      };
      
      // Simular armazenamento no banco de dados
      // Em um ambiente real, isso seria associado ao usuário atual
      activeTokens.youtube = {
        ...tokens,
        userId: state || 'user123', // Em um cenário real, usaríamos o state para identificar o usuário
        channel_id: 'UC_dummy_channel_id',
        created_at: new Date().toISOString()
      };
      
      console.log('Token salvo:', activeTokens.youtube);
      
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
  app.get('/api/youtube/check-connection', auth, (req, res) => {
    // Verificar se temos um token ativo
    if (activeTokens.youtube) {
      const now = Date.now();
      const isExpired = now > activeTokens.youtube.expiry_date;
      
      res.json({
        success: true,
        connected: !isExpired,
        expired: isExpired,
        channel_id: activeTokens.youtube.channel_id,
        message: isExpired ? 'Token expirado' : 'Conectado'
      });
    } else {
      res.json({
        success: true,
        connected: false,
        message: 'Nenhum token encontrado para este usuário'
      });
    }
  });
  
  // Canal do YouTube
  app.get('/api/youtube/channel/stats', auth, (req, res) => {
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