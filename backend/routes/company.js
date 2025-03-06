const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Esqueleto do controlador para empresas
const companyController = {
  // Obter todas as empresas
  getCompanies: async (req, res) => {
    try {
      const Company = require('../models/Company');
      const companies = await Company.find().select('-oauthCredentials');
      
      res.json({
        success: true,
        count: companies.length,
        data: companies
      });
    } catch (error) {
      console.error('Erro ao obter empresas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar empresas',
        error: error.message
      });
    }
  },
  
  // Obter empresa por ID
  getCompany: async (req, res) => {
    try {
      const Company = require('../models/Company');
      const company = await Company.findById(req.params.id).select('-oauthCredentials');
      
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Empresa não encontrada'
        });
      }
      
      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Erro ao obter empresa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar empresa',
        error: error.message
      });
    }
  },
  
  // Criar nova empresa
  createCompany: async (req, res) => {
    try {
      const { name, slug, website } = req.body;
      
      const Company = require('../models/Company');
      
      // Verificar se já existe empresa com este slug
      const existingCompany = await Company.findOne({ slug });
      if (existingCompany) {
        return res.status(400).json({
          success: false,
          message: 'Já existe uma empresa com este slug'
        });
      }
      
      const company = await Company.create({
        name,
        slug,
        website
      });
      
      res.status(201).json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar empresa',
        error: error.message
      });
    }
  },
  
  // Atualizar empresa
  updateCompany: async (req, res) => {
    try {
      const { name, website, logo } = req.body;
      
      const Company = require('../models/Company');
      
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Empresa não encontrada'
        });
      }
      
      // Atualizar campos básicos
      if (name) company.name = name;
      if (website) company.website = website;
      if (logo) company.logo = logo;
      
      company.updatedAt = Date.now();
      await company.save();
      
      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar empresa',
        error: error.message
      });
    }
  },
  
  // Atualizar credenciais OAuth de uma plataforma
  updateOAuthCredentials: async (req, res) => {
    try {
      const { platform } = req.params;
      const { client_id, client_secret, redirect_uri, enabled } = req.body;
      
      // Validar plataforma
      const validPlatforms = ['youtube', 'twitter', 'linkedin', 'instagram', 'spotify', 'tiktok'];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma inválida'
        });
      }
      
      const Company = require('../models/Company');
      
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Empresa não encontrada'
        });
      }
      
      // Inicializar estrutura de credenciais se não existir
      if (!company.oauthCredentials) {
        company.oauthCredentials = {};
      }
      
      if (!company.oauthCredentials[platform]) {
        company.oauthCredentials[platform] = {};
      }
      
      // Atualizar credenciais da plataforma
      const credentialsPath = `oauthCredentials.${platform}`;
      
      // Tratamento específico por plataforma
      switch (platform) {
        case 'youtube':
        case 'linkedin':
        case 'instagram':
        case 'spotify':
          if (client_id !== undefined) company.oauthCredentials[platform].client_id = client_id;
          if (client_secret !== undefined) company.oauthCredentials[platform].client_secret = client_secret;
          if (redirect_uri !== undefined) company.oauthCredentials[platform].redirect_uri = redirect_uri;
          if (enabled !== undefined) company.oauthCredentials[platform].enabled = enabled;
          break;
        case 'twitter':
          if (req.body.api_key !== undefined) company.oauthCredentials[platform].api_key = req.body.api_key;
          if (req.body.api_secret !== undefined) company.oauthCredentials[platform].api_secret = req.body.api_secret;
          if (redirect_uri !== undefined) company.oauthCredentials[platform].redirect_uri = redirect_uri;
          if (enabled !== undefined) company.oauthCredentials[platform].enabled = enabled;
          break;
        case 'tiktok':
          if (req.body.client_key !== undefined) company.oauthCredentials[platform].client_key = req.body.client_key;
          if (client_secret !== undefined) company.oauthCredentials[platform].client_secret = client_secret;
          if (redirect_uri !== undefined) company.oauthCredentials[platform].redirect_uri = redirect_uri;
          if (enabled !== undefined) company.oauthCredentials[platform].enabled = enabled;
          break;
      }
      
      company.markModified('oauthCredentials');
      company.updatedAt = Date.now();
      await company.save();
      
      res.json({
        success: true,
        message: `Credenciais de ${platform} atualizadas com sucesso`
      });
    } catch (error) {
      console.error('Erro ao atualizar credenciais:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar credenciais OAuth',
        error: error.message
      });
    }
  },
  
  // Verificar status de integração de uma plataforma
  checkPlatformIntegration: async (req, res) => {
    try {
      const { platform } = req.params;
      
      // Validar plataforma
      const validPlatforms = ['youtube', 'twitter', 'linkedin', 'instagram', 'spotify', 'tiktok'];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({
          success: false,
          message: 'Plataforma inválida'
        });
      }
      
      const Company = require('../models/Company');
      
      const company = await Company.findById(req.params.id);
      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Empresa não encontrada'
        });
      }
      
      // Verificar se a empresa tem credenciais configuradas para esta plataforma
      const hasIntegration = company.oauthCredentials && 
                          company.oauthCredentials[platform] && 
                          company.oauthCredentials[platform].enabled;
      
      // Obter número de usuários conectados a esta plataforma
      const tokenModelMap = {
        youtube: 'YouTubeToken',
        twitter: 'TwitterToken',
        linkedin: 'LinkedInToken',
        instagram: 'InstagramToken',
        spotify: 'SpotifyToken',
        tiktok: 'TikTokToken'
      };
      
      let connectedUsersCount = 0;
      
      try {
        const TokenModel = require(`../models/${tokenModelMap[platform]}`);
        connectedUsersCount = await TokenModel.countDocuments({ 
          company: company._id,
          is_valid: true
        });
      } catch (err) {
        console.log(`Modelo de token para ${platform} não encontrado ou erro ao contar`);
      }
      
      res.json({
        success: true,
        data: {
          platform,
          hasIntegration,
          isEnabled: hasIntegration,
          redirectUri: hasIntegration ? company.oauthCredentials[platform].redirect_uri : null,
          connectedUsers: connectedUsersCount
        }
      });
    } catch (error) {
      console.error('Erro ao verificar integração:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao verificar integração',
        error: error.message
      });
    }
  }
};

// Rotas
router.get('/', protect, authorize('admin'), companyController.getCompanies);
router.get('/:id', protect, companyController.getCompany);
router.post('/', protect, authorize('admin'), companyController.createCompany);
router.put('/:id', protect, authorize('admin'), companyController.updateCompany);
router.put('/:id/oauth/:platform', protect, authorize('admin'), companyController.updateOAuthCredentials);
router.get('/:id/integration/:platform', protect, companyController.checkPlatformIntegration);

module.exports = router;