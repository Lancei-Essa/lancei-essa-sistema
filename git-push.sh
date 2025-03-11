#!/bin/bash
cd /Users/rogerioresende/Desktop/lancei-essa-sistema

# Adicionar todos os arquivos modificados
git add .

# Criar um commit com mensagem descritiva
git commit -m "Melhoria na integração com a API do YouTube:
- Corrigido erro 500 no endpoint de métricas
- Melhorado tratamento de erros no frontend e backend
- Adicionado endpoint de teste para diagnóstico
- Expandidos escopos da API para acesso adequado
- Removida geração de dados simulados"

# Enviar para o repositório remoto
git push origin main
