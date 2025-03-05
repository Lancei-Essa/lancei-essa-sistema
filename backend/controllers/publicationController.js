const Publication = require('../models/Publication');
const publicationScheduler = require('../services/scheduler/publicationScheduler');

// @desc    Criar nova publicação
// @route   POST /api/publications
// @access  Private
exports.createPublication = async (req, res) => {
  try {
    const publicationData = { 
      ...req.body, 
      createdBy: req.user._id 
    };
    
    const publication = await Publication.create(publicationData);
    
    res.status(201).json({
      success: true,
      data: publication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar publicação',
      error: error.message
    });
  }
};

// @desc    Obter todas as publicações
// @route   GET /api/publications
// @access  Private
exports.getPublications = async (req, res) => {
  try {
    const publications = await Publication.find()
      .populate('episode', 'title number')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: publications.length,
      data: publications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter publicações',
      error: error.message
    });
  }
};

// @desc    Obter uma publicação específica
// @route   GET /api/publications/:id
// @access  Private
exports.getPublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id)
      .populate('episode', 'title number')
      .populate('createdBy', 'name email');
    
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publicação não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: publication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter publicação',
      error: error.message
    });
  }
};

// @desc    Atualizar uma publicação
// @route   PUT /api/publications/:id
// @access  Private
exports.updatePublication = async (req, res) => {
  try {
    let publication = await Publication.findById(req.params.id);
    
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publicação não encontrada'
      });
    }
    
    publication = await Publication.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: Date.now() }, 
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: publication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar publicação',
      error: error.message
    });
  }
};

// @desc    Excluir uma publicação
// @route   DELETE /api/publications/:id
// @access  Private
exports.deletePublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publicação não encontrada'
      });
    }
    
    await publication.remove();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir publicação',
      error: error.message
    });
  }
};

// @desc    Atualizar métricas de uma publicação
// @route   PATCH /api/publications/:id/metrics
// @access  Private
exports.updatePublicationMetrics = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publicação não encontrada'
      });
    }
    
    publication.metrics = {
      ...publication.metrics,
      ...req.body.metrics,
      lastUpdated: Date.now()
    };
    
    await publication.save();
    
    res.json({
      success: true,
      data: publication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar métricas',
      error: error.message
    });
  }
};

// @desc    Publicar imediatamente
// @route   POST /api/publications/:id/publish
// @access  Private
exports.publishNow = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id)
      .populate('episode');
    
    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publicação não encontrada'
      });
    }
    
    // Não pode publicar uma publicação já publicada
    if (publication.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Esta publicação já foi publicada'
      });
    }
    
    // Tentar publicar
    try {
      const result = await publicationScheduler.publishContent(publication);
      
      res.json({
        success: true,
        message: 'Publicação realizada com sucesso',
        data: {
          publication: publication,
          result: result
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao publicar conteúdo',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Erro ao publicar:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao publicar',
      error: error.message
    });
  }
};

// @desc    Testar uma publicação sem salvar
// @route   POST /api/publications/test
// @access  Private
exports.testPublication = async (req, res) => {
  try {
    const publicationData = req.body;
    
    // Validações básicas
    if (!publicationData.platform) {
      return res.status(400).json({
        success: false,
        message: 'Plataforma é obrigatória'
      });
    }
    
    // Executar teste
    const result = await publicationScheduler.testPublish(publicationData);
    
    res.json({
      success: true,
      message: 'Teste realizado com sucesso',
      data: result
    });
  } catch (error) {
    console.error('Erro ao testar publicação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar publicação',
      error: error.message
    });
  }
};