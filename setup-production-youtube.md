# Configuração do YouTube API para Produção

Este documento descreve os passos necessários para configurar a integração do YouTube API no ambiente de produção (Render).

## Passos para configuração

1. **Configuração no Google Cloud Console**:
   - Acesse o [Google Cloud Console](https://console.cloud.google.com/)
   - Navegue até "APIs e Serviços" > "Credenciais"
   - Edite o ID do cliente OAuth2 existente
   - Adicione a seguinte URI de redirecionamento autorizada:
     ```
     https://lancei-essa-sistema.onrender.com/api/youtube/oauth2callback
     ```
   - Salve as alterações

2. **Verificar variáveis de ambiente no Render**:
   - Acesse o painel do Render
   - Navegue até o serviço backend "lancei-essa-sistema"
   - Verifique se as seguintes variáveis de ambiente estão configuradas:
     - `YOUTUBE_CLIENT_ID`: 1035705950747-7ufvkqo5iijci818aucg1ragkgjgbeel.apps.googleusercontent.com
     - `YOUTUBE_CLIENT_SECRET`: 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
     - `YOUTUBE_REDIRECT_URI`: https://lancei-essa-sistema.onrender.com/api/youtube/oauth2callback
     - `YOUTUBE_API_KEY`: AIzaSyBM8B04URwJrCj_N1pO85FqXQs57CwnMoE
     - `TOKEN_ENCRYPTION_KEY`: Valor seguro para criptografia de tokens

3. **Testar a integração no ambiente de produção**:
   - Acesse o frontend em: https://lancei-essa-sistema-front.onrender.com
   - Navegue até as configurações de integração do YouTube
   - Tente conectar sua conta do YouTube
   - Verifique se o fluxo de autenticação OAuth2 funciona corretamente
   - Verifique se a integração da API está funcionando para listar vídeos e estatísticas

## Resolução de problemas

Se encontrar problemas na integração, verifique os seguintes pontos:

1. **Erros de CORS**:
   - Confirme que a origem do frontend está permitida no backend
   - Adicione `https://lancei-essa-sistema-front.onrender.com` à lista de origens permitidas

2. **Erros de autenticação OAuth2**:
   - Verifique se a URI de redirecionamento está exatamente igual no Google Cloud Console e nas variáveis de ambiente
   - Certifique-se de que a API do YouTube está ativada no projeto do Google Cloud
   - Verifique os logs do backend para mensagens de erro detalhadas

3. **Erros na API do YouTube**:
   - Verifique se a chave API está ativa e configurada corretamente
   - Confirme que a API do YouTube Data v3 está ativada no projeto
   - Verifique se há limites de quota excedidos

## Atualizações e manutenção

Para atualizar as credenciais ou configurações:

1. Atualize o arquivo `render.yaml` com as novas variáveis de ambiente
2. Atualize os arquivos `.env.production` no backend e frontend conforme necessário
3. Faça commit das alterações para o GitHub
4. O Render redeploy acontecerá automaticamente quando as alterações forem detectadas
