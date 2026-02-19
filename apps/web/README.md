# Font-Conexa-V2

Frontend do sistema Conexa V2 desenvolvido com React, Vite e TypeScript.

---

## Tecnologias

- **React 19.2.4** - Framework UI
- **Vite 7.3.1** - Build tool
- **TypeScript 5.9.3** - Type safety
- **React Router DOM 7.13.0** - Roteamento
- **Axios 1.13.4** - HTTP client
- **Tailwind CSS 3.4.19** - Styling

---

## Desenvolvimento

### Instalação de Dependências

```bash
npm ci
```

### Executar em Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

### Build de Produção

```bash
npm run build
```

### Preview do Build

```bash
npm run preview
```

---

## Deploy no Coolify

### Configuração

**Build Command:**
```bash
npm ci && npm run build
```

**Output Directory:**
```
dist
```

**Variáveis de Ambiente:**
```env
VITE_API_BASE_URL=https://apiconexa.casadf.com.br
```

**Domínio:**
```
https://democonexa.casadf.com.br
```

Para mais detalhes, consulte [DEPLOY.md](./DEPLOY.md).

---

## Estrutura do Projeto

```
src/
├── api/                    # Camada de API
│   ├── http.ts            # Axios instance com interceptors
│   ├── auth.ts            # Autenticação
│   ├── plannings.ts       # Planejamentos
│   ├── diary.ts           # Diário
│   ├── matrices.ts        # Matrizes curriculares
│   └── reports.ts         # Relatórios
├── app/                    # Core da aplicação
│   ├── AuthProvider.tsx   # Context de autenticação
│   ├── ProtectedRoute.tsx # Guard de rotas
│   └── router.tsx         # Configuração de rotas
├── components/
│   └── layout/            # Layout SaaS
│       ├── AppLayout.tsx  # Layout principal
│       ├── Sidebar.tsx    # Menu lateral
│       └── Topbar.tsx     # Barra superior
└── pages/                  # Páginas
    ├── LoginPage.tsx      # Login
    ├── DashboardPage.tsx  # Dashboard
    ├── PlanningsPage.tsx  # Planejamentos
    ├── DiaryPage.tsx      # Diário
    ├── MatricesPage.tsx   # Matrizes
    └── ReportsPage.tsx    # Relatórios
```

---

## Rotas

### Públicas
- `/login` - Página de login

### Protegidas (requer autenticação)
- `/app/dashboard` - Dashboard
- `/app/plannings` - Planejamentos
- `/app/diary` - Diário
- `/app/matrices` - Matrizes Curriculares
- `/app/reports` - Relatórios

---

## API Endpoints

### Autenticação
- `POST /auth/login` - Login
- `GET /example/protected` - Dados do usuário

### Planejamentos
- `GET /plannings` - Listar planejamentos

### Diário
- `GET /diary-events` - Listar eventos
- `POST /diary-events` - Criar evento

### Matrizes
- `GET /curriculum-matrices` - Listar matrizes

### Relatórios
- `GET /reports/diary/by-classroom` - Relatório por turma
- `GET /reports/diary/by-period` - Relatório por período
- `GET /reports/diary/unplanned` - Relatório não planejado

---

## Licença

Proprietary - Todos os direitos reservados
