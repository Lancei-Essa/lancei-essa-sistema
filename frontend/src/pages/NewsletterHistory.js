import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Grid, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Visibility, Delete, Edit, Send, Add, Search, FilterList } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NewsletterHistory = () => {
  const navigate = useNavigate();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDialog, setViewDialog] = useState(false);
  const [currentNewsletter, setCurrentNewsletter] = useState(null);
  
  // Filtros
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Simulando carregamento de newsletters
    setTimeout(() => {
      const mockNewsletters = [
        {
          id: 'news1',
          title: 'Novidades da Lancei Essa - Semana 10',
          sentDate: '2025-03-15T10:00:00',
          status: 'sent',
          recipients: 245,
          openRate: 68.4,
          clickRate: 23.7,
          content: `# Novidades da Lancei Essa - Semana 10

Olá, Empreendedores!

Estamos de volta com novidades do mundo das startups em Brasília.

## Financiamento para Startups

Neste episódio falamos sobre os desafios de conseguir investimento para sua startup

Convidado: Maria Oliveira

- Capital Semente
- Investidores Anjo
- Editais Públicos
- Apresentação de Pitch

## Nos siga nas redes sociais

- Instagram: @lanceiessa
- YouTube: Lancei Essa
- LinkedIn: /lanceiessa
`
        },
        {
          id: 'news2',
          title: 'Resumo Mensal - Fevereiro 2025',
          sentDate: '2025-03-01T09:30:00',
          status: 'sent',
          recipients: 230,
          openRate: 72.1,
          clickRate: 31.2,
          content: 'Conteúdo do resumo mensal...'
        },
        {
          id: 'news3',
          title: 'Especial: Mulheres Empreendedoras',
          sentDate: '2025-02-20T11:15:00',
          status: 'sent',
          recipients: 235,
          openRate: 81.3,
          clickRate: 42.5,
          content: 'Conteúdo do especial...'
        },
        {
          id: 'news4',
          title: 'Novidades da Lancei Essa - Abril 2025',
          sentDate: null,
          status: 'draft',
          recipients: null,
          openRate: null,
          clickRate: null,
          content: 'Rascunho da próxima newsletter...'
        }
      ];
      
      setNewsletters(mockNewsletters);
      setLoading(false);
    }, 1000);
  }, []);
  
  const handleViewNewsletter = (newsletter) => {
    setCurrentNewsletter(newsletter);
    setViewDialog(true);
  };
  
  const handleDeleteNewsletter = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta newsletter?')) {
      setNewsletters(newsletters.filter(n => n.id !== id));
    }
  };
  
  const getFilteredNewsletters = () => {
    return newsletters.filter(newsletter => {
      // Filtrar por mês se não for "all"
      const dateMatch = filterMonth === 'all' || 
        (newsletter.sentDate && new Date(newsletter.sentDate).getMonth() === parseInt(filterMonth));
      
      // Filtrar por termo de busca
      const searchMatch = !searchTerm || 
        newsletter.title.toLowerCase().includes(searchTerm.toLowerCase());
        
      return dateMatch && searchMatch;
    });
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Histórico de Newsletters
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/newsletters/generator')}
        >
          Nova Newsletter
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search color="action" sx={{ mr: 1 }} />
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth size="small">
              <InputLabel id="month-filter-label">Mês</InputLabel>
              <Select
                labelId="month-filter-label"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                label="Mês"
                startAdornment={<FilterList color="action" sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">Todos os meses</MenuItem>
                <MenuItem value="0">Janeiro</MenuItem>
                <MenuItem value="1">Fevereiro</MenuItem>
                <MenuItem value="2">Março</MenuItem>
                <MenuItem value="3">Abril</MenuItem>
                <MenuItem value="4">Maio</MenuItem>
                <MenuItem value="5">Junho</MenuItem>
                <MenuItem value="6">Julho</MenuItem>
                <MenuItem value="7">Agosto</MenuItem>
                <MenuItem value="8">Setembro</MenuItem>
                <MenuItem value="9">Outubro</MenuItem>
                <MenuItem value="10">Novembro</MenuItem>
                <MenuItem value="11">Dezembro</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setSearchTerm(''); setFilterMonth('all'); }}>
                Limpar Filtros
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Data de Envio</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Destinatários</TableCell>
              <TableCell>Taxa de Abertura</TableCell>
              <TableCell>Taxa de Clique</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Carregando newsletters...
                </TableCell>
              </TableRow>
            ) : getFilteredNewsletters().length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma newsletter encontrada
                </TableCell>
              </TableRow>
            ) : (
              getFilteredNewsletters().map((newsletter) => (
                <TableRow key={newsletter.id}>
                  <TableCell>{newsletter.title}</TableCell>
                  <TableCell>
                    {newsletter.sentDate 
                      ? new Date(newsletter.sentDate).toLocaleString() 
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={newsletter.status === 'sent' ? 'Enviada' : 'Rascunho'} 
                      color={newsletter.status === 'sent' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{newsletter.recipients || '—'}</TableCell>
                  <TableCell>
                    {newsletter.openRate ? `${newsletter.openRate}%` : '—'}
                  </TableCell>
                  <TableCell>
                    {newsletter.clickRate ? `${newsletter.clickRate}%` : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleViewNewsletter(newsletter)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                    {newsletter.status !== 'sent' && (
                      <>
                        <IconButton onClick={() => navigate(`/newsletters/edit/${newsletter.id}`)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteNewsletter(newsletter.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Dialog para visualizar newsletter */}
      <Dialog 
        open={viewDialog} 
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {currentNewsletter?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ 
            whiteSpace: 'pre-wrap', 
            fontFamily: 'serif',
            p: 2
          }}>
            {currentNewsletter?.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <Typography key={i} variant="h4" gutterBottom>{line.replace('# ', '')}</Typography>;
              }
              if (line.startsWith('## ')) {
                return <Typography key={i} variant="h5" gutterBottom sx={{ mt: 3 }}>{line.replace('## ', '')}</Typography>;
              }
              if (line.startsWith('- ')) {
                return <Typography key={i} component="li" sx={{ ml: 2 }}>{line.replace('- ', '')}</Typography>;
              }
              if (line === '') {
                return <Box key={i} sx={{ mb: 1 }} />;
              }
              return <Typography key={i} paragraph>{line}</Typography>;
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Fechar</Button>
          {currentNewsletter?.status !== 'sent' && (
            <Button 
              variant="contained"
              startIcon={<Send />}
            >
              Enviar Agora
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NewsletterHistory;