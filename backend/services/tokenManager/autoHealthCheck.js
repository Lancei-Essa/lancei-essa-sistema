/**
 * Sistema de verificação automática da saúde das conexões com plataformas sociais
 * e renovação proativa de tokens com aviso de falhas via notificações internas
 */

const mongoose = require('mongoose');
const schedule = require('node-schedule');
const tokenManager = require('../../utils/tokenManager');
const User = require('../../models/User');
const Notification = require('../../models/Notification'); // Modelo a ser criado

// Configurações
const CHECK_INTERVAL = '0 0 * * *'; // Cron: todos os dias à meia-noite
const TOKEN_EXPIRY_WARNING_DAYS = 7; // Aviso quando token expirar em 7 dias ou menos
const PLATFORMS = ['youtube', 'twitter', 'linkedin', 'instagram', 'spotify', 'tiktok'];

// Status de verificação
let isRunning = false;
let lastRunTimestamp = null;
let scheduledJob = null;

/**
 * Realiza verificação de saúde em todas as conexões de todos os usuários
 */
const runHealthCheck = async () => {
  console.log(`[TokenHealthCheck] Iniciando verificação de saúde em ${new Date()}`);
  isRunning = true;
  lastRunTimestamp = new Date();
  
  try {
    // Obter todos os usuários ativos
    const users = await User.find({ active: true }).select('_id email name');
    console.log(`[TokenHealthCheck] Verificando ${users.length} usuários`);
    
    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    
    // Para cada usuário, verificar todas as plataformas
    for (const user of users) {
      console.log(`[TokenHealthCheck] Verificando tokens do usuário ${user._id}`);
      
      for (const platform of PLATFORMS) {
        try {
          // Verificar se usuário tem token para a plataforma
          const hasToken = await tokenManager.hasToken(user._id, platform);
          
          if (!hasToken) {
            console.log(`[TokenHealthCheck] Usuário ${user._id} não tem token para ${platform}`);
            continue;
          }
          
          // Obter token do usuário
          const token = await tokenManager.getToken(user._id, platform);
          
          if (!token) {
            console.log(`[TokenHealthCheck] Não foi possível obter token de ${platform} para usuário ${user._id}`);
            continue;
          }
          
          // Verificar data de expiração
          if (token.expiresAt) {
            const now = new Date();
            const expiryDate = new Date(token.expiresAt);
            const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            console.log(`[TokenHealthCheck] Token ${platform} do usuário ${user._id} expira em ${daysUntilExpiry} dias`);
            
            // Se expirar em menos de X dias, tentar renovar proativamente
            if (daysUntilExpiry <= TOKEN_EXPIRY_WARNING_DAYS) {
              console.log(`[TokenHealthCheck] Tentando renovar token ${platform} que expira em breve`);
              
              try {
                // Tentar renovar token
                const refreshed = await tokenManager.refreshToken(user._id, platform);
                
                if (refreshed) {
                  console.log(`[TokenHealthCheck] Token ${platform} renovado com sucesso`);
                  
                  // Criar notificação de sucesso
                  await createNotification(user._id, {
                    type: 'token_renewed',
                    platform,
                    message: `Token do ${getPlatformName(platform)} renovado automaticamente`,
                    severity: 'success'
                  });
                  
                  successCount++;
                } else {
                  // Criar notificação de aviso
                  console.log(`[TokenHealthCheck] Não foi possível renovar token ${platform} automaticamente`);
                  
                  await createNotification(user._id, {
                    type: 'token_warning',
                    platform,
                    message: `Token do ${getPlatformName(platform)} expira em ${daysUntilExpiry} dias. Reconexão necessária.`,
                    severity: 'warning',
                    actionLabel: 'Reconectar',
                    actionPath: `/social-media/${platform}`
                  });
                  
                  warningCount++;
                }
              } catch (refreshError) {
                console.error(`[TokenHealthCheck] Erro ao renovar token ${platform}:`, refreshError);
                
                // Criar notificação de erro
                await createNotification(user._id, {
                  type: 'token_error',
                  platform,
                  message: `Erro ao renovar token do ${getPlatformName(platform)}: ${refreshError.message}`,
                  severity: 'error',
                  actionLabel: 'Reconectar',
                  actionPath: `/social-media/${platform}`
                });
                
                errorCount++;
              }
            }
          } else {
            // Token sem data de expiração (raro, mas possível em alguns casos)
            console.log(`[TokenHealthCheck] Token ${platform} do usuário ${user._id} não tem data de expiração`);
          }
        } catch (platformError) {
          console.error(`[TokenHealthCheck] Erro ao verificar token ${platform}:`, platformError);
          errorCount++;
        }
      }
    }
    
    console.log(`[TokenHealthCheck] Verificação concluída. Sucessos: ${successCount}, Avisos: ${warningCount}, Erros: ${errorCount}`);
    
  } catch (error) {
    console.error('[TokenHealthCheck] Erro na verificação de saúde:', error);
  } finally {
    isRunning = false;
  }
};

