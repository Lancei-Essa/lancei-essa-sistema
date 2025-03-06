import React from 'react';
import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * Retorna o ícone apropriado baseado no status da conexão
 * @param {Object} status Objeto de status de conexão
 * @returns Componente ícone
 */
export const getStatusIcon = (status) => {
  if (!status) return <ErrorIcon color="error" />;
  
  if (!status.connected) {
    return <ErrorIcon color="error" />;
  } else if (status.tokenExpiresIn && status.tokenExpiresIn < 10) {
    return <WarningIcon sx={{ color: 'orange' }} />;
  } else {
    return <CheckCircleIcon color="success" />;
  }
};

/**
 * Retorna o chip apropriado baseado no status da conexão
 * @param {Object} status Objeto de status de conexão 
 * @returns Componente Chip
 */
export const getStatusChip = (status) => {
  if (!status || !status.connected) {
    return <Chip 
      label="Desconectado" 
      color="error" 
      size="small" 
      variant="outlined" 
    />;
  } else if (status.tokenExpiresIn && status.tokenExpiresIn < 10) {
    return <Chip 
      label="Renovação necessária" 
      color="warning" 
      size="small" 
      variant="outlined" 
    />;
  } else {
    return <Chip 
      label="Conectado" 
      color="success" 
      size="small" 
      variant="outlined" 
    />;
  }
};

/**
 * Retorna o texto descritivo apropriado baseado no status da conexão
 * @param {Object} status Objeto de status de conexão
 * @returns String com descrição do status
 */
export const getStatusText = (status) => {
  if (!status) return 'Não conectado';
  
  if (!status.connected) {
    return status.error || 'Não conectado';
  } else if (status.tokenExpiresIn && status.tokenExpiresIn < 10) {
    return `Token expira em ${status.tokenExpiresIn} dias`;
  } else {
    return 'Conectado';
  }
};