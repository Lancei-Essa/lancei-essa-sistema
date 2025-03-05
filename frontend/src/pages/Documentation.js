// src/pages/Documentation.js
import React from 'react';
import {
  Container, Typography, Box, Paper, Accordion, AccordionSummary, 
  AccordionDetails, Grid, Divider, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { ExpandMore, Article, Info, HelpOutline, PlayArrow } from '@mui/icons-material';

const Documentation = () => {
  const sections = [
    {
      title: 'Introdução',
      content: 'O Sistema de Gestão Lancei Essa foi desenvolvido para otimizar o fluxo de trabalho do podcast, gerenciar publicações em redes sociais e facilitar a criação de newsletters. Esta documentação fornece orientações sobre como usar o sistema.'
    },
    {
      title: 'Gerenciamento de Episódios',
      subsections: [
        {
          title: 'Criando um novo episódio',
          steps: [
            'Navegue até "Episódios" no menu lateral',
            'Clique no botão "Novo Episódio"',
            'Preencha os campos obrigatórios: Número, Título, Descrição e Data de Gravação',
            'Adicione convidados, tópicos e timestamps conforme necessário',
            'Clique em "Salvar" para criar o episódio'
          ]
        },
        {
          title: 'Editando um episódio existente',
          steps: [
            'Navegue até "Episódios" no menu lateral',
            'Encontre o episódio que deseja editar e clique no ícone de edição',
            'Faça as alterações necessárias',
            'Clique em "Salvar" para atualizar o episódio'
          ]
        },
        {
          title: 'Adicionando timestamps',
          steps: [
            'Na tela de criação/edição de episódio, role até a seção "Timestamps"',
            'Clique em "Adicionar Timestamp"',
            'Insira o tempo no formato MM:SS e a descrição do momento',
            'Clique em "Adicionar" para incluir o timestamp'
          ]
        }
      ]
    },
    {
      title: 'Publicações em Redes Sociais',
      subsections: [
        {
          title: 'Agendando uma publicação',
          steps: [
            'Navegue até "Publicações" no menu lateral',
            'Clique em "Nova Publicação"',
            'Selecione o episódio relacionado, a plataforma e o tipo de conteúdo',
            'Defina a data e hora de publicação',
            'Preencha o título e descrição',
            'Clique em "Agendar" para programar a publicação'
          ]
        },
        {
          title: 'Gerenciando publicações agendadas',
          steps: [
            'Na página de Publicações, use as abas para filtrar por status',
            'Para editar uma publicação agendada, clique no ícone de edição',
            'Para excluir, clique no ícone de exclusão'
          ]
        }
      ]
    },
    {
      title: 'Gerando Newsletters',
      subsections: [
        {
          title: 'Criando uma newsletter a partir de episódios',
          steps: [
            'Navegue até "Newsletter > Gerar Newsletter" no menu lateral',
            'Insira um título para a newsletter',
            'Selecione os episódios que deseja incluir',
            'Escolha um template e opções adicionais',
            'Clique em "Gerar Newsletter" para criar uma prévia',
            'Revise o conteúdo e faça ajustes se necessário',
            'Use "Enviar Teste" para testar antes do envio final'
          ]
        },
        {
          title: 'Visualizando histórico de newsletters',
          steps: [
            'Navegue até "Newsletter > Histórico" no menu lateral',
            'Visualize todas as newsletters enviadas e seus desempenhos',
            'Use os filtros para encontrar newsletters específicas'
          ]
        }
      ]
    },
    {
      title: 'Análise de Métricas',
      content: 'A página de Métricas oferece uma visão consolidada do desempenho do podcast nas diferentes plataformas. Você pode filtrar por período e plataforma para analisar dados específicos, como visualizações, engajamento e crescimento da audiência.'
    },
    {
      title: 'Configurações do Sistema',
      content: 'Na página de Configurações, você pode personalizar aspectos do sistema, como configurações de notificação, conectar contas de redes sociais e gerenciar chaves de API necessárias para integrações.'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Documentação do Sistema
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Visão Geral
        </Typography>
        <Typography paragraph>
          Bem-vindo à documentação do Sistema de Gestão Lancei Essa. Este guia fornece 
          instruções detalhadas sobre como utilizar todas as funcionalidades da plataforma para 
          gerenciar seu podcast, publicações em redes sociais e newsletters.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Info color="primary" sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Esta documentação está em constante atualização conforme novas funcionalidades são adicionadas ao sistema.
          </Typography>
        </Box>
      </Paper>
      
      {sections.map((section, index) => (
        <Accordion key={index} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">{section.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {section.content && (
              <Typography paragraph>{section.content}</Typography>
            )}
            
            {section.subsections && section.subsections.map((subsection, subIndex) => (
              <Box key={subIndex} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {subsection.title}
                </Typography>
                
                {subsection.steps && (
                  <List dense>
                    {subsection.steps.map((step, stepIndex) => (
                      <ListItem key={stepIndex}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <PlayArrow color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={step} />
                      </ListItem>
                    ))}
                  </List>
                )}
                
                {subIndex < section.subsections.length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
      
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#f8f9fa' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <HelpOutline color="primary" fontSize="large" />
          </Grid>
          <Grid item xs>
            <Typography variant="h6">Precisa de Ajuda Adicional?</Typography>
            <Typography variant="body2" color="text.secondary">
              Se você tiver dúvidas que não estão cobertas nesta documentação, 
              entre em contato com nossa equipe de suporte.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Documentation;