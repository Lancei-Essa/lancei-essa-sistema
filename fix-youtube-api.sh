#!/bin/bash
cd /Users/rogerioresende/Desktop/lancei-essa-sistema

# Adicionar todos os arquivos modificados
git add backend/controllers/youtubeController.js
git add backend/services/youtube.js
git add backend/routes/youtube.js
git add frontend/src/pages/YouTubeAnalytics.js

# Criar um commit com mensagem detalhada
git commit -m "Correção de erros na API do YouTube:
- Correção do erro 'Cannot read properties of undefined (reading 'id')' em youtubeController
- Adição explícita do escopo yt-analytics.readonly para métricas e analytics
- Rota para forçar reconexão sem autenticação prévia adicionada
- Melhoria na UI do YouTube Analytics com botão de reconexão forçada
- Adição de mensagens de erro mais detalhadas para o usuário
- Uso de window.confirm() em conformidade com ESLint"

# Enviar para o repositório remoto
git push origin main

echo "✅ As correções foram enviadas para o GitHub!"
echo "ℹ️ Aguarde alguns minutos para que o Render.com faça o deploy automático."
echo "🔄 Após o deploy, acesse a página de YouTube Analytics e use o botão 'Forçar Reconexão'."
echo "⚠️ IMPORTANTE: Ao reconectar, aceite TODAS as permissões solicitadas pelo Google."
