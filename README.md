# Project Prometheus

> Plataforma full-stack para criação e acompanhamento de roadmaps de estudo personalizados com IA.

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
- [Progresso Do Projeto](#progresso-do-projeto)

---

## Visão geral

O StudyFlow permite que um usuário informe **objetivo**, **tempo disponível** e **nível atual**, e receba um roadmap de estudos estruturado em módulos e tópicos, gerado por IA. O usuário acompanha o progresso marcando itens concluídos e pode configurar notificações por roadmap.

**Stack:**

| Camada         | Tecnologia                              |
|----------------|------------------------------------------|
| Backend        | FastAPI (Python)                         |
| Frontend       | React + CRACO + Tailwind CSS             |
| Autenticação   | Supabase Auth (JWT)                      |
| Banco de dados | PostgreSQL + SQLAlchemy (async) + Alembic|
| IA             | Google Gemini                            |

---

## Funcionalidades

- Cadastro e login de usuários
- Validação de sessão/token e refresh
- Geração de roadmap de estudos com IA
- Salvamento, listagem e visualização detalhada de roadmaps
- Marcação/desmarcação de itens concluídos com recálculo de progresso
- Configuração de notificações de estudo por roadmap
- Exclusão de roadmap
- Painel admin com listagem de usuários

---

## Arquitetura

### Backend (`backend/`)

| Arquivo                | Responsabilidade                          |
|-------------------------|-------------------------------------------|
| `server.py`             | Rotas da API e regras de negócio          |
| `auth.py`                | Autenticação/validação com Supabase       |
| `database.py`            | Engine assíncrona SQLAlchemy              |
| `models.py`               | Modelos: `User`, `Roadmap`, `CompletedItem` |
| `gemini_service.py`      | Integração com Gemini                     |
| `alembic/`                | Migrations                                |

### Frontend (`frontend/src/`)

| Arquivo                          | Responsabilidade                        |
|-----------------------------------|-------------------------------------------|
| `App.js`                          | Roteamento e rotas protegidas             |
| `contexts/AuthContext.js`         | Estado de autenticação e token            |
| `components/Layout.js`            | Shell principal e navegação               |
| `pages/Login.js`                  | Login/cadastro                            |
| `pages/Dashboard.js`              | Lista de roadmaps                         |
| `pages/RoadmapGenerator.js`       | Geração de roadmap via IA                 |
| `pages/RoadmapView.js`            | Visualização, progresso e notificações    |
| `pages/AdminPanel.js`             | Usuários (admin)                          |

### Fluxo funcional

1. Usuário cria conta ou faz login.
2. Frontend recebe `access_token` e salva em `localStorage`.
3. Chamadas autenticadas usam header `Authorization: Bearer <token>`.
4. Usuário gera roadmap via IA.
5. Estrutura gerada é salva no banco com `total_items` e `progress`.
6. Ao marcar/desmarcar tópicos, backend recalcula progresso.
7. Dashboard e tela de roadmap refletem o estado atual.

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

Crie o arquivo com base em `backend/.env.example`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
GEMINI_API_KEY=SUA_GEMINI_API_KEY

# Opcional (controle de admin)
ADMIN_EMAIL=admin@dominio.com

# Opcional (CORS)
# CORS_ORIGINS=http://localhost:3000
```

> **Nota:** o `.env.example` mostra `postgresql+asyncpg://...`, mas o código converte `postgresql://` para async automaticamente em runtime. Use `postgresql://` para evitar erros.

### Frontend — `frontend/.env.local`

Crie com base em `frontend/.env.example`:

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

| Método | Rota                  | Descrição                  |
|--------|------------------------|------------------------------|
| POST   | `/api/auth/signup`     | Cria novo usuário            |
| POST   | `/api/auth/signin`     | Autentica e retorna token    |
| POST   | `/api/auth/refresh`    | Renova token de acesso       |
| GET    | `/api/auth/me`         | Retorna usuário autenticado  |

### Roadmaps

| Método | Rota                                          | Descrição                          |
|--------|-------------------------------------------------|--------------------------------------|
| POST   | `/api/roadmaps/generate`                        | Gera estrutura de roadmap via IA     |
| POST   | `/api/roadmaps`                                 | Salva um roadmap                     |
| GET    | `/api/roadmaps`                                 | Lista roadmaps do usuário            |
| GET    | `/api/roadmaps/{roadmap_id}`                    | Detalha um roadmap                   |
| POST   | `/api/roadmaps/{roadmap_id}/toggle-item`        | Marca/desmarca item concluído        |
| PUT    | `/api/roadmaps/{roadmap_id}/notifications`      | Atualiza notificações do roadmap     |
| DELETE | `/api/roadmaps/{roadmap_id}`                    | Remove um roadmap                    |

### Admin

| Método | Rota                | Descrição                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/admin/users`   | Lista usuários (admin)          |

> Exemplos completos de request/response para cada endpoint estão disponíveis no Swagger (`/docs`) com o servidor rodando localmente.

---

## Modelo de dados

### `users`

| Campo        | Tipo      |
|--------------|-----------|
| `id`         | PK        |
| `email`      | unique    |
| `created_at` | timestamp |

### `roadmaps`

| Campo                 | Tipo               |
|------------------------|--------------------|
| `id`                    | PK                 |
| `user_id`               | FK → `users`       |
| `title`, `description`, `goal`, `time_available`, `current_level` | texto |
| `structure`             | JSON               |
| `progress`, `total_items` | numérico         |
| `notification_time`, `notification_enabled` | config |
| `created_at`, `updated_at` | timestamp       |

### `completed_items`

| Campo          | Tipo          |
|-----------------|---------------|
| `id`             | PK            |
| `roadmap_id`     | FK → `roadmaps` |
| `item_id`        | referência    |
| `completed_at`   | timestamp     |

---

## Testes

Scripts de validação e depuração (principalmente backend/auth):

- `validate_all.py`
- `final_check.py`
- `debug_auth.py`
- `debug_signin.py`
- `generate_token.py`
- `tests_auto/*.py`

> ⚠️ Alguns scripts em `tests_auto/` usam payloads antigos (campos como `topic` e `duration_weeks`) que não refletem os modelos atuais de `POST /api/roadmaps`. Use-os como base de depuração, mas prefira validar pelos endpoints reais no Swagger.

---

## Troubleshooting

**`npm start` falha no frontend**

1. Rode `npm install` em `frontend/` antes de `npm start`.
2. Verifique versão do Node (`node -v`) e npm (`npm -v`).
3. Confirme `frontend/.env.local` preenchido.
4. Verifique se o backend está no ar (`http://localhost:8000/docs`).

**Erro de autenticação (401)**

- Confirme `SUPABASE_URL` e `SUPABASE_ANON_KEY` no backend e frontend.
- Gere novo login para renovar o token.
- Se necessário, teste o fluxo com `POST /api/auth/refresh`.

**Erro de geração de roadmap**

- Verifique `GEMINI_API_KEY` no backend.
- Confira logs do backend para resposta inválida do modelo.

---

## Segurança

- **Nunca** commitar `.env`, tokens, chaves e senhas.
- Scripts locais de debug com tokens hardcoded são material de desenvolvimento — remova/rotacione credenciais antes de qualquer uso em ambiente real.
- Defina `CORS_ORIGINS` explicitamente em produção (evite `*`).

---

## Deploy

1. Provisionar banco PostgreSQL e aplicar migrations (`alembic upgrade head`).
2. Configurar variáveis de ambiente no provider de hospedagem.
3. Servir o backend via ASGI (`uvicorn`/`gunicorn` com worker adequado).
4. Compilar o frontend (`npm run build`) e hospedar (Nginx/Vercel/etc.).
5. Restringir CORS ao domínio do frontend em produção.

---

## Contribuição

1. Crie uma branch: `feature/minha-feature`
2. Faça mudanças pequenas e focadas
3. Atualize este README quando alterar fluxo ou comandos
4. Abra um PR com descrição objetiva: o que mudou, por quê, como validar

---

## Progresso do Projeto
- [x] Criar roadmaps com feedback visual para progresso.
- [x] Criar "meu perfil" com foto, descrição e espaço para futuros badges
- [ ] Adicionar diagramas (arquitetura, fluxo de auth, ciclo de roadmap)
- [ ] Exemplos de request/response por endpoint crítico direto no README
- [ ] Política de versionamento semântico / changelog
- [ ] Seção de observabilidade (logs, métricas, health-check)
- [ ] Processo de deploy detalhado por ambiente (dev/staging/prod)

---

**Status atual:** projeto funcional em desenvolvimento ativo, com backend e frontend separados, autenticação integrada ao Supabase e geração de roadmap via Gemini.
