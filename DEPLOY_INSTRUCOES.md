# Instruções para Deploy no Render

Siga estas instruções passo a passo para deploy do sistema Lancei Essa no Render.

## 1. Preparando o Repositório Git

Se você ainda não fez push do código para um repositório remoto:

```bash
# Adicionar o repositório remoto (substitua pela URL do seu repositório)
git remote add origin https://github.com/seu-usuario/lancei-essa-sistema.git

# Fazer push do código
git push -u origin main
```

## 2. Criando Conta no Render

1. Acesse [render.com](https://render.com) e crie uma conta (ou faça login)
2. Você pode usar sua conta GitHub/GitLab para um registro mais rápido

## 3. Deployment via Blueprint (Mais Fácil)

1. No Dashboard do Render, clique em "New" e selecione "Blueprint"
2. Conecte seu repositório GitHub/GitLab
3. Selecione o repositório do projeto
4. O Render detectará automaticamente o arquivo `render.yaml` e configurará os serviços
5. Revise as configurações e clique em "Apply"

## 4. Configurando Variáveis de Ambiente

Depois que os serviços forem criados, você precisará configurar as variáveis de ambiente:

1. Para cada serviço no Render, vá para a seção "Environment"
2. Adicione as seguintes variáveis (substitua pelos valores reais):

### Para o Backend:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://seu-usuario:sua-senha@cluster.mongodb.net/lancei-essa
JWT_SECRET=seu-segredo-jwt

# URLs de Callback ajustadas para o domínio no Render
YOUTUBE_REDIRECT_URI=https://lancei-essa-api.onrender.com/api/youtube/callback
TWITTER_CALLBACK_URL=https://lancei-essa-api.onrender.com/api/twitter/callback
LINKEDIN_REDIRECT_URI=https://lancei-essa-api.onrender.com/api/linkedin/callback
INSTAGRAM_REDIRECT_URI=https://lancei-essa-api.onrender.com/api/instagram/callback
TIKTOK_REDIRECT_URI=https://lancei-essa-api.onrender.com/api/tiktok/callback
SPOTIFY_REDIRECT_URI=https://lancei-essa-api.onrender.com/api/spotify/callback

# Credenciais das APIs (use as mesmas do seu ambiente de desenvolvimento)
YOUTUBE_CLIENT_ID=seu-client-id-do-youtube
YOUTUBE_CLIENT_SECRET=seu-client-secret-do-youtube
# ... (demais credenciais)
```

### Para o Frontend:

```
REACT_APP_API_URL=https://lancei-essa-api.onrender.com
```

## 5. Forçando um Redeploy (Se Necessário)

Se você precisar forçar um redeploy:

1. Acesse o serviço no Dashboard do Render
2. Vá para a seção "Manual Deploy"
3. Clique em "Deploy latest commit"

## 6. Verificando Logs

Para verificar logs e diagnosticar problemas:

1. Acesse o serviço no Dashboard do Render
2. Vá para a seção "Logs"
3. Acompanhe os logs em tempo real

## 7. Configurando um Domínio Personalizado (Opcional)

1. Acesse o serviço no Dashboard do Render
2. Vá para a seção "Settings" > "Custom Domains"
3. Adicione seu domínio personalizado
4. Siga as instruções para configurar os registros DNS

## 8. Importante: Atualizando as Credenciais de API

Em produção, você precisará atualizar as configurações de redirecionamento nos portais de desenvolvedor de cada plataforma:

1. No portal de desenvolvedor de cada plataforma (YouTube, Twitter, etc.), atualize as URLs de redirecionamento para apontar para seu domínio no Render
2. Exemplo: `https://lancei-essa-api.onrender.com/api/youtube/callback`

## 9. Testando as Conexões

Depois que o deploy estiver concluído:

1. Acesse a interface web do sistema
2. Navegue até a seção de redes sociais
3. Tente conectar cada plataforma
4. Verifique se os callbacks estão funcionando corretamente

## 10. Monitoramento

Configure alertas no Render para ser notificado sobre problemas:

1. Acesse o serviço no Dashboard do Render
2. Vá para a seção "Alerting"
3. Configure alertas para falhas de deploy, uso de CPU, etc.

---

Se encontrar problemas durante o deploy, verifique os logs no Render e revise as configurações das variáveis de ambiente.