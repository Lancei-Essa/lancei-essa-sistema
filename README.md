# Lancei Essa Sistema

Sistema de gerenciamento de podcast e distribuição automática de conteúdo para redes sociais.

## Sobre o Projeto

O Lancei Essa Sistema é uma plataforma completa para gerenciamento de podcasts, permitindo o agendamento e publicação automática de conteúdo em diversas plataformas sociais como YouTube, Instagram, Twitter, LinkedIn, TikTok e Spotify.

## Principais Recursos

- Gerenciamento completo de episódios
- Integração com YouTube, Instagram, Twitter, LinkedIn, TikTok e Spotify
- Agendamento automático de publicações
- Dashboard de métricas com estatísticas de desempenho
- Coleta automática de métricas das redes sociais
- Suporte a múltiplos tipos de conteúdo (vídeos, imagens, clips, etc.)

## Estrutura do Projeto

O projeto é dividido em dois componentes principais:

- **Backend**: API Node.js com Express e MongoDB
- **Frontend**: Aplicação React com Material UI

## Configuração

### Requisitos

- Node.js v14+
- MongoDB
- Contas de desenvolvedor nas plataformas sociais para integração

### Instalação

1. Clone o repositório
2. Instale as dependências do backend:
   ```
   cd backend
   npm install
   ```
3. Instale as dependências do frontend:
   ```
   cd frontend
   npm install
   ```

### Configuração do Backend

1. Crie um arquivo `.env` na pasta `backend` com as seguintes variáveis básicas:
   ```
   PORT=5002
   MONGO_URI=sua_conexao_mongodb
   JWT_SECRET=seu_jwt_secret
   TOKEN_ENCRYPTION_KEY=chave_segura_de_32_caracteres
   ```

2. Adicione as credenciais das plataformas sociais no arquivo `.env` conforme detalhado na seção abaixo.

### Configuração das Credenciais de API para Mídias Sociais

Para cada plataforma de mídia social, você precisará obter credenciais de desenvolvedor e configurá-las no arquivo `.env`.

#### 1. YouTube / Google

