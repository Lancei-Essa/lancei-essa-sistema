const LinkedInToken = require('../models/LinkedInToken');
const User = require('../models/User');
const linkedinService = require('../services/platforms/linkedin');
const { isValidImageFile } = require('../middleware/fileUpload');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const jwt = require('jsonwebtoken');

// Configurações do OAuth do LinkedIn
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5000/api/linkedin/callback';

/**
 * Retorna a URL de autorização OAuth do LinkedIn
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getAuthUrl = async (req, res) => {
  try {
    if (!LINKEDIN_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Configuração do LinkedIn não encontrada no servidor'
      });
    }
    
    // Gerar URL de autorização
    const state = crypto.randomBytes(16).toString('hex');
    const scope = 'r_liteprofile r_emailaddress w_member_social';
    
    // Armazenar estado e ID do usuário na sessão
    if (req.session) {
      req.session.linkedinOAuthState = state;
      req.session.linkedinOAuthUserId = req.user._id;
    }
    
    // Construir URL de autorização
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Erro ao gerar URL de autorização LinkedIn:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de autorização',
      error: error.message
    });
  }
};

/**
 * Inicia o processo de autorização OAuth com LinkedIn
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.initiateAuth = async (req, res) => {
  try {
    if (!LINKEDIN_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: 'Configuração do LinkedIn não encontrada no servidor'
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
    
    // Gerar URL de autorização
    const state = crypto.randomBytes(16).toString('hex');
    const scope = 'r_liteprofile r_emailaddress w_member_social';
    
    // Armazenar estado e ID do usuário na sessão
    if (req.session) {
      req.session.linkedinOAuthState = state;
      if (userId) {
        req.session.linkedinOAuthUserId = userId;
      }
    }
    
    // Construir URL de autorização
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    
    // Redirecionar para a página de autorização do LinkedIn
    res.redirect(authUrl);
  } catch (error) {
    console.error('Erro ao iniciar autenticação com LinkedIn:', error);
    res.status(500).send('Erro ao iniciar autenticação com LinkedIn: ' + error.message);
  }
};

/**
 * Processa o callback de autorização do LinkedIn
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.handleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Código de autorização não fornecido');
    }
    
    // Verificar estado de OAuth para segurança
    if (req.session && req.session.linkedinOAuthState !== state) {
      return res.status(403).send('Estado de OAuth inválido');
    }
    
    // Obter o userId da sessão
    const userId = req.session ? req.session.linkedinOAuthUserId : null;
    
    if (!userId) {
      return res.status(400).send('Sessão de autorização expirada ou inválida');
    }
    
    // Trocar o código de autorização por um token de acesso
    const tokenResponse = await linkedinService.exchangeCodeForToken(
      code, 
      LINKEDIN_CLIENT_ID, 
      LINKEDIN_CLIENT_SECRET, 
      LINKEDIN_REDIRECT_URI
    );
    
    if (!tokenResponse.success) {
      return res.status(500).send('Erro ao obter token de acesso: ' + tokenResponse.error);
    }
    
    // Calcular data de expiração
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokenResponse.expires_in);
    
    // Obter informações do perfil
    const profileResponse = await linkedinService.getProfile(tokenResponse.access_token);
    
    if (!profileResponse.success) {
      return res.status(500).send('Erro ao obter informações do perfil: ' + profileResponse.error);
    }
    
    // Salvar ou atualizar token no banco de dados
    let linkedinToken = await LinkedInToken.findOne({ user: userId });
    
    const profileData = profileResponse.data;
    
    if (linkedinToken) {
      linkedinToken.access_token = tokenResponse.access_token;
      linkedinToken.refresh_token = tokenResponse.refresh_token || null;
      linkedinToken.expires_in = tokenResponse.expires_in;
      linkedinToken.expiry_date = expiryDate;
      linkedinToken.scope = tokenResponse.scope;
      linkedinToken.status = 'active';
      linkedinToken.profile = {
        id: profileData.id,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        profilePicture: profileData.profilePicture,
        email: profileData.email,
        headline: profileData.headline,
        vanityName: profileData.vanityName
      };
      linkedinToken.updatedAt = Date.now();
    } else {
      linkedinToken = new LinkedInToken({
        user: userId,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        expires_in: tokenResponse.expires_in,
        expiry_date: expiryDate,
        scope: tokenResponse.scope,
        status: 'active',
        profile: {
          id: profileData.id,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          profilePicture: profileData.profilePicture,
          email: profileData.email,
          headline: profileData.headline,
          vanityName: profileData.vanityName
        }
      });
    }
    
    await linkedinToken.save();
    
    // Atualizar status de conexão no usuário
    await User.findByIdAndUpdate(userId, {
      'socialConnections.linkedin.connected': true,
      'socialConnections.linkedin.lastConnected': new Date()
    });
    
    // Limpar a sessão
    if (req.session) {
      delete req.session.linkedinOAuthState;
      delete req.session.linkedinOAuthUserId;
    }
    
    // Redirecionar para a página de sucesso
    res.redirect('/social-media?platform=linkedin&status=success');
  } catch (error) {
    console.error('Erro no callback do LinkedIn:', error);
    res.status(500).send('Erro ao processar autenticação do LinkedIn: ' + error.message);
  }
};

/**
 * Verifica se o usuário está conectado ao LinkedIn
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.checkConnection = async (req, res) => {
  try {
    const linkedinToken = await LinkedInToken.findOne({ user: req.user._id });
    
    if (!linkedinToken) {
      return res.json({
        success: true,
        connected: false
      });
    }
    
    // Verificar se o token expirou
    const expired = linkedinToken.isExpired();
    
    // No LinkedIn, se o token expirou, precisamos redirecionar para autenticação novamente
    // já que os tokens de refresh são opcionais
    if (expired) {
      if (linkedinToken.refresh_token) {
        try {
          // Tentar renovar o token
          const renewResponse = await linkedinService.refreshToken(
            linkedinToken.refresh_token,
            LINKEDIN_CLIENT_ID,
            LINKEDIN_CLIENT_SECRET
          );
          
          if (renewResponse.success) {
            // Atualizar token no banco de dados
            const expiryDate = new Date();
            expiryDate.setSeconds(expiryDate.getSeconds() + renewResponse.expires_in);
            
            linkedinToken.access_token = renewResponse.access_token;
            linkedinToken.refresh_token = renewResponse.refresh_token || linkedinToken.refresh_token;
            linkedinToken.expires_in = renewResponse.expires_in;
            linkedinToken.expiry_date = expiryDate;
            linkedinToken.status = 'active';
            linkedinToken.updatedAt = Date.now();
            
            await linkedinToken.save();
            
            // Atualizar status de conexão no usuário
            await User.findByIdAndUpdate(req.user._id, {
              'socialConnections.linkedin.lastConnected': new Date()
            });
            
            return res.json({
              success: true,
              connected: true,
              refreshed: true,
              profile: linkedinToken.profile
            });
          }
        } catch (renewError) {
          console.error('Erro ao renovar token do LinkedIn:', renewError);
        }
      }
      
      return res.json({
        success: true,
        connected: true,
        expired: true,
        profile: linkedinToken.profile
      });
    }
    
    res.json({
      success: true,
      connected: true,
      profile: linkedinToken.profile
    });
  } catch (error) {
    console.error('Erro ao verificar conexão com LinkedIn:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar conexão com LinkedIn',
      error: error.message
    });
  }
};

/**
 * Desconecta do LinkedIn
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.disconnect = async (req, res) => {
  try {
    // Buscar token do LinkedIn
    const linkedinToken = await LinkedInToken.findOne({ user: req.user._id });
    
    if (linkedinToken) {
      // O LinkedIn não oferece endpoint de revogação padrão, então só excluímos do banco
      await LinkedInToken.findOneAndDelete({ user: req.user._id });
    }
    
    // Atualizar status de conexão no usuário
    await User.findByIdAndUpdate(req.user._id, {
      'socialConnections.linkedin.connected': false
    });
    
    res.json({
      success: true,
      message: 'Desconectado do LinkedIn com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar do LinkedIn:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar do LinkedIn',
      error: error.message
    });
  }
};

/**
 * Compartilha conteúdo no LinkedIn
 * @route POST /api/linkedin/share
 */
