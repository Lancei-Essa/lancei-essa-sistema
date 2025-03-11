# Instruções de Deploy para o Lancei Essa Sistema

Este documento contém instruções passo a passo para fazer o deploy da aplicação Lancei Essa Sistema no Render, incluindo a configuração para integração com a API do YouTube.

## 1. Preparar o repositório para o GitHub

1. Confirme que as alterações estão testadas localmente:
   ```bash
   # Testar a integração com o YouTube localmente
   cd /Users/rogerioresende/Desktop/lancei-essa-sistema/backend
   node scripts/test-youtube-api.js
   
   # Testar a configuração de produção
   NODE_ENV=production node scripts/test-youtube-production.js
   ```

2. Commitar as alterações para o GitHub:
   ```bash
   cd /Users/rogerioresende/Desktop/lancei-essa-sistema
   
   # Adicionar todos os arquivos modificados
   git add .
   
   # Criar commit com mensagem descritiva
   git commit -m "Implementa integração com API do YouTube e configuração de produção"
   
   # Enviar para o GitHub
   git push origin main
   ```

## 2. Configurar o Render

1. Acesse o [Dashboard do Render](https://dashboard.render.com)

2. Navegue até o serviço backend "lancei-essa-sistema"

3. Verifique e atualize as variáveis de ambiente:
   - `NODE_ENV`: production
   - `PORT`: 5000
   - `API_BASE_URL`: https://lancei-essa-sistema.onrender.com
   - `MONGODB_URI`: (valor configurado no Render)
   - `JWT_SECRET`: (valor configurado no Render)
   - `TOKEN_ENCRYPTION_KEY`: (valor configurado no Render)
   - `YOUTUBE_CLIENT_ID`: 1035705950747-7ufvkqo5iijci818aucg1ragkgjgbeel.apps.googleusercontent.com
   - `YOUTUBE_CLIENT_SECRET`: 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
   - `YOUTUBE_REDIRECT_URI`: https://lancei-essa-sistema.onrender.com/api/youtube/oauth2callback
   - `YOUTUBE_API_KEY`: AIzaSyBM8B04URwJrCj_N1pO85FqXQs57CwnMoE

4. Navegue até o serviço frontend "lancei-essa-sistema-front"

5. Verifique e atualize as variáveis de ambiente:
   - `NODE_ENV`: production
   - `REACT_APP_API_URL`: https://lancei-essa-sistema.onrender.com

6. Manual deploy (se necessário):
   - Clique em "Manual Deploy" > "Deploy latest commit" para ambos os serviços
   - Comece pelo backend, depois faça o deploy do frontend

## 3. Configurar o Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)

2. Navegue até "APIs e Serviços" > "Credenciais"

3. Edite o ID do cliente OAuth2 existente:
   - Selecione o cliente OAuth2 criado para o projeto
   - Adicione o URI de redirecionamento para produção:
     ```
     https://lancei-essa-sistema.onrender.com/api/youtube/oauth2callback
     ```
   - Salve as alterações

4. Verifique se a API do YouTube Data v3 está ativada:
   - Navegue até "APIs e Serviços" > "Biblioteca"
   - Pesquise por "YouTube Data API v3"
   - Certifique-se de que está "Ativada"

## 4. Testar a integração no ambiente de produção

1. Acesse o frontend em: https://lancei-essa-sistema-front.onrender.com

2. Faça login no sistema

3. Navegue até as configurações de integração do YouTube:
   - Verifique se o botão "Conectar ao YouTube" está sendo exibido
   - Clique no botão para iniciar o fluxo de autenticação
   - Faça login com sua conta do Google e autorize o acesso
   - Confirme que você é redirecionado de volta para o aplicativo
   - Verifique se o status mostra "Conectado ao YouTube"

4. Teste as funcionalidades da integração:
   - Navegue até a seção de análise do YouTube para verificar estatísticas
   - Tente fazer upload de um vídeo de teste (se aplicável)
   - Verifique se os dados do canal são exibidos corretamente

## 5. Resolução de problemas comuns

### Erro "invalid_client" na autenticação OAuth2:
- Verifique se o CLIENT_ID e CLIENT_SECRET estão corretos
- Confirme que a URL de redirecionamento está exatamente igual no Google Cloud e no Render
- Verifique se o projeto no Google Cloud está correto e ativo

### Erro "API key not valid":
- Verifique se a chave API está correta no Render
- Confirme que a API do YouTube Data v3 está ativada no projeto
- Verifique se há restrições na chave API que estão impedindo seu uso

### Problemas de CORS:
- Adicione a origem do frontend à lista de origens permitidas no backend
- Exemplo: `https://lancei-essa-sistema-front.onrender.com`

### Erro 404 em rotas da API:
- Verifique se o backend está rodando corretamente no Render
- Confirme que as rotas da API estão implementadas no backend
- Teste a API diretamente usando ferramentas como Postman

## 6. Monitoramento e manutenção

1. Monitore os logs do Render regularmente:
   - Navegue até o serviço no Render
   - Clique na aba "Logs"
   - Verifique se há erros ou warnings

2. Verifique o uso da quota da API do YouTube:
   - Acesse o [Google Cloud Console](https://console.cloud.google.com/)
   - Navegue até "APIs e Serviços" > "Painel"
   - Monitore o uso da API do YouTube Data v3

3. Atualizações futuras:
   - Sempre teste as alterações localmente antes do deploy
   - Atualize os arquivos `.env.production` conforme necessário
   - Mantenha o `render.yaml` atualizado com as configurações mais recentes
