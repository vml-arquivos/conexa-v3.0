# Scripts de Seed - Conexa V3.0

## 📋 Visão Geral

Scripts para popular o banco de dados com dados de teste e dados reais.

---

## 🌱 Seeds Disponíveis

### 1. `seed-all-users.js` (Teste)
Seed básico com dados fictícios para desenvolvimento.

**Estrutura**:
- 1 Mantenedora: Associação COCRIS
- 1 Unidade: Unidade Piloto
- 3 Turmas: A, B, C
- 13 Usuários (developer, mantenedora, staff, coordenadores, professores)

**Uso**:
```bash
node scripts/seed-all-users.js
```

---

### 2. `seed-real-data.js` (Produção) ⭐
Seed com dados REAIS da planilha ALUNOS2026.xlsx do CEPI Arara Canindé.

**Estrutura**:
- 1 Mantenedora: Associação COCRIS
- 1 Unidade: CEPI Arara Canindé
- **9 Turmas reais**:
  - Berçário I (8 alunos) - Prof. Nonata
  - Berçário II A (16 alunos) - Prof. Elisangela
  - Berçário II B (15 alunos) - Prof. Jessica
  - Maternal I A (23 alunos) - Prof. Luciene
  - Maternal I B (22 alunos) - Prof. Ana
  - Maternal I C (14 alunos) - Prof. Edilvana
  - Maternal II A (24 alunos) - Prof. Raquel
  - Maternal II B (24 alunos) - Prof. Angelica
  - Maternal II C (24 alunos) - Prof. Evellyn
- **170 Alunos reais** com dados completos (nome, nascimento, gênero)
- **13 Usuários**:
  - 1 Developer
  - 1 Admin Mantenedora
  - 1 Staff Central (Pedagógico)
  - 1 Coordenador Unidade
  - 9 Professoras (uma por turma)

**Uso**:
```bash
node scripts/seed-real-data.js
```

**Logins Disponíveis** (senha: `Teste@123`):
- `developer@conexa.com` - Acesso total
- `admin@cocris.org.br` - Admin Mantenedora
- `pedagogico@cocris.org.br` - Staff Central
- `coordenador@cepi.com.br` - Coordenador Unidade
- `nonata@cepi.com.br` - Professora Berçário I
- `elisangela@cepi.com.br` - Professora Berçário II A
- `jessica@cepi.com.br` - Professora Berçário II B
- `luciene@cepi.com.br` - Professora Maternal I A
- `ana@cepi.com.br` - Professora Maternal I B
- `edilvana@cepi.com.br` - Professora Maternal I C
- `raquel@cepi.com.br` - Professora Maternal II A
- `angelica@cepi.com.br` - Professora Maternal II B
- `evellyn@cepi.com.br` - Professora Maternal II C

---

## 🐳 Uso no Docker/Coolify

Após deploy, executar seed no container:

```bash
# Entrar no container
docker exec -it [CONTAINER_ID] /bin/sh

# Executar seed real
cd /app && node scripts/seed-real-data.js
```

---

## 📊 Fonte de Dados

Os dados reais são extraídos de:
- **Arquivo**: `datasets/turmas_alunos.json`
- **Origem**: Planilha ALUNOS2026.xlsx (CEPI Arara Canindé)
- **Processamento**: Script Python `extract_data.py`

---

## ✅ Validação

Todos os campos seguem o schema Prisma:
- `Mantenedora`: name, cnpj, email, phone, address, city, state
- `Unit`: name, code, address, city, state, email, phone
- `Classroom`: name, code, ageGroupMin, ageGroupMax, capacity
- `Child`: firstName, lastName, dateOfBirth, gender
- `User`: email, password, firstName, lastName, role

---

**Última atualização**: 2026-02-20
