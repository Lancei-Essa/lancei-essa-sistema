const Episode = require('../models/Episode');

// @desc    Criar novo episódio
// @route   POST /api/episodes
// @access  Private
exports.createEpisode = async (req, res) => {
  try {
    const episodeData = { ...req.body, createdBy: req.user._id };
    
    const episode = await Episode.create(episodeData);
    
    res.status(201).json({
      success: true,
      data: episode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar episódio',
      error: error.message
    });
  }
};

// @desc    Obter todos os episódios
// @route   GET /api/episodes
// @access  Private
exports.getEpisodes = async (req, res) => {
  try {
    // Implementar filtros e paginação posteriormente
    const episodes = await Episode.find().sort({ number: -1 });
    
    res.json({
      success: true,
      count: episodes.length,
      data: episodes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter episódios',
      error: error.message
    });
  }
};

// @desc    Obter um episódio específico
// @route   GET /api/episodes/:id
// @access  Private
exports.getEpisode = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episódio não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: episode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter episódio',
      error: error.message
    });
  }
};

// @desc    Atualizar um episódio
// @route   PUT /api/episodes/:id
// @access  Private
exports.updateEpisode = async (req, res) => {
  try {
    let episode = await Episode.findById(req.params.id);
    
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episódio não encontrado'
      });
    }
    
    // Adicionar verificação de permissão posteriormente
    
    episode = await Episode.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: Date.now() }, 
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: episode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar episódio',
      error: error.message
    });
  }
};

// @desc    Excluir um episódio
// @route   DELETE /api/episodes/:id
// @access  Private
exports.deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episódio não encontrado'
      });
    }
    
    // Adicionar verificação de permissão posteriormente
    
    await episode.remove();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir episódio',
      error: error.message
    });
  }
};