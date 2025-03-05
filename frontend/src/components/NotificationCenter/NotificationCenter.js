import React, { useState, useEffect, useCallback } from 'react';
import { 
  Badge, IconButton, Popover, List, ListItem, 
  ListItemText, ListItemAvatar, Avatar, ListItemSecondaryAction,
  Typography, Divider, Box, Button, Tooltip, CircularProgress
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ReadMoreIcon from '@mui/icons-material/ReadMore';

// Mock de notificações - substituir por chamada API real
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'token_warning',
    platform: 'linkedin',
    message: 'Token do LinkedIn expira em 5 dias',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
    read: false,
    severity: 'warning',
    actionLabel: 'Renovar',
    actionPath: '/social-media/linkedin'
  },
  {
    id: 2,
    type: 'connection_error',
    platform: 'twitter',
    message: 'Falha na conexão com Twitter. Token expirado.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 horas atrás
    read: false,
    severity: 'error',
    actionLabel: 'Reconectar',
    actionPath: '/social-media/twitter'
  },
  {
    id: 3,
    type: 'publication_success',
    platform: 'youtube',
    message: 'Vídeo "Episódio #42" publicado com sucesso no YouTube',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 horas atrás
    read: true,
    severity: 'success',
    actionLabel: 'Ver métricas',
    actionPath: '/metrics/youtube/123456'
  },
  {
    id: 4,
    type: 'publication_scheduled',
    platform: 'instagram',
    message: 'Publicação agendada para Instagram em 15/03/2025 às 14:00',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 horas atrás
    read: true,
    severity: 'info',
    actionLabel: 'Editar',
    actionPath: '/publications/edit/789'
  },
  {
    id: 5,
    type: 'auto_renewal_success',
    platform: 'spotify',
    message: 'Token do Spotify renovado automaticamente',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 dias atrás
    read: true,
    severity: 'success',
    actionLabel: null,
    actionPath: null
  }
];

const getPlatformIcon = (platform, size = 24) => {
  switch (platform) {
    case 'youtube':
      return <YouTubeIcon sx={{ color: '#FF0000', fontSize: size }} />;
    case 'instagram':
      return <InstagramIcon sx={{ color: '#C13584', fontSize: size }} />;
    case 'twitter':
      return <TwitterIcon sx={{ color: '#1DA1F2', fontSize: size }} />;
    case 'linkedin':
      return <LinkedInIcon sx={{ color: '#0077B5', fontSize: size }} />;
    case 'spotify':
      return <MusicNoteIcon sx={{ color: '#1DB954', fontSize: size }} />;
    default:
      return <NotificationsIcon sx={{ fontSize: size }} />;
  }
};

const getSeverityIcon = (severity, size = 20) => {
  switch (severity) {
    case 'error':
      return <ErrorIcon color="error" sx={{ fontSize: size }} />;
    case 'warning':
      return <WarningIcon sx={{ color: 'orange', fontSize: size }} />;
    case 'success':
      return <CheckCircleIcon color="success" sx={{ fontSize: size }} />;
    default:
      return null;
  }
};

const formatTimestamp = (timestamp) => {
  const now = new Date();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  
  if (minutes < 60) {
    return `${minutes} min atrás`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h atrás`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d atrás`;
  }
  
  return timestamp.toLocaleDateString();
};

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar notificações
  useEffect(() => {
    loadNotifications();
  }, []);

  // Calcular contagem de não lidas
  useEffect(() => {
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    // Simulação de chamada API
    setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      setLoading(false);
    }, 800);
  }, []);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const handleNotificationAction = (notification) => {
    console.log(`Executando ação para notificação ${notification.id}: ${notification.actionPath}`);
    // Aqui implementaríamos redirecionamento ou outra ação
    // baseado no tipo da notificação
    handleClose();
  };

  const handleRemoveNotification = (notificationId, event) => {
    event.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton 
          aria-describedby={id} 
          onClick={handleOpen}
          color="inherit"
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ width: 350, maxHeight: 500 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Typography variant="subtitle1">Notificações</Typography>
            {unreadCount > 0 && (
              <Button 
                size="small" 
                variant="text" 
                color="inherit" 
                onClick={handleMarkAllAsRead}
              >
                Marcar todas como lidas
              </Button>
            )}
          </Box>
          
          <Divider />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={30} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Não há notificações
              </Typography>
            </Box>
          ) : (
            <List sx={{ pt: 0, pb: 0 }}>
              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    alignItems="flex-start"
                    button
                    onClick={() => handleNotificationAction(notification)}
                    sx={{ 
                      bgcolor: notification.read ? 'inherit' : 'action.hover',
                      transition: 'background-color 0.3s',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'transparent' }}>
                        {getPlatformIcon(notification.platform)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getSeverityIcon(notification.severity)}
                          <Typography
                            variant="body2"
                            sx={{ 
                              fontWeight: notification.read ? 'regular' : 'bold',
                              display: 'inline' 
                            }}
                          >
                            {notification.message}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                          >
                            {formatTimestamp(notification.timestamp)}
                          </Typography>
                          
                          {notification.actionLabel && (
                            <Button
                              size="small"
                              variant="text"
                              color="primary"
                              endIcon={<ReadMoreIcon fontSize="small" />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationAction(notification);
                              }}
                              sx={{ py: 0, px: 1, minWidth: 'auto' }}
                            >
                              {notification.actionLabel}
                            </Button>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        size="small"
                        onClick={(e) => handleRemoveNotification(notification.id, e)}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Button 
              size="small" 
              onClick={loadNotifications} 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? 'Atualizando...' : 'Atualizar notificações'}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

export default NotificationCenter;