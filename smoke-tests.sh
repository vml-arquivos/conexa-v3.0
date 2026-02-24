#!/bin/bash
# Smoke Tests para Conexa V3.0 — PACKET V3-OPS-PRP-001

set -e

API_URL=${1:-"http://localhost:3333"}
APP_URL=${2:-"http://localhost:5173"}

RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m # No Color

echo -e "${YELLOW}🚀 Iniciando Smoke Tests para o Conexa V3.0...${NC}"

# --- Teste 1: Healthcheck da API --- #
echo "[1/5] Verificando healthcheck da API..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$API_HEALTH" -eq 200 ]; then
  echo -e "  ${GREEN}✅ API Healthcheck OK (200)${NC}"
else
  echo -e "  ${RED}❌ Falha no Healthcheck da API! Código: $API_HEALTH${NC}"
  exit 1
fi

# --- Teste 2: Healthcheck do Frontend (Web App) --- #
echo "[2/5] Verificando healthcheck do Frontend (Web App)..."
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/health")
if [ "$WEB_HEALTH" -eq 200 ]; then
  echo -e "  ${GREEN}✅ Frontend Healthcheck OK (200)${NC}"
else
  echo -e "  ${RED}❌ Falha no Healthcheck do Frontend! Código: $WEB_HEALTH${NC}"
  exit 1
fi

# --- Teste 3: CORS Headers --- #
echo "[3/5] Verificando headers de CORS na API..."
CORS_HEADER=$(curl -s -I -X OPTIONS -H "Origin: $APP_URL" -H "Access-Control-Request-Method: GET" "$API_URL/health" | grep -i "access-control-allow-origin")
if [[ "$CORS_HEADER" == *"$APP_URL"* ]]; then
  echo -e "  ${GREEN}✅ Header CORS OK para $APP_URL${NC}"
else
  echo -e "  ${RED}❌ Header CORS não encontrado ou incorreto!${NC}"
  echo "     Recebido: $CORS_HEADER"
  exit 1
fi

# --- Teste 4: Bloqueio de Dotfiles no Nginx --- #
echo "[4/5] Verificando bloqueio de .env no Nginx..."
DOTFILE_BLOCK=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/.env")
if [ "$DOTFILE_BLOCK" -eq 404 ] || [ "$DOTFILE_BLOCK" -eq 403 ]; then
  echo -e "  ${GREEN}✅ Bloqueio de .env OK (Recebido $DOTFILE_BLOCK)${NC}"
else
  echo -e "  ${RED}❌ Falha no bloqueio de .env! Código: $DOTFILE_BLOCK${NC}"
  exit 1
fi

# --- Teste 5: Endpoint de Autenticação (Login) --- #
echo "[5/5] Verificando endpoint de login (sem credenciais)..."
LOGIN_ENDPOINT=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d 																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																" '{"email":"test@test.com","password":"password"}' "$API_URL/auth/login")
if [ "$LOGIN_-eq -ge 400 ] && [ "$LOGIN_ENDPOINT" -lt 500 ]; then
  echo -e "  ${GREEN}✅ Endpoint de login responde corretamente a requisições malformadas (Recebido $LOGIN_ENDPOINT)${NC}"
else
  echo -e "  ${RED}❌ Endpoint de login não está tratando erros corretamente! Código: $LOGIN_ENDPOINT${NC}"
  exit 1
fi


echo -e "${GREEN}🎉 Todos os smoke tests passaram com sucesso!${NC}"
