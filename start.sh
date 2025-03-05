#!/bin/bash

# Definir cores para melhor visibilidade
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Obter o diretório absoluto do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}=== Iniciando o Sistema Lancei Essa ===${NC}"

# Verificar se os diretórios existem
if [ ! -d "$SCRIPT_DIR/backend" ] || [ ! -d "$SCRIPT_DIR/frontend" ]; then
  echo -e "${RED}Erro: Diretórios backend ou frontend não encontrados.${NC}"
  echo "Execute este script na pasta raiz do projeto."
  exit 1
fi

# Criar arquivo .env no backend se não existir
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  echo -e "${BLUE}Criando arquivo .env para o backend...${NC}"
  cat > "$SCRIPT_DIR/backend/.env" << EOF
PORT=5002
MONGO_URI=mongodb://localhost:27017/lancei-essa
JWT_SECRET=lancei-essa-chave-secreta-teste-123
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5002/api/youtube/auth/callback
EOF
  echo -e "${GREEN}Arquivo .env criado com sucesso${NC}"
fi

# Verificar e instalar dependências
echo -e "${BLUE}Verificando dependências no backend...${NC}"
cd "$SCRIPT_DIR/backend"

# Verificar dependências críticas
if ! npm ls instagram-private-api --silent 2>/dev/null; then
  echo -e "${YELLOW}Instalando instagram-private-api...${NC}"
  npm install instagram-private-api --save
fi

if ! npm ls oauth-1.0a --silent 2>/dev/null; then
  echo -e "${YELLOW}Instalando oauth-1.0a...${NC}"
  npm install oauth-1.0a --save
fi

# Instalar todas as dependências se necessário
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}Instalando todas as dependências do backend...${NC}"
  npm install
fi

# Iniciar o backend em background
echo -e "${GREEN}Iniciando o backend...${NC}"

# Tentar executar diretamente o servidor node (sem nodemon) primeiro, para diagnóstico
echo -e "${BLUE}Teste rápido de inicialização do servidor...${NC}"
node -e "
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Teste OK'));
const server = app.listen(5002, () => {
  console.log('Servidor de teste funcionando!');
  server.close(() => console.log('Servidor de teste encerrado'));
});" || echo -e "${RED}Falha no teste básico do servidor Express. Verificando erros...${NC}"

# Iniciar com nodemon para desenvolvimento
npm run dev &
BACKEND_PID=$!
echo "Backend rodando com PID: $BACKEND_PID"

# Aguardar um pouco para o backend iniciar
echo "Aguardando o backend iniciar..."
sleep 15  # Aumentado para 15 segundos para dar mais tempo para inicialização do backend

# Verificar se o backend está rodando
echo -e "${BLUE}Verificando se o backend está acessível...${NC}"
MAX_ATTEMPTS=5
ATTEMPTS=0
BACKEND_READY=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS+1))
  
  if curl -s http://localhost:5002 > /dev/null; then
    echo -e "${GREEN}Backend está respondendo!${NC}"
    BACKEND_READY=true
    break
  else
    echo -e "${YELLOW}Tentativa $ATTEMPTS/$MAX_ATTEMPTS: Backend ainda não está respondendo...${NC}"
    sleep 3
  fi
done

if [ "$BACKEND_READY" = false ]; then
  echo -e "${YELLOW}Aviso: Backend não parece estar respondendo, mas continuando mesmo assim...${NC}"
  echo -e "${YELLOW}Você pode precisar reiniciar o script caso encontre problemas de conexão.${NC}"
else
  echo -e "${GREEN}Backend inicializado e pronto!${NC}"
fi

# Iniciar o frontend
echo -e "${GREEN}Iniciando o frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

# Verificar se é necessário instalar as dependências do frontend
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}Instalando dependências do frontend...${NC}"
  npm install
fi

# Procurar por uma porta disponível para o frontend (alternativa à porta 3000)
FRONTEND_PORT=3001

# Verificar se a porta já está em uso
while nc -z localhost $FRONTEND_PORT 2>/dev/null; do
  echo -e "${YELLOW}Porta $FRONTEND_PORT já está em uso. Tentando porta seguinte...${NC}"
  FRONTEND_PORT=$((FRONTEND_PORT+1))
done

echo -e "${YELLOW}Tentando iniciar o frontend na porta $FRONTEND_PORT...${NC}"
REACT_APP_API_URL=http://localhost:5002 PORT=$FRONTEND_PORT npm start &
FRONTEND_PID=$!
echo "Frontend rodando com PID: $FRONTEND_PID"

echo -e "${YELLOW}=== Sistema Lancei Essa iniciado com sucesso! ===${NC}"
echo -e "Backend: ${GREEN}http://localhost:5002${NC}"
echo -e "Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo ""
echo -e "${BLUE}Pressione Ctrl+C para encerrar ambos os serviços${NC}"

# Função para capturar Ctrl+C e encerrar os processos corretamente
trap ctrl_c INT
function ctrl_c() {
    echo -e "${YELLOW}Encerrando serviços...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Todos os serviços foram encerrados.${NC}"
    exit 0
}

# Manter o script rodando para poder encerrar os serviços depois
wait