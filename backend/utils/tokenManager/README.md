# Sistema de Gerenciamento de Tokens

Este módulo centraliza todas as operações de gerenciamento de tokens para as diferentes plataformas de mídia social integradas ao sistema.

## Funcionalidades

### Cache de Tokens
- Armazenamento em memória de tokens para acesso rápido
- Evita consultas desnecessárias ao banco de dados
- Melhora performance das operações que exigem tokens

### Renovação Automática
- Verificação e renovação de tokens antes da expiração
- Suporte para múltiplas plataformas com diferentes fluxos de autenticação
- Atualização automática no banco de dados e no cache

### Segurança
- Centralização da lógica de manipulação de tokens
- Validação e verificação consistente entre plataformas
- Gerenciamento de ciclo de vida de tokens

## API

### Funções de Cache

- **getToken(userId, platform)** - Obtém um token do cache
- **setToken(userId, platform, tokenData)** - Adiciona ou atualiza um token no cache
- **removeToken(userId, platform)** - Remove um token do cache
- **clearCache([userId])** - Limpa todo o cache ou apenas os tokens de um usuário
- **getCacheStats()** - Obtém estatísticas do cache

### Funções de Renovação

- **ensureFreshToken(userId, platform)** - Verifica e renova o token se necessário
- **initUserTokens(userId)** - Inicializa tokens para um usuário no cache
- **scheduleTokenRefresh(interval)** - Programa verificação periódica de tokens

## Plataformas Suportadas

- YouTube
- Twitter
- LinkedIn
- Instagram
- Spotify
- TikTok

## Exemplos de Uso

### Obter Token Fresco para uma Operação

```javascript
const tokenManager = require('../utils/tokenManager');

// Em qualquer controller ou service que precise de um token
async function algumMetodo(req, res) {
  try {
    const userId = req.user._id.toString();
    
    // Obter token válido (será renovado automaticamente se necessário)
    const token = await tokenManager.ensureFreshToken(userId, 'youtube');
    
    // Usar o token para fazer requisição à API externa
    const result = await youtubeService.algumMetodo(token.accessToken);
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Erro de autenticação com a plataforma'
    });
  }
}
```

### Inicializar Tokens na Autenticação

```javascript
// Após o login do usuário
app.post('/api/auth/login', async (req, res) => {
  // Lógica de autenticação...
  
  // Após autenticar com sucesso:
  await tokenManager.initUserTokens(user._id);
  
  res.json({ success: true, token: jwtToken });
});
```

### Salvar Novo Token Após Autorização OAuth

```javascript
// No callback de OAuth
app.get('/api/youtube/callback', async (req, res) => {
  // Obter tokens da plataforma...
  
  // Salvar no banco de dados...
  
  // Adicionar ao cache
  tokenManager.setToken(req.user._id.toString(), 'youtube', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date
  });
  
  res.redirect('/success');
});
```

## Implementação

### Estrutura de Arquivos

- `index.js` - Exporta todas as funções do gerenciador
- `tokenCache.js` - Sistema de cache em memória
- `tokenRefresher.js` - Lógica de renovação automática

## Inicialização do Sistema

Para iniciar o sistema de renovação automática de tokens, adicione ao arquivo principal:

```javascript
const tokenManager = require('./utils/tokenManager');

// Iniciar renovação automática (a cada 1 hora)
tokenManager.scheduleTokenRefresh(60 * 60 * 1000);
```