1. Acesse o [Google Developer Console](https://console.developers.google.com/)
2. Crie um novo projeto
3. Habilite a YouTube Data API v3
4. Vá para "Credenciais" e crie credenciais OAuth 2.0
   - Tipo: Aplicativo da Web
   - URI de redirecionamento: `http://localhost:5002/api/youtube/oauth2callback`
5. Anote o Client ID e Client Secret
6. Crie uma chave de API para a YouTube Data API
7. Configure no arquivo `.env`:
   ```
   YOUTUBE_CLIENT_ID=seu_client_id
   YOUTUBE_CLIENT_SECRET=seu_client_secret
   YOUTUBE_REDIRECT_URI=http://localhost:5002/api/youtube/oauth2callback
   YOUTUBE_API_KEY=sua_chave_api_youtube
   ```

#### 2. Instagram / Facebook

1. Acesse o [Facebook Developer Portal](https://developers.facebook.com/)
2. Crie um novo aplicativo (tipo Business)
3. Adicione o produto "Instagram Basic Display"
4. Configure seu aplicativo:
   - URI de redirecionamento: `http://localhost:5002/api/instagram/callback`
   - Domínios permitidos: `localhost`
5. Anote o Client ID e Client Secret
6. Configure no arquivo `.env`:
   ```
   INSTAGRAM_CLIENT_ID=seu_client_id
   INSTAGRAM_CLIENT_SECRET=seu_client_secret
   INSTAGRAM_REDIRECT_URI=http://localhost:5002/api/instagram/callback
   ```

#### 3. Twitter

1. Acesse o [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Crie um novo projeto e um aplicativo
3. Configure as permissões do aplicativo (leitura/escrita)
4. Configure o tipo de autenticação OAuth 2.0
5. Adicione URL de callback: `http://localhost:5002/api/twitter/callback`
6. Anote a API Key e API Secret
7. Configure no arquivo `.env`:
   ```
   TWITTER_API_KEY=sua_api_key
   TWITTER_API_SECRET=sua_api_secret
   TWITTER_REDIRECT_URI=http://localhost:5002/api/twitter/callback
   ```

#### 4. LinkedIn

1. Acesse o [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Crie um novo aplicativo
3. Solicite as permissões necessárias:
   - r_liteprofile
   - r_emailaddress
   - w_member_social
4. Adicione URL de redirecionamento: `http://localhost:5002/api/linkedin/callback`
5. Anote o Client ID e Client Secret
6. Configure no arquivo `.env`:
   ```
   LINKEDIN_CLIENT_ID=seu_client_id
   LINKEDIN_CLIENT_SECRET=seu_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:5002/api/linkedin/callback
   ```

#### 5. TikTok

1. Acesse o [TikTok Developer Portal](https://developers.tiktok.com/)
2. Crie um novo aplicativo
3. Adicione os escopos necessários
4. Configure URL de redirecionamento: `http://localhost:5002/api/tiktok/callback`
5. Anote o Client Key e Client Secret
6. Configure no arquivo `.env`:
   ```
   TIKTOK_CLIENT_KEY=sua_client_key
   TIKTOK_CLIENT_SECRET=seu_client_secret
   TIKTOK_REDIRECT_URI=http://localhost:5002/api/tiktok/callback
   ```

#### 6. Spotify

1. Acesse o [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Crie um novo aplicativo
3. Configure URL de redirecionamento: `http://localhost:5002/api/spotify/callback`
4. Anote o Client ID e Client Secret
5. Configure no arquivo `.env`:
   ```
   SPOTIFY_CLIENT_ID=seu_client_id
   SPOTIFY_CLIENT_SECRET=seu_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:5002/api/spotify/callback
   ```

### Execução

1. Inicie o backend:
   ```
   cd backend
   npm run dev
   ```

2. Inicie o frontend:
   ```
   cd frontend
   npm start
   ```

3. Acesse o sistema no navegador:
   ```
   http://localhost:3000
   ```

### Testando as Conexões com Plataformas Sociais

#### Através da Interface Web

Após configurar as credenciais e iniciar o sistema:

1. Faça login no sistema
2. Navegue até a página "Redes Sociais"
3. Para cada plataforma, clique no botão "Conectar"
4. Você será redirecionado para a página de autorização da plataforma
5. Após autorizar, você será redirecionado de volta ao sistema
6. A plataforma deve aparecer como "Conectada" no painel

#### Usando o Script de Teste Automatizado

O projeto inclui um script para testar automaticamente as conexões com as plataformas sociais:

1. Certifique-se de que o servidor backend esteja rodando:
   ```
   cd backend
   npm run dev
   ```

2. Em outro terminal, execute o script de teste:
   ```
   cd backend
   npm run test-connections
   ```

3. Para testar uma plataforma específica:
   ```
   # Exemplo para testar apenas YouTube
   npm run test-connections:youtube
   
   # Plataformas disponíveis:
   # - youtube
   # - instagram
   # - twitter
   # - linkedin
   # - tiktok
   # - spotify
   # - all (todas)
   ```

O script vai:
- Verificar se as variáveis de ambiente estão configuradas
- Verificar se há tokens no banco de dados
- Testar a conexão com cada plataforma
- Fornecer URLs de autenticação para plataformas não conectadas

### Testando as Credenciais e Gerando URLs de Autorização

O projeto inclui uma ferramenta para testar suas credenciais de API e gerar URLs de autorização OAuth:

```
cd backend
node test-oauth.js [plataforma]
```

Onde `[plataforma]` pode ser:
- `youtube` - Testar credenciais do YouTube e gerar URL
- `instagram` - Testar credenciais do Instagram e gerar URL
- `twitter` - Testar credenciais do Twitter
- `linkedin` - Testar credenciais do LinkedIn e gerar URL
- `spotify` - Testar credenciais do Spotify e gerar URL
- `tiktok` - Testar credenciais do TikTok e gerar URL
- `all` - Testar todas as plataformas

Exemplo:
```
node test-oauth.js youtube
```

Este comando verificará se suas credenciais do YouTube estão configuradas e gerará uma URL de autorização que você pode usar para conectar sua conta.

### Verificando o Status das Conexões

Para verificar se uma plataforma está corretamente conectada:

1. Acesse as rotas de verificação de conexão para cada plataforma:
   - YouTube: `/api/youtube/check-connection`
   - Instagram: `/api/instagram/check-connection`
   - Twitter: `/api/twitter/check-connection`
   - LinkedIn: `/api/linkedin/check-connection`
   - TikTok: `/api/tiktok/check-connection`
   - Spotify: `/api/spotify/check-connection`

2. Estas rotas retornarão o status da conexão e dados básicos do perfil

### Checklist de Verificação para Cada Plataforma

Use este checklist para garantir que cada plataforma esteja corretamente configurada e conectada:

#### YouTube
- [ ] Credenciais configuradas no `.env`
- [ ] OAuth URI correspondente ao configurado no Google Developer Console
- [ ] API Data v3 habilitada no console do Google
- [ ] Autorização concluída com sucesso
- [ ] Rota `/api/youtube/check-connection` retorna status "connected"
- [ ] Sistema exibe informações do canal do YouTube

#### Instagram
- [ ] Credenciais configuradas no `.env`
- [ ] URI de redirecionamento configurada no Facebook Developer Portal
- [ ] Autorizações necessárias concedidas
- [ ] Autorização concluída com sucesso
- [ ] Rota `/api/instagram/check-connection` retorna status "connected"
- [ ] Sistema exibe nome de usuário e foto do perfil

#### Twitter
- [ ] Credenciais configuradas no `.env`
- [ ] URI de callback configurada no Twitter Developer Portal
- [ ] Permissões de leitura/escrita concedidas ao aplicativo
- [ ] Autorização concluída com sucesso
- [ ] Rota `/api/twitter/check-connection` retorna status "connected"
- [ ] Sistema exibe nome de usuário e foto do perfil

#### LinkedIn
- [ ] Credenciais configuradas no `.env`
- [ ] URI de redirecionamento configurada no LinkedIn Developer Portal
- [ ] Permissões r_liteprofile, r_emailaddress e w_member_social concedidas
- [ ] Autorização concluída com sucesso
- [ ] Rota `/api/linkedin/check-connection` retorna status "connected"
- [ ] Sistema exibe nome e foto do perfil profissional

#### TikTok
- [ ] Credenciais configuradas no `.env`
- [ ] URI de redirecionamento configurada no TikTok Developer Portal
- [ ] Escopos necessários configurados
- [ ] Autorização concluída com sucesso
- [ ] Rota `/api/tiktok/check-connection` retorna status "connected"
- [ ] Sistema exibe nome de usuário e foto do perfil

#### Spotify
- [ ] Credenciais configuradas no `.env`
- [ ] URI de redirecionamento configurada no Spotify Developer Dashboard
- [ ] Autorização concluída com sucesso
- [ ] Rota `/api/spotify/check-connection` retorna status "connected"
- [ ] Sistema exibe nome de usuário e detalhes da conta

### Próximos Passos para Configuração

Para concluir a configuração das plataformas, siga estas etapas:

1. **Obter Credenciais Reais**
   - Acesse os portais de desenvolvedor de cada plataforma conforme detalhado nas seções anteriores
   - Crie os aplicativos e obtenha as credenciais (Client ID/Secret, API Key/Secret, etc.)
   - Configure as URLs de callback exatamente como definidas no arquivo `.env`
   - Atualize o arquivo `.env` com as credenciais reais

2. **Testar Credenciais e URLs de Autorização**
   - Use a ferramenta `test-oauth.js` para verificar se suas credenciais estão corretas
   - Gere as URLs de autorização para cada plataforma

3. **Autenticar com Cada Plataforma**
   - Acesse as URLs de autorização geradas
   - Autorize o acesso à sua conta em cada plataforma
   - Verifique se você é redirecionado corretamente para a URL de callback

4. **Verificar o Status das Conexões**
   - Use o script `test-connections.js` para verificar o status de todas as conexões
   - Ou acesse as rotas `/api/[plataforma]/check-connection` para cada plataforma

5. **Configurar e Atualizar Tokens**
   - Verifique se o mecanismo de renovação automática de tokens está funcionando
   - Monitore os logs do servidor para possíveis erros na renovação de tokens

### Solução de Problemas

#### Problemas Comuns

1. **Erro de Autenticação**
   - Verifique se os Client IDs e Secrets estão corretos
   - Confirme se as URLs de redirecionamento cadastradas nos portais de desenvolvedores correspondem exatamente às configuradas no sistema

2. **Erro de Callback**
   - Verifique as URLs de redirecionamento em cada plataforma
   - Certifique-se de que a porta do servidor corresponde à configurada nas URLs (5002)

3. **Tokens Expirados**
   - O sistema deve renovar automaticamente tokens expirados
   - Verifique os logs do servidor para possíveis erros na renovação de tokens
   - Se necessário, desconecte e reconecte a plataforma afetada

4. **Erros de Permissão**
   - Verifique se as permissões necessárias foram solicitadas na configuração do aplicativo
   - Reconecte a plataforma e aceite todas as permissões solicitadas

## Coleta Automática de Métricas

O sistema inclui um serviço automático de coleta de métricas que:

- Atualiza regularmente as estatísticas de todas as publicações
- Usa frequências diferentes com base na idade da publicação:
  - Publicações de 0-24h: atualização a cada 1h
  - Publicações de 1-7 dias: atualização a cada 6h
  - Publicações de 7-30 dias: atualização a cada 24h
  - Publicações mais antigas: atualização semanal
- Possui fallback para dados simulados quando as APIs não estão disponíveis

### Endpoints de Administração de Métricas

Os seguintes endpoints estão disponíveis para administradores:

- `POST /api/metrics/collector/start`: Inicia o serviço de coleta
- `POST /api/metrics/collector/stop`: Para o serviço de coleta
- `POST /api/metrics/collector/run`: Força a execução imediata
- `GET /api/metrics/collector/status`: Verifica o status do coletor

Usuários autorizados também podem forçar a atualização de métricas para publicações específicas:
- `POST /api/metrics/update/:publicationId`: Atualiza métricas de uma publicação

## Deploy com Render

Este projeto está configurado para deploy automático no Render.

### Configuração no Render

1. Crie uma conta no [Render](https://render.com)
2. Conecte seu repositório Git
3. Configure um "Blueprint" utilizando o arquivo `render.yaml` presente neste repositório
4. Configure as variáveis de ambiente conforme a documentação

### Variáveis de Ambiente para Produção

- Atualize todas as URLs de redirecionamento nas variáveis de ambiente para apontar para seu domínio no Render
- Exemplo: `https://lancei-essa-api.onrender.com/api/youtube/callback`

## Licença

Copyright © 2025 Lancei Essa Sistema. Todos os direitos reservados.