/**
 * Cria uma nova notificação para o usuário
 */
const createNotification = async (userId, notificationData) => {
  try {
    // Verificar se modelo Notification existe
    if (!mongoose.models.Notification) {
      console.log('[TokenHealthCheck] Modelo Notification não encontrado, implementação futura');
      return null;
    }
    
    const notification = new Notification({
      user: userId,
      type: notificationData.type,
      platform: notificationData.platform,
      message: notificationData.message,
      severity: notificationData.severity || 'info',
      actionLabel: notificationData.actionLabel || null,
      actionPath: notificationData.actionPath || null,
      read: false,
      createdAt: new Date()
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('[TokenHealthCheck] Erro ao criar notificação:', error);
    return null;
  }
};

/**
 * Retorna o nome amigável da plataforma
 */
const getPlatformName = (platform) => {
  const names = {
    youtube: 'YouTube',
    twitter: 'Twitter',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    spotify: 'Spotify',
    tiktok: 'TikTok'
  };
  
  return names[platform] || platform;
};

/**
 * Inicia o sistema de verificação automática
 */
const startHealthCheck = () => {
  if (scheduledJob) {
    console.log('[TokenHealthCheck] Verificação já está agendada');
    return false;
  }
  
  scheduledJob = schedule.scheduleJob(CHECK_INTERVAL, runHealthCheck);
  console.log(`[TokenHealthCheck] Verificação automática agendada: ${CHECK_INTERVAL}`);
  
  // Executar imediatamente na primeira vez
  runHealthCheck();
  
  return true;
};

/**
 * Para o sistema de verificação automática
 */
const stopHealthCheck = () => {
  if (scheduledJob) {
    scheduledJob.cancel();
    scheduledJob = null;
    console.log('[TokenHealthCheck] Verificação automática cancelada');
    return true;
  }
  
  return false;
};

/**
 * Executa a verificação de saúde sob demanda
 */
const runManualHealthCheck = async () => {
  if (isRunning) {
    return {
      success: false,
      message: 'Verificação já está em andamento'
    };
  }
  
  // Executar verificação de forma assíncrona
  runHealthCheck().catch(err => {
    console.error('[TokenHealthCheck] Erro na verificação manual:', err);
  });
  
  return {
    success: true,
    message: 'Verificação iniciada'
  };
};

/**
 * Retorna o status atual do sistema de verificação
 */
const getHealthCheckStatus = () => {
  return {
    isRunning,
    lastRun: lastRunTimestamp,
    isScheduled: scheduledJob !== null,
    schedulePattern: CHECK_INTERVAL
  };
};

// Exportar funções
module.exports = {
  startHealthCheck,
  stopHealthCheck,
  runManualHealthCheck,
  getHealthCheckStatus
};