/**
 * Script para ajudar na configuração do redirecionamento do YouTube
 */

console.log(`
=== CONFIGURAÇÃO DE REDIRECIONAMENTO DO YOUTUBE ===

O URI de redirecionamento configurado neste projeto é:
http://localhost:5002/api/youtube/oauth2callback

Mas nas credenciais OAuth2 do Google Cloud Console, você tem as seguintes URIs configuradas:
1. http://localhost:5002/api/youtube/callback
2. http://localhost:5002/api/youtube/auth/callback  
3. http://localhost:5002/api/youtube/oauth2callback
4. https://lancei-essa-sistema.onrender.com/api/youtube/oauth2callback

Certifique-se de que a URI usada no sistema (YOUTUBE_REDIRECT_URI) está na lista de URIs autorizadas
no Google Cloud Console.

As URIs configuradas estão corretas, então o processo de autenticação deve funcionar.

Agora, teste a integração do YouTube com os seguintes comandos:

1. Primeiro, teste a API sem autenticação (apenas com a chave API):
   node scripts/test-youtube-sync-simple.js

2. Em seguida, teste a autenticação OAuth2:
   node scripts/test-youtube-oauth-simple.js

Siga as instruções nos scripts para concluir o processo de autenticação.
`);
