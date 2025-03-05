const Publication = require('../models/Publication');
const Episode = require('../models/Episode');

/**
 * Agenda múltiplas publicações ao mesmo tempo
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.bulkSchedule = async (req, res) => {
  try {
    const { episodeId, publications } = req.body;
    
    if (!episodeId || !publications || !Array.isArray(publications) || publications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos. Forneça um ID de episódio e um array de publicações.'
      });
    }
    
    // Verificar se o episódio existe
    const episode = await Episode.findById(episodeId);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episódio não encontrado'
      });
    }
    
    // Verificar se o usuário tem permissão para acessar este episódio
    // (implementação futura de controle de acesso)
    
    // Processar cada publicação
    const scheduledPublications = [];
    const failedPublications = [];
    
    for (const pub of publications) {
      try {
        // Validar dados
        if (!pub.platform || !pub.contentType || !pub.scheduledFor) {
          failedPublications.push({
            publication: pub,
            error: 'Dados incompletos. Platform, contentType e scheduledFor são obrigatórios.'
          });
          continue;
        }
        
        // Criar nova publicação
        const newPublication = new Publication({
          episode: episodeId,
          platform: pub.platform,
          contentType: pub.contentType,
          content: {
            title: pub.content?.title || '',
            description: pub.content?.description || '',
            mediaUrl: pub.content?.mediaUrl || '',
            thumbnailUrl: pub.content?.thumbnailUrl || ''
          },
          scheduledFor: new Date(pub.scheduledFor),
          status: 'scheduled',
          createdBy: req.user._id
        });
        
        // Salvar no banco de dados
        await newPublication.save();
        scheduledPublications.push(newPublication);
      } catch (error) {
        failedPublications.push({
          publication: pub,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `${scheduledPublications.length} publicações agendadas com sucesso. ${failedPublications.length} falhas.`,
      data: {
        scheduled: scheduledPublications,
        failed: failedPublications
      }
    });
  } catch (error) {
    console.error('Erro ao agendar publicações em massa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao agendar publicações em massa',
      error: error.message
    });
  }
};

/**
 * Obtém padrões de agendamento recomendados
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.getSchedulePatterns = async (req, res) => {
  try {
    // Padrões predefinidos para diferentes tipos de conteúdo
    const schedulePatterns = [
      {
        name: 'Padrão para Podcast',
        description: 'Agendamento ideal para lançamento de episódios de podcast',
        platforms: ['youtube', 'instagram', 'linkedin', 'twitter'],
        schedule: [
          {
            platform: 'instagram',
            contentType: 'image',
            timing: 'day_before',
            timeOfDay: '18:00',
            description: 'Teaser do episódio no Instagram'
          },
          {
            platform: 'youtube',
            contentType: 'full_episode',
            timing: 'release_day',
            timeOfDay: '10:00',
            description: 'Episódio completo no YouTube'
          },
          {
            platform: 'instagram',
            contentType: 'clip',
            timing: 'day_after',
            timeOfDay: '12:00',
            description: 'Clipe do episódio no Instagram'
          },
          {
            platform: 'linkedin',
            contentType: 'text',
            timing: 'release_day',
            timeOfDay: '14:00',
            description: 'Resumo do episódio no LinkedIn'
          }
        ]
      },
      {
        name: 'Padrão para Entrevista',
        description: 'Agendamento ideal para episódios com convidados',
        platforms: ['youtube', 'instagram', 'twitter'],
        schedule: [
          {
            platform: 'instagram',
            contentType: 'image',
            timing: 'two_days_before',
            timeOfDay: '18:00',
            description: 'Anúncio do convidado no Instagram'
          },
          {
            platform: 'twitter',
            contentType: 'text',
            timing: 'day_before',
            timeOfDay: '15:00',
            description: 'Teaser da entrevista no Twitter'
          },
          {
            platform: 'youtube',
            contentType: 'full_episode',
            timing: 'release_day',
            timeOfDay: '10:00',
            description: 'Entrevista completa no YouTube'
          },
          {
            platform: 'instagram',
            contentType: 'clip',
            timing: 'same_day',
            timeOfDay: '17:00',
            description: 'Momento destaque da entrevista no Instagram'
          }
        ]
      },
      {
        name: 'Cronograma Semanal',
        description: 'Publicações distribuídas ao longo da semana',
        platforms: ['youtube', 'instagram', 'linkedin', 'twitter', 'facebook'],
        schedule: [
          {
            platform: 'instagram',
            contentType: 'image',
            timing: 'monday',
            timeOfDay: '12:00',
            description: 'Anúncio da semana no Instagram'
          },
          {
            platform: 'youtube',
            contentType: 'full_episode',
            timing: 'wednesday',
            timeOfDay: '10:00',
            description: 'Episódio completo no YouTube'
          },
          {
            platform: 'linkedin',
            contentType: 'text',
            timing: 'thursday',
            timeOfDay: '14:00',
            description: 'Discussão profissional no LinkedIn'
          },
          {
            platform: 'instagram',
            contentType: 'clip',
            timing: 'friday',
            timeOfDay: '17:00',
            description: 'Clipe do episódio no Instagram'
          }
        ]
      }
    ];
    
    res.json({
      success: true,
      data: schedulePatterns
    });
  } catch (error) {
    console.error('Erro ao obter padrões de agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter padrões de agendamento',
      error: error.message
    });
  }
};

/**
 * Gera agendamentos com base em um padrão e uma data de lançamento
 * @param {Object} req - Requisição Express
 * @param {Object} res - Resposta Express
 */