exports.shareContent = async (req, res) => {
  try {
    // Verificar se o usuário está conectado
    const linkedinToken = await LinkedInToken.findOne({ user: req.user._id });
    
    if (!linkedinToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao LinkedIn'
      });
    }
    
    // Verificar se o token expirou
    if (linkedinToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua conexão com o LinkedIn expirou. Por favor, conecte-se novamente.'
      });
    }
    
    // Dados da publicação
    const content = {
      contentType: req.body.contentType || 'text',
      title: req.body.title,
      description: req.body.description,
      mediaUrl: req.body.mediaUrl,
      thumbnailUrl: req.body.thumbnailUrl,
      authorId: linkedinToken.profile.id
    };
    
    // Compartilhar conteúdo
    const result = await linkedinService.shareContent(linkedinToken.access_token, content);
    
    res.status(201).json({
      success: true,
      message: 'Conteúdo compartilhado com sucesso no LinkedIn',
      shareId: result.id,
      url: `https://www.linkedin.com/feed/update/${result.id}`
    });
  } catch (error) {
    console.error('Erro ao compartilhar no LinkedIn:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao compartilhar no LinkedIn',
      error: error.message
    });
  }
};

/**
 * Compartilha imagem no LinkedIn
 * @route POST /api/linkedin/share/image
 */
