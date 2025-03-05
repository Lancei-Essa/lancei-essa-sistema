import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton
} from '@mui/material';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const statusColors = {
  planned: 'default',
  recorded: 'primary',
  editing: 'warning',
  published: 'success'
};

const statusLabels = {
  planned: 'Planejado',
  recorded: 'Gravado',
  editing: 'Em Edição',
  published: 'Publicado'
};

const EpisodeList = () => {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const response = await api.get('/episodes');
        setEpisodes(response.data.data);
      } catch (error) {
        console.error('Erro ao buscar episódios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este episódio?')) {
      try {
        await api.delete(`/episodes/${id}`);
        setEpisodes(episodes.filter(episode => episode._id !== id));
      } catch (error) {
        console.error('Erro ao excluir episódio:', error);
      }
    }
  };

  if (loading) {
    return <Container><Typography>Carregando...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Episódios
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<Add />}
          onClick={() => navigate('/episodes/new')}
        >
          Novo Episódio
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Nº</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Convidados</TableCell>
              <TableCell>Data de Gravação</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {episodes.map((episode) => (
              <TableRow key={episode._id}>
                <TableCell component="th" scope="row">
                  {episode.number}
                </TableCell>
                <TableCell>{episode.title}</TableCell>
                <TableCell>
                  {episode.guests?.map(guest => guest.name).join(', ') || 'Sem convidados'}
                </TableCell>
                <TableCell>
                  {new Date(episode.recordingDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={statusLabels[episode.status] || episode.status} 
                    color={statusColors[episode.status] || 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => navigate(`/episodes/${episode._id}`)}>
                    <Visibility />
                  </IconButton>
                  <IconButton onClick={() => navigate(`/episodes/${episode._id}/edit`)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(episode._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default EpisodeList;