# Project Prometheus

> Plataforma full-stack para criar e acompanhar roadmaps de estudo personalizados com IA.

![Python](https://img.shields.io/badge/Python-3.12+-blue)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688)
![React](https://img.shields.io/badge/React-frontend-61DAFB)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Como rodar localmente](#como-rodar-localmente)
- [API](#api)
- [Modelo de dados](#modelo-de-dados)
- [Testes](#testes)
- [Troubleshooting](#troubleshooting)
- [Segurança](#segurança)
- [Deploy](#deploy)
- [Contribuição](#contribuição)
- [Progresso do Projeto](#progresso-do-projeto)

---

## Visão geral

Você informa **objetivo**, **tempo disponível** e **nível atual** — a IA monta um roadmap estruturado em módulos e tópicos. Dá pra marcar o que foi concluído, acompanhar o progresso em tempo real e configurar notificações por roadmap.

**Stack:**

| Camada         | Tecnologia                               |
|----------------|------------------------------------------|
| Backend        | FastAPI (Python)                         |
| Frontend       | React + CRACO + Tailwind CSS             |
| Autenticação   | Supabase Auth (JWT)                      |
| Banco de dados | PostgreSQL + SQLAlchemy (async) + Alembic|
| IA             | Google Gemini                            |

---

## Funcionalidades

- Cadastro e login de usuários
- Validação de sessão/token e refresh automático
- Geração de roadmap via IA
- Salvar, listar e visualizar roadmaps
- Marcar/desmarcar itens com recálculo de progresso
- Notificações de estudo configuráveis por roadmap
- Excluir roadmap
- Painel admin com listagem de usuários

---

## Arquitetura

### Backend (`backend/`)

| Arquivo             | Responsabilidade                            |
|---------------------|---------------------------------------------|
| `server.py`         | Rotas da API e regras de negócio            |
| `auth.py`           | Autenticação/validação com Supabase         |
| `database.py`       | Engine assíncrona SQLAlchemy                |
| `models.py`         | Modelos: `User`, `Roadmap`, `CompletedItem` |
| `gemini_service.py` | Integração com Gemini                       |
| `alembic/`          | Migrations                                  |

### Frontend (`frontend/src/`)

| Arquivo                        | Responsabilidade                         |
|--------------------------------|------------------------------------------|
| `App.js`                       | Roteamento e rotas protegidas            |
| `contexts/AuthContext.js`      | Estado de autenticação e token           |
| `components/Layout.js`         | Shell principal e navegação              |
| `pages/Login.js`               | Login/cadastro                           |
| `pages/Dashboard.js`           | Lista de roadmaps                        |
| `pages/RoadmapGenerator.js`    | Geração de roadmap via IA                |
| `pages/RoadmapView.js`         | Visualização, progresso e notificações   |
| `pages/AdminPanel.js`          | Usuários (admin)                         |

### Fluxo

1. Usuário cria conta ou faz login → recebe `access_token`, salvo no `localStorage`.
2. Todas as chamadas autenticadas usam `Authorization: Bearer <token>`.
3. Usuário gera um roadmap via IA → estrutura salva no banco com `total_items` e `progress`.
4. Ao marcar/desmarcar tópicos, o backend recalcula o progresso.
5. Dashboard e tela de roadmap refletem o estado em tempo real.

---

## Pré-requisitos

- Python 3.12+
- Node.js 18+
- PostgreSQL
- Conta Supabase (URL + anon key)
- Chave de API do Gemini

---

## Configuração de ambiente

### Backend — `backend/.env`

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
GEMINI_API_KEY=SUA_GEMINI_API_KEY

# Opcional
ADMIN_EMAIL=admin@dominio.com
# CORS_ORIGINS=http://localhost:3000
```

> O `.env.example` usa `postgresql+asyncpg://`, mas o código já faz essa conversão em runtime. Use `postgresql://` mesmo.

### Frontend — `frontend/.env.local`

```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_SUPABASE_URL=https://SEU-PROJETO.supabase.co
REACT_APP_SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
```

---

## Como rodar localmente

### Backend

**Windows (PowerShell)**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn server:app --reload
```

**Linux/macOS**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn server:app --reload
```

Disponível em `http://localhost:8000` — Swagger: `/docs` · ReDoc: `/redoc`

### Frontend

```bash
cd frontend
npm install
npm start
```

Disponível em `http://localhost:3000`

---

## API

### Auth

| Método | Rota                | Descrição                       |
|--------|---------------------|---------------------------------|
| POST   | `/api/auth/signup`  | Cria novo usuário               |
| POST   | `/api/auth/signin`  | Autentica e retorna token       |
| POST   | `/api/auth/refresh` | Renova token de acesso          |
| GET    | `/api/auth/me`      | Retorna dados do usuário atual  |

### Roadmaps

| Método | Rota                                       | Descrição                      |
|--------|--------------------------------------------|--------------------------------|
| POST   | `/api/roadmaps/generate`                   | Gera estrutura via IA          |
| POST   | `/api/roadmaps`                            | Salva um roadmap               |
| GET    | `/api/roadmaps`                            | Lista roadmaps do usuário      |
| GET    | `/api/roadmaps/{roadmap_id}`               | Detalha um roadmap             |
| POST   | `/api/roadmaps/{roadmap_id}/toggle-item`   | Marca/desmarca item concluído  |
| PUT    | `/api/roadmaps/{roadmap_id}/notifications` | Atualiza notificações          |
| DELETE | `/api/roadmaps/{roadmap_id}`               | Remove um roadmap              |

### Admin

| Método | Rota               | Descrição              |
|--------|--------------------|------------------------|
| GET    | `/api/admin/users` | Lista usuários (admin) |

---

## Modelo de dados

### `users`

| Campo        | Tipo      |
|--------------|-----------|
| `id`         | PK        |
| `email`      | unique    |
| `created_at` | timestamp |

### `roadmaps`

| Campo                                                                     | Tipo             |
|---------------------------------------------------------------------------|------------------|
| `id`                                                                      | PK               |
| `user_id`                                                                 | FK → `users`     |
| `title`, `description`, `goal`, `time_available`, `current_level`        | texto            |
| `structure`                                                               | JSON             |
| `progress`, `total_items`                                                 | numérico         |
| `notification_time`, `notification_enabled`                               | config           |
| `created_at`, `updated_at`                                                | timestamp        |

### `completed_items`

| Campo          | Tipo              |
|----------------|-------------------|
| `id`           | PK                |
| `roadmap_id`   | FK → `roadmaps`   |
| `item_id`      | referência        |
| `completed_at` | timestamp         |

---

## Testes

Scripts de validação e debug disponíveis na raiz e em `tests_auto/`:

- `validate_all.py`, `final_check.py`
- `debug_auth.py`, `debug_signin.py`, `generate_token.py`
- `tests_auto/*.py`

> Os scripts em `tests_auto/` usam payloads antigos (campos `topic` e `duration_weeks`). Funcionam como ponto de partida pra debug, mas os contratos atuais estão no Swagger.

---

## Troubleshooting

**`npm start` falha**
- Rode `npm install` dentro de `frontend/` antes.
- Confirme que `frontend/.env.local` está preenchido.
- Certifique que o backend está no ar em `http://localhost:8000/docs`.

**401 nas chamadas**
- Revise `SUPABASE_URL` e `SUPABASE_ANON_KEY` no `.env` do backend e no `.env.local` do frontend — os dois precisam bater.
- Faça login novamente para gerar um token fresco, ou use `POST /api/auth/refresh`.

**Geração de roadmap falhando**
- Verifique `GEMINI_API_KEY` no `.env` do backend.
- Olhe os logs do uvicorn — normalmente a resposta inválida do modelo aparece lá.

---

## Segurança

- Nunca commite `.env`, tokens ou chaves de API.
- Scripts de debug com credenciais hardcoded são pra uso local — rotacione antes de subir qualquer coisa em ambiente real.
- Em produção, defina `CORS_ORIGINS` explicitamente no lugar de `*`.

---

## Deploy

1. Provisionar banco PostgreSQL e rodar `alembic upgrade head`.
2. Configurar variáveis de ambiente no provider.
3. Subir o backend via ASGI (`uvicorn` ou `gunicorn` com worker async).
4. Build do frontend com `npm run build` e hospedar (Nginx, Vercel, etc.).
5. Restringir `CORS_ORIGINS` ao domínio do frontend.

---

## Contribuição

Branch nova pra cada coisa (`feature/`,