exports.shareImage = async (req, res) => {
  try {
    // Verificar se há um arquivo de imagem
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo de imagem fornecido'
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
    
    // Verificar se o usuário está conectado
    const linkedinToken = await LinkedInToken.findOne({ user: req.user._id });
    
    if (!linkedinToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao LinkedIn'
      });
    }
    
    // Verificar se o token expirou
    if (linkedinToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua conexão com o LinkedIn expirou. Por favor, conecte-se novamente.'
      });
    }
    
    try {
      // Ler o arquivo
      const imageData = await fs.promises.readFile(imageFile.tempFilePath);
      
      // Compartilhar imagem no LinkedIn
      const result = await linkedinService.shareImage(
        linkedinToken.access_token,
        imageData,
        req.body.text || '',
        req.body.title || 'Compartilhado via Lancei Essa'
      );
    
    // Limpar arquivo temporário
    await unlinkAsync(imageFile.tempFilePath);
    
    res.status(201).json({
      success: true,
      message: 'Imagem compartilhada com sucesso no LinkedIn',
      shareId: result.id,
      url: `https://www.linkedin.com/feed/update/${result.id}`
    });
  } catch (error) {
    console.error('Erro ao compartilhar imagem no LinkedIn:', error);
    
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
      message: 'Erro ao compartilhar imagem no LinkedIn',
      error: error.message
    });
  }
};

/**
 * Obtém métricas de uma publicação
 * @route GET /api/linkedin/metrics/:shareId
 */
exports.getMetrics = async (req, res) => {
  try {
    const { shareId } = req.params;
    
    // Verificar se o usuário está conectado
    const linkedinToken = await LinkedInToken.findOne({ user: req.user._id });
    
    if (!linkedinToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está conectado ao LinkedIn'
      });
    }
    
    // Verificar se o token expirou
    if (linkedinToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua conexão com o LinkedIn expirou. Por favor, conecte-se novamente.'
      });
    }
    
    // Obter métricas da publicação
    try {
      const metrics = await linkedinService.getPostMetrics(linkedinToken.access_token, shareId);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Erro ao obter métricas do LinkedIn:', error);
      res.status(500).json({
        success: false,
        message: 'Não foi possível obter as métricas do LinkedIn',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Erro ao obter métricas do LinkedIn:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas do LinkedIn',
      error: error.message
    });
  }
};