#!/bin/bash
cd /Users/rogerioresende/Desktop/lancei-essa-sistema

# Adicionar todos os arquivos modificados
git add .

# Criar um commit com mensagem descritiva
git commit -m "Melhorias na integração com a API do YouTube:
- Adicionado endpoint para verificar escopos do token
- Adicionado endpoint para forçar reconexão com novos escopos
- Aprimorado sistema de logs para diagnóstico de erros
- Melhorada interface para mostrar erros detalhados
- Adicionado botão de reconexão para resolver problemas de permissão"

# Enviar para o repositório remoto
git push origin main
