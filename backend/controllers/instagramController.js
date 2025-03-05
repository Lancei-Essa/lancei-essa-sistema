const instagramService = require('../services/platforms/instagram');
const InstagramToken = require('../models/InstagramToken');
const User = require('../models/User');
const { isValidImageFile } = require('../middleware/fileUpload');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Configurações do OAuth do Instagram
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5000/api/instagram/callback';

/**
 * Verifica a conexão com o Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.checkConnection = async (req, res) => {
  try {
    // Usar o gerenciador de tokens para verificar a conexão
    const token = await tokenManager.getToken('instagram', req.user._id);
    const verificationResult = await tokenManager.verifyAndRefreshToken('instagram', token);
    
    // Se o token foi renovado com sucesso, atualizar status de conexão no usuário
    if (verificationResult.connected && verificationResult.status === 'refreshed') {
      // Atualizar status de conexão no usuário
      await User.findByIdAndUpdate(req.user._id, {
        'socialConnections.instagram.lastConnected': new Date()
      });
    }
    
    // Remover o campo token antes de enviar a resposta (por segurança)
    delete verificationResult.token;
    
    // Enviar resultado
    res.json({
      success: true,
      ...verificationResult
    });
  } catch (error) {
    console.error('Erro ao verificar conexão com Instagram:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao verificar conexão com Instagram', 
      error: error.message 
    });
  }
};

/**
 * Retorna a URL de autorização OAuth para o Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getAuthUrl = async (req, res) => {
  try {
    if (!INSTAGRAM_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Configuração de Instagram não encontrada no servidor'
      });
    }
    
    // Armazenar ID do usuário na sessão para recuperar no callback
    req.session.instagramOAuthUserId = req.user._id;
    
    // Construir URL de autorização
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;
    
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização Instagram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de autorização',
      error: error.message
    });
  }
};

/**
 * Inicia o processo de autorização OAuth com Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.initiateAuth = async (req, res) => {
  try {
    if (!INSTAGRAM_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Configuração de Instagram não encontrada no servidor'
      });
    }
    
    // Obter o ID do usuário a partir do token JWT na query (se disponível)
    let userId = null;
    if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        console.error('Token inválido:', err);
      }
    }
    
    // Armazenar ID do usuário na sessão para recuperar no callback
    if (userId) {
      req.session.instagramOAuthUserId = userId;
    }
    
    // Construir URL de autorização
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;
    
    // Redirecionar para a página de autorização do Instagram
    res.redirect(authUrl);
  } catch (error) {
    console.error('Erro ao iniciar autenticação com Instagram:', error);
    res.status(500).send('Erro ao iniciar autenticação com Instagram');
  }
};

// Importar o gerenciador de tokens
const tokenManager = require('../services/tokenManager');

/**
 * Processa o callback de autorização do Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.handleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Código de autorização não fornecido');
    }
    
    // Obter o userId da sessão
    const userId = req.session.instagramOAuthUserId;
    
    if (!userId) {
      return res.status(400).send('Sessão de autorização expirada ou inválida');
    }
    
    // Trocar o código de autorização por um token de acesso
    const tokenResponse = await instagramService.exchangeCodeForToken(code, INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET, INSTAGRAM_REDIRECT_URI);
    
    if (!tokenResponse.success) {
      return res.status(500).send('Erro ao obter token de acesso: ' + tokenResponse.error);
    }
    
    // Obter informações do perfil do usuário
    const profileResponse = await instagramService.getUserProfile(tokenResponse.access_token);
    
    if (!profileResponse.success) {
      return res.status(500).send('Erro ao obter informações do perfil: ' + profileResponse.error);
    }
    
    // Usando o gerenciador central de tokens para salvar
    await tokenManager.saveToken('instagram', userId, {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || null,
      expires_in: tokenResponse.expires_in,
      scope: tokenResponse.scope
    }, profileResponse.data);
    
    // Atualizar status de conexão no usuário
    await User.findByIdAndUpdate(userId, {
      'socialConnections.instagram.connected': true,
      'socialConnections.instagram.lastConnected': new Date()
    });
    
    // Limpar a sessão
    delete req.session.instagramOAuthUserId;
    
    // Redirecionar para a página de sucesso
    res.redirect('/social-media?platform=instagram&status=success');
  } catch (error) {
    console.error('Erro no callback do Instagram:', error);
    res.status(500).send('Erro ao processar autenticação do Instagram: ' + error.message);
  }
};

/**
 * Salva credenciais do Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.connect = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome de usuário e senha são obrigatórios'
      });
    }
    
    // Verificar credenciais
    const loginResult = await instagramService.checkCredentials(username, password);
    
    if (!loginResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        error: loginResult.error
      });
    }
    
    // Salvar ou atualizar token no banco de dados
    let instagramToken = await InstagramToken.findOne({ user: req.user._id });
    
    if (instagramToken) {
      instagramToken.username = username;
      instagramToken.password = password; // Será criptografada pelo middleware pre-save
      instagramToken.lastVerified = new Date();
      instagramToken.status = 'active';
      instagramToken.profile = loginResult.user;
      instagramToken.updatedAt = Date.now();
    } else {
      instagramToken = new InstagramToken({
        user: req.user._id,
        username,
        password, // Será criptografada pelo middleware pre-save
        lastVerified: new Date(),
        status: 'active',
        profile: loginResult.user
      });
    }
    
    await instagramToken.save();
    
    res.json({
      success: true,
      message: 'Conectado ao Instagram com sucesso',
      profile: loginResult.user
    });
  } catch (error) {
    console.error('Erro ao conectar ao Instagram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao conectar ao Instagram',
      error: error.message
    });
  }
};

/**
 * Desconecta do Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.disconnect = async (req, res) => {
  try {
    // Usar o gerenciador de tokens para revogar o token
    const result = await tokenManager.revokeToken('instagram', req.user._id);
    
    if (result.success) {
      // Atualizar status de conexão no usuário
      await User.findByIdAndUpdate(req.user._id, {
        'socialConnections.instagram.connected': false
      });
      
      res.json({
        success: true,
        message: 'Desconectado do Instagram com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erro ao desconectar do Instagram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar do Instagram',
      error: error.message
    });
  }
};

/**
 * Publica uma imagem no Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.publishPhoto = async (req, res) => {
  try {
    // Verificar se há um arquivo de imagem
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem fornecida'
      });
    }
    
    const imageFile = req.files.image;
    
    // Verificar se é uma imagem válida
    if (!isValidImageFile(imageFile)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de arquivo inválido. Envie uma imagem válida (JPG, PNG)'
      });
    }
    
    // Buscar credenciais do Instagram (incluindo senha criptografada)
    const instagramToken = await InstagramToken.findOne({ user: req.user._id }).select('+password');
    
    if (!instagramToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao Instagram'
      });
    }
    
    // Verificar status do token
    if (instagramToken.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Credenciais do Instagram inválidas ou pendentes de verificação'
      });
    }
    
    // Fazer login no Instagram usando serviço atualizado que trabalha com senha criptografada
    const loginResult = await instagramService.loginWithToken(instagramToken);
    
    if (!loginResult.success) {
      // Atualizar status do token se o login falhar
      instagramToken.status = 'invalid';
      instagramToken.lastVerified = new Date();
      await instagramToken.save();
      
      return res.status(401).json({
        success: false,
        message: 'Falha ao autenticar no Instagram',
        error: loginResult.error
      });
    }
    
    // Publicar foto
    const caption = req.body.caption || '';
    const publishResult = await instagramService.publishPhoto(imageFile.tempFilePath, caption);
    
    // Remover arquivo temporário
    await unlinkAsync(imageFile.tempFilePath);
    
    if (!publishResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao publicar foto',
        error: publishResult.error
      });
    }
    
    // Atualizar status de verificação
    instagramToken.lastVerified = new Date();
    instagramToken.status = 'active';
    await instagramToken.save();
    
    res.status(201).json({
      success: true,
      message: 'Foto publicada com sucesso',
      mediaId: publishResult.mediaId,
      url: `https://instagram.com/p/${publishResult.code}/`
    });
  } catch (error) {
    console.error('Erro ao publicar foto no Instagram:', error);
    
    // Remover arquivo temporário em caso de erro
    if (req.files && req.files.image && req.files.image.tempFilePath) {
      try {
        await unlinkAsync(req.files.image.tempFilePath);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo temporário:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao publicar foto no Instagram',
      error: error.message
    });
  }
};

/**
 * Obtém métricas do Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getMetrics = async (req, res) => {
  try {
    // Usar o gerenciador de tokens para obter e verificar o token
    const token = await tokenManager.getToken('instagram', req.user._id);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao Instagram'
      });
    }
    
    // Verificar e renovar o token se necessário
    const verificationResult = await tokenManager.verifyAndRefreshToken('instagram', token);
    
    if (!verificationResult.connected) {
      return res.status(401).json({
        success: false,
        message: 'Erro na conexão com Instagram. Status: ' + verificationResult.status,
        status: verificationResult.status,
        error: verificationResult.error
      });
    }
    
    // Obter o token atualizado
    const tokenWithSecrets = await tokenManager.getToken('instagram', req.user._id, true);
    
    if (!tokenWithSecrets) {
      return res.status(401).json({
        success: false,
        message: 'Token não encontrado após atualização'
      });
    }
    
    // Obter o token descriptografado
    const decryptedTokens = tokenWithSecrets.getDecryptedTokens();
    
    // Obter insights usando o access_token descriptografado
    const insights = await instagramService.getInsights(decryptedTokens.access_token);
    
    if (!insights.success) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter métricas',
        error: insights.error
      });
    }
    
    // Atualizar status de verificação e uso
    tokenWithSecrets.lastVerified = new Date();
    tokenWithSecrets.last_used = Date.now();
    await tokenWithSecrets.save();
    
    // Atualizar status de conexão no usuário
    await User.findByIdAndUpdate(req.user._id, {
      'socialConnections.instagram.lastConnected': new Date()
    });
    
    res.json({
      success: true,
      refreshed: verificationResult.status === 'refreshed',
      data: insights.data
    });
  } catch (error) {
    console.error('Erro ao obter métricas do Instagram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas do Instagram',
      error: error.message
    });
  }
};

/**
 * Verifica as credenciais do Instagram
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.verifyCredentials = async (req, res) => {
  try {
    const instagramToken = await InstagramToken.findOne({ user: req.user._id }).select('+password');
    
    if (!instagramToken) {
      return res.status(404).json({
        success: false,
        message: 'Credenciais não encontradas'
      });
    }
    
    // Tentar login com token
    const loginResult = await instagramService.loginWithToken(instagramToken);
    
    // Atualizar status de verificação
    instagramToken.lastVerified = new Date();
    instagramToken.status = loginResult.success ? 'active' : 'invalid';
    await instagramToken.save();
    
    res.json({
      success: true,
      verified: loginResult.success,
      lastVerified: instagramToken.lastVerified,
      status: instagramToken.status
    });
  } catch (error) {
    console.error('Erro ao verificar credenciais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar credenciais',
      error: error.message
    });
  }
};