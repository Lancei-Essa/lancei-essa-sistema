const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Obter todas as notificações do usuário logado
 * @route   GET /api/notifications
 * @access  Privado
 */
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const unreadOnly = req.query.unread === 'true';
  
  let notifications;
  
  if (unreadOnly) {
    notifications = await Notification.getUnreadByUser(userId);
  } else {
    notifications = await Notification.getAllByUser(userId, limit);
  }
  
  res.json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

/**
 * @desc    Obter contagem de notificações não lidas
 * @route   GET /api/notifications/unread-count
 * @access  Privado
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const count = await Notification.countDocuments({
    user: userId,
    read: false
  });
  
  res.json({
    success: true,
    count
  });
});

/**
 * @desc    Marcar notificação específica como lida
 * @route   PUT /api/notifications/:id/read
 * @access  Privado
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;
  
  const notification = await Notification.markAsRead(notificationId, userId);
  
  if (!notification) {
    res.status(404);
    throw new Error('Notificação não encontrada');
  }
  
  res.json({
    success: true,
    data: notification
  });
});

/**
 * @desc    Marcar todas as notificações como lidas
 * @route   PUT /api/notifications/mark-all-read
 * @access  Privado
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await Notification.markAllAsRead(userId);
  
  res.json({
    success: true,
    count: result.modifiedCount
  });
});

/**
 * @desc    Excluir uma notificação
 * @route   DELETE /api/notifications/:id
 * @access  Privado
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;
  
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });
  
  if (!notification) {
    res.status(404);
    throw new Error('Notificação não encontrada');
  }
  
  await notification.remove();
  
  res.json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Criar uma notificação de sistema para o usuário (usado internamente)
 * @route   Não exposto por rota, uso interno
 * @access  Privado
 */
const createSystemNotification = async (userId, message, options = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      type: 'system_notification',
      platform: 'system',
      message,
      severity: options.severity || 'info',
      actionLabel: options.actionLabel || null,
      actionPath: options.actionPath || null,
      metadata: options.metadata || {}
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Erro ao criar notificação de sistema:', error);
    return null;
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSystemNotification
};