exports.generateScheduleFromPattern = async (req, res) => {
  try {
    const { episodeId, patternId, releaseDate } = req.body;
    
    if (!episodeId || !patternId || !releaseDate) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos. Forneça episodeId, patternId e releaseDate.'
      });
    }
    
    // Verificar se o episódio existe
    const episode = await Episode.findById(episodeId);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: 'Episódio não encontrado'
      });
    }
    
    // Em uma implementação real, buscaríamos o padrão do banco de dados
    // Aqui, vamos simular obtendo os padrões de nosso método anterior
    const patterns = (await this.getSchedulePatterns(req, { json: (data) => data })).data;
    const selectedPattern = patterns.find(p => p.name === patternId) || patterns[0];
    
    if (!selectedPattern) {
      return res.status(404).json({
        success: false,
        message: 'Padrão de agendamento não encontrado'
      });
    }
    
    // Converter data de lançamento para objeto Date
    const releaseDateObj = new Date(releaseDate);
    
    // Gerar datas para cada publicação com base no padrão
    const scheduledPublications = [];
    
    for (const item of selectedPattern.schedule) {
      const scheduledDate = calculateDateFromPattern(releaseDateObj, item.timing, item.timeOfDay);
      
      const publication = {
        episode: episodeId,
        platform: item.platform,
        contentType: item.contentType,
        content: {
          title: episode.title,
          description: item.description || episode.description
        },
        scheduledFor: scheduledDate,
        status: 'draft',
        createdBy: req.user._id
      };
      
      scheduledPublications.push(publication);
    }
    
    res.json({
      success: true,
      message: 'Agendamento gerado com sucesso',
      data: {
        pattern: selectedPattern.name,
        publications: scheduledPublications
      }
    });
  } catch (error) {
    console.error('Erro ao gerar agendamento a partir de padrão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar agendamento a partir de padrão',
      error: error.message
    });
  }
};

/**
 * Função auxiliar para calcular a data de agendamento com base no padrão
 * @param {Date} releaseDate - Data de lançamento
 * @param {string} timing - Tipo de timing (ex: day_before, release_day)
 * @param {string} timeOfDay - Horário no formato HH:MM
 * @returns {Date} Data calculada
 */
function calculateDateFromPattern(releaseDate, timing, timeOfDay) {
  const date = new Date(releaseDate);
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  
  // Definir horário
  date.setHours(hours, minutes, 0, 0);
  
  // Ajustar data com base no timing
  switch (timing) {
    case 'two_days_before':
      date.setDate(date.getDate() - 2);
      break;
    case 'day_before':
      date.setDate(date.getDate() - 1);
      break;
    case 'release_day':
    case 'same_day':
      // Não modifica o dia
      break;
    case 'day_after':
      date.setDate(date.getDate() + 1);
      break;
    case 'two_days_after':
      date.setDate(date.getDate() + 2);
      break;
    case 'monday':
      date.setDate(date.getDate() - date.getDay() + 1);
      break;
    case 'tuesday':
      date.setDate(date.getDate() - date.getDay() + 2);
      break;
    case 'wednesday':
      date.setDate(date.getDate() - date.getDay() + 3);
      break;
    case 'thursday':
      date.setDate(date.getDate() - date.getDay() + 4);
      break;
    case 'friday':
      date.setDate(date.getDate() - date.getDay() + 5);
      break;
    case 'saturday':
      date.setDate(date.getDate() - date.getDay() + 6);
      break;
    case 'sunday':
      date.setDate(date.getDate() - date.getDay());
      break;
  }
  
  return date;
}