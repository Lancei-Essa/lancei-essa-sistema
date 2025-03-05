const twitterService = require('../services/platforms/twitter');
const TwitterToken = require('../models/TwitterToken');

/**
 * Agenda um tweet para publicação futura
 * @route POST /api/twitter/schedule
 */
exports.scheduleTweet = async (req, res) => {
  try {
    const { text, scheduledTime, mediaId } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'O texto do tweet é obrigatório'
      });
    }
    
    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'A data e hora de agendamento são obrigatórias'
      });
    }
    
    // Validar a data de agendamento (deve ser no futuro)
    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'A data de agendamento deve ser válida e no futuro'
      });
    }
    
    // Limitar o texto a 280 caracteres (limite do Twitter)
    if (text.length > 280) {
      return res.status(400).json({
        success: false,
        message: 'O texto do tweet não pode exceder 280 caracteres'
      });
    }
    
    // Obter token do Twitter
    const twitterToken = await TwitterToken.findOne({ user: req.user._id });
    
    if (!twitterToken) {
      return res.status(401).json({
        success: false,
        message: 'Você não está autenticado no Twitter'
      });
    }
    
    // Verificar se o token expirou
    if (twitterToken.isExpired()) {
      return res.status(401).json({
        success: false,
        message: 'Sua autenticação com o Twitter expirou, reconecte-se'
      });
    }
    
    // Agendar tweet
    const scheduleResult = await twitterService.scheduleTweet(
      twitterToken.oauth_token,
      twitterToken.oauth_token_secret,
      text,
      scheduledDate,
      mediaId || null
    );
    
    res.status(201).json({
      success: true,
      message: 'Tweet agendado com sucesso',
      data: {
        id: scheduleResult.scheduled_id,
        text: scheduleResult.text,
        scheduledTime: scheduleResult.scheduled_time,
        status: scheduleResult.status
      }
    });
  } catch (error) {
    console.error('Erro ao agendar tweet:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao agendar tweet', 
      error: error.message 
    });
  }
};