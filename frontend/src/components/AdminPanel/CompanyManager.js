import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Divider,
  Alert, CircularProgress, Card, CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

// Dados simulados de empresas
const MOCK_COMPANIES = [
  { id: 1, name: 'Lancei Essa', email: 'contato@lanceiessa.com.br', active: true },
  { id: 2, name: 'Empresa Demo', email: 'demo@exemplo.com', active: true }
];

/**
 * Componente de gerenciamento de empresas para sistema multi-tenant
 */
const CompanyManager = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState({ name: '', email: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Carregar empresas no carregamento inicial
  useEffect(() => {
    loadCompanies();
  }, []);

  // Simulação de carregamento de empresas da API
  const loadCompanies = async () => {
    setLoading(true);
    try {
      // Simulando chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      setCompanies(MOCK_COMPANIES);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerenciadores de evento
  const handleOpenDialog = (company = null) => {
    if (company) {
      setCurrentCompany(company);
      setIsEditing(true);
    } else {
      setCurrentCompany({ name: '', email: '' });
      setIsEditing(false);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentCompany({ ...currentCompany, [name]: value });
  };

  const handleSaveCompany = async () => {
    setLoading(true);
    try {
      // Simulação de API
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (isEditing) {
        // Atualizar empresa existente
        setCompanies(companies.map(company => 
          company.id === currentCompany.id ? currentCompany : company
        ));
      } else {
        // Adicionar nova empresa
        const newCompany = {
          ...currentCompany,
          id: Math.max(...companies.map(c => c.id), 0) + 1,
          active: true
        };
        setCompanies([...companies, newCompany]);
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta empresa?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Simulação de API
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Remover empresa da lista
      setCompanies(companies.filter(company => company.id !== id));
    } catch (error) {
      console.error('Erro ao remover empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" component="h2">
          Gerenciamento de Empresas
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nova Empresa
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {companies.length === 0 ? (
            <Alert severity="info">
              Nenhuma empresa cadastrada. Clique em "Nova Empresa" para adicionar.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {companies.map(company => (
                <Grid item xs={12} sm={6} md={4} key={company.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" component="h3">
                          {company.name}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {company.email}
                      </Typography>
                      
                      <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                        ID: {company.id} • Status: {company.active ? 'Ativo' : 'Inativo'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenDialog(company)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteCompany(company.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
      
      {/* Diálogo para adicionar/editar empresa */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Empresa"
                name="name"
                value={currentCompany.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email de Contato"
                name="email"
                type="email"
                value={currentCompany.email}
                onChange={handleInputChange}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveCompany} 
            color="primary" 
            variant="contained"
            disabled={!currentCompany.name || !currentCompany.email}
          >
            {isEditing ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyManager;