#!/bin/bash

# Script para preparar o projeto para o GitHub
# Execute com: bash prepare-for-github.sh

echo "===== Preparando o projeto Lancei Essa Sistema para o GitHub ====="

# Verificar arquivos sensíveis e adicionar ao .gitignore se necessário
echo "Verificando .gitignore..."
if ! grep -q ".env" .gitignore; then
  echo "Adicionando .env ao .gitignore"
  echo ".env" >> .gitignore
fi

if ! grep -q "youtube_tokens.json" .gitignore; then
  echo "Adicionando youtube_tokens.json ao .gitignore"
  echo "youtube_tokens.json" >> .gitignore
fi

# Organizar arquivos de ambiente
echo "Organizando arquivos de ambiente..."

# Backend
echo "Verificando arquivos .env para o backend..."
if [ -f backend/.env ]; then
  echo "- backend/.env encontrado"
else
  echo "- backend/.env não encontrado, criando arquivo de exemplo"
  cp backend/.env.example backend/.env
fi

if [ -f backend/.env.production ]; then
  echo "- backend/.env.production encontrado"
else
  echo "- backend/.env.production não encontrado!"
  echo "  Por favor, crie este arquivo manualmente."
fi

# Frontend
echo "Verificando arquivos .env para o frontend..."
if [ -f frontend/.env ]; then
  echo "- frontend/.env encontrado"
else
  echo "- frontend/.env não encontrado, criando arquivo de exemplo"
  echo "REACT_APP_API_URL=http://localhost:5002" > frontend/.env
fi

if [ -f frontend/.env.production ]; then
  echo "- frontend/.env.production encontrado"
else
  echo "- frontend/.env.production não encontrado!"
  echo "  Por favor, crie este arquivo manualmente."
fi

# Verificar se o render.yaml existe
echo "Verificando render.yaml..."
if [ -f render.yaml ]; then
  echo "- render.yaml encontrado"
else
  echo "- render.yaml não encontrado!"
  echo "  Por favor, crie este arquivo manualmente."
fi

# Verificar se as instruções de deploy existem
echo "Verificando instruções de deploy..."
if [ -f deploy-instructions.md ]; then
  echo "- deploy-instructions.md encontrado"
else
  echo "- deploy-instructions.md não encontrado!"
  echo "  Por favor, crie este arquivo manualmente."
fi

# Verificar scripts de teste do YouTube
echo "Verificando scripts de teste do YouTube..."
if [ -f backend/scripts/test-youtube-api.js ]; then
  echo "- backend/scripts/test-youtube-api.js encontrado"
else
  echo "- backend/scripts/test-youtube-api.js não encontrado!"
  echo "  Por favor, crie este arquivo manualmente."
fi

if [ -f backend/scripts/test-youtube-production.js ]; then
  echo "- backend/scripts/test-youtube-production.js encontrado"
else
  echo "- backend/scripts/test-youtube-production.js não encontrado!"
  echo "  Por favor, crie este arquivo manualmente."
fi

# Status atual do Git
echo ""
echo "Status do Git:"
git status

echo ""
echo "Sugestão de comando para commitar:"
echo "git add ."
echo "git commit -m \"Implementa integração com API do YouTube e configuração de produção\""
echo "git push origin main"

echo ""
echo "===== Preparação concluída! ====="
echo "Verifique quaisquer problemas apontados acima antes de fazer o push para o GitHub."
