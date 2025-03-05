import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Badge, IconButton, Menu, MenuItem, List,
  ListItem, ListItemText, ListItemIcon, Divider, Chip, Button,
  Tooltip, Paper, Drawer, AppBar, Toolbar, ListItemAvatar,
  Avatar, ListItemSecondaryAction, Switch, Collapse
} from '@mui/material';
import {
  Notifications, Settings, PlayArrow, Check, Error, Schedule,
  CheckCircle, Warning, Info, Delete, YouTube, Instagram, LinkedIn,
  Twitter, Facebook, Close, NotificationsActive, NotificationsOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';

const NotificationsManager = () => {
  // Estados
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    browser: true,
    failedPublications: true,
    successfulPublications: true,
    upcomingPublications: true,
    systemUpdates: true
  });
  const navigate = useNavigate();

  // Abrir o menu de notificações
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    // Marcar todas as notificações como vistas
    if (unreadCount > 0) {
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));
      setNotifications(updatedNotifications);
      setUnreadCount(0);
    }
  };

  // Fechar o menu de notificações
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Abrir o drawer de notificações
  const handleDrawerOpen = () => {
    handleMenuClose();
    setDrawerOpen(true);
  };

  // Fechar o drawer de notificações
  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  // Atualizar configurações de notificação
  const handleSettingChange = (setting) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    });
    // Em um caso real, enviaríamos isso para a API
  };

  // Carregar notificações ao montar o componente
  useEffect(() => {
    fetchNotifications();
    
    // Em uma aplicação real, configurar um polling ou WebSocket para atualizações
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Função para buscar notificações da API
  const fetchNotifications = async () => {
    try {
      // Em uma aplicação real, isso seria uma chamada de API
      // const response = await api.get('/notifications');
      
      // Simular dados de notificações
      const mockNotifications = [
        {
          id: '1',
          type: 'success',
          title: 'Publicação realizada com sucesso',
          message: 'Seu vídeo foi publicado no YouTube com sucesso.',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutos atrás
          platform: 'youtube',
          read: false,
          actionLink: '/publications',
          itemId: 'pub123'
        },
        {
          id: '2',
          type: 'warning',
          title: 'Publicação agendada em breve',
          message: 'Você tem uma publicação agendada para o Instagram em 1 hora.',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutos atrás
          platform: 'instagram',
          read: false,
          actionLink: '/publications',
          itemId: 'pub124'
        },
        {
          id: '3',
          type: 'error',
          title: 'Falha na publicação',
          message: 'Falha ao publicar no Twitter. Verifique suas credenciais.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hora atrás
          platform: 'twitter',
          read: true,
          actionLink: '/settings',
          itemId: 'pub125'
        },
        {
          id: '4',
          type: 'info',
          title: 'Novo episódio gravado',
          message: 'O episódio #3 foi marcado como gravado.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas atrás
          platform: 'system',
          read: true,
          actionLink: '/episodes/ep003',
          itemId: 'ep003'
        },
        {
          id: '5',
          type: 'success',
          title: 'Métricas disponíveis',
          message: 'Novas métricas disponíveis para o Episódio #2.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
          platform: 'analytics',
          read: true,
          actionLink: '/metrics',
          itemId: 'ep002'
        }
      ];
      
      setNotifications(mockNotifications);
      
      // Calcular notificações não lidas
      const unread = mockNotifications.filter(notification => !notification.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  // Marcar uma notificação como lida
  const markAsRead = async (id) => {
    try {
      // Em uma aplicação real, isso seria uma chamada de API
      // await api.patch(`/notifications/${id}/read`);
      
      // Atualizar estado localmente
      const updatedNotifications = notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      setNotifications(updatedNotifications);
      
      // Recalcular contagem de não lidas
      const unread = updatedNotifications.filter(notification => !notification.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Remover uma notificação
  const removeNotification = async (id) => {
    try {
      // Em uma aplicação real, isso seria uma chamada de API
      // await api.delete(`/notifications/${id}`);
      
      // Remover do estado local
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      setNotifications(updatedNotifications);
      
      // Recalcular contagem de não lidas
      const unread = updatedNotifications.filter(notification => !notification.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  };

  // Navegar para o link da ação
  const handleAction = (notification) => {
    handleMenuClose();
    handleDrawerClose();
    navigate(notification.actionLink);
    markAsRead(notification.id);
  };

  // Obter ícone com base no tipo de notificação
  const getNotificationIcon = (type, platform) => {
    // Primeiro verificar a plataforma
    if (platform === 'youtube') return <YouTube color="error" />;
    if (platform === 'instagram') return <Instagram color="primary" />;
    if (platform === 'linkedin') return <LinkedIn color="primary" />;
    if (platform === 'twitter') return <Twitter color="info" />;
    if (platform === 'facebook') return <Facebook color="primary" />;
    
    // Depois verificar o tipo
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      case 'info':
      default:
        return <Info color="info" />;
    }
  };

  // Renderizar uma notificação no menu
  const renderNotificationItem = (notification) => (
    <MenuItem 
      key={notification.id} 
      onClick={() => handleAction(notification)}
      sx={{ 
        backgroundColor: notification.read ? 'inherit' : 'action.hover',
        opacity: notification.read ? 0.8 : 1
      }}
    >
      <ListItemIcon>
        {getNotificationIcon(notification.type, notification.platform)}
      </ListItemIcon>
      <Box>
        <Typography variant="subtitle2" noWrap>
          {notification.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {notification.message}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {format(new Date(notification.timestamp), 'dd/MM/yyyy HH:mm')}
        </Typography>
      </Box>
    </MenuItem>
  );

  return (
    <>
      {/* Botão de notificação na barra */}
      <Tooltip title="Notificações">
        <IconButton color="inherit" onClick={handleMenuOpen}>
          <Badge badgeContent={unreadCount} color="error">
            <Notifications />
          </Badge>
        </IconButton>
      </Tooltip>
      
      {/* Menu dropdown de notificações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 350, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notificações</Typography>
          <Button 
            size="small" 
            onClick={handleDrawerOpen}
          >
            Ver todas
          </Button>
        </Box>
        
        <Divider />
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma notificação
            </Typography>
          </Box>
        ) : (
          <>
            {notifications.slice(0, 5).map(renderNotificationItem)}
            
            {notifications.length > 5 && (
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Button size="small" onClick={handleDrawerOpen}>
                  Ver mais {notifications.length - 5} notificações
                </Button>
              </Box>
            )}
          </>
        )}
      </Menu>
      
      {/* Drawer de todas as notificações */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: { width: 400 }
        }}
      >
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Notificações
            </Typography>
            <IconButton edge="end" onClick={handleDrawerClose}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Configurações de Notificação
            </Typography>
            
            <List disablePadding>
              <ListItem disablePadding>
                <ListItemText primary="Notificações por e-mail" />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notificationSettings.email}
                    onChange={() => handleSettingChange('email')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem disablePadding>
                <ListItemText primary="Notificações no navegador" />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notificationSettings.browser}
                    onChange={() => handleSettingChange('browser')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider sx={{ my: 1 }} />
              
              <ListItem disablePadding>
                <ListItemText primary="Falhas em publicações" />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notificationSettings.failedPublications}
                    onChange={() => handleSettingChange('failedPublications')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem disablePadding>
                <ListItemText primary="Publicações bem-sucedidas" />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notificationSettings.successfulPublications}
                    onChange={() => handleSettingChange('successfulPublications')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              <ListItem disablePadding>
                <ListItemText primary="Publicações agendadas" />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    checked={notificationSettings.upcomingPublications}
                    onChange={() => handleSettingChange('upcomingPublications')}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
          
          <Typography variant="subtitle1" gutterBottom>
            Todas as Notificações
          </Typography>
          
          <List>
            {notifications.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="Nenhuma notificação" 
                  secondary="As notificações aparecem aqui quando houver atualizações." 
                />
              </ListItem>
            ) : (
              notifications.map(notification => (
                <ListItem 
                  key={notification.id}
                  alignItems="flex-start"
                  secondaryAction={
                    <IconButton edge="end" onClick={() => removeNotification(notification.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  }
                  sx={{ 
                    backgroundColor: notification.read ? 'inherit' : 'action.hover',
                    mb: 1,
                    borderRadius: 1
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: notification.type === 'success' ? 'success.main' : 
                                 notification.type === 'warning' ? 'warning.main' :
                                 notification.type === 'error' ? 'error.main' : 'info.main'
                      }}
                    >
                      {getNotificationIcon(notification.type, notification.platform)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2">{notification.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(notification.timestamp), 'dd/MM HH:mm')}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.primary">
                          {notification.message}
                        </Typography>
                        <Button 
                          size="small" 
                          color="primary" 
                          onClick={() => handleAction(notification)}
                          sx={{ mt: 1 }}
                        >
                          Ver detalhes
                        </Button>
                      </>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
          
          {notifications.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button variant="outlined" onClick={() => setNotifications([])}>
                Limpar Todas
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default NotificationsManager;