#!/bin/bash

# ============================================================================
# CONEXA V3.0 - HEALTH CHECK SCRIPT
# ============================================================================
# Este script verifica se todos os serviços estão funcionando corretamente
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URLs dos serviços (ajuste conforme necessário)
API_URL="${API_URL:-https://api.conexa.seu-dominio.com}"
WEB_URL="${WEB_URL:-https://app.conexa.seu-dominio.com}"
SITE_URL="${SITE_URL:-https://conexa.seu-dominio.com}"

echo "🏥 Verificando saúde do sistema Conexa V3.0..."
echo ""

# Função para verificar serviço
check_service() {
  local name=$1
  local url=$2
  local expected_status=${3:-200}
  
  echo -n "Verificando $name... "
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  
  if [ "$response" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
    return 0
  else
    echo -e "${RED}✗ FALHOU${NC} (HTTP $response)"
    return 1
  fi
}

# Contador de falhas
failures=0

# Verificar Backend API
if ! check_service "Backend API" "$API_URL/health" 200; then
  ((failures++))
fi

# Verificar Frontend Web
if ! check_service "Frontend Web" "$WEB_URL" 200; then
  ((failures++))
fi

# Verificar Site Institucional
if ! check_service "Site Institucional" "$SITE_URL" 200; then
  ((failures++))
fi

echo ""

# Verificar banco de dados (se DATABASE_URL estiver definida)
if [ -n "$DATABASE_URL" ]; then
  echo -n "Verificando banco de dados... "
  if cd apps/api && npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
  else
    echo -e "${RED}✗ FALHOU${NC}"
    ((failures++))
  fi
  cd ../..
fi

echo ""

# Resultado final
if [ $failures -eq 0 ]; then
  echo -e "${GREEN}✅ Todos os serviços estão funcionando!${NC}"
  exit 0
else
  echo -e "${RED}❌ $failures serviço(s) com problema!${NC}"
  exit 1
fi
