# 🚀 Guia de Deploy — Empório ERP na Nuvem

## Arquitetura

| Serviço | Plataforma | URL final |
|---------|-----------|-----------|
| Frontend Next.js | Vercel | `emporio.vercel.app` |
| API NestJS | Render | `emporio-api.onrender.com` |
| Banco de Dados | Supabase | (gerenciado) |

---

## PASSO 1 — Criar banco no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **"New Project"**
3. Dê o nome `emporio-erp`, escolha a senha do banco e selecione a região **South America (São Paulo)**
4. Aguarde o banco ser criado (~2 minutos)
5. Vá em **Settings → Database**
6. Role até **Connection string** e copie dois valores:
   - **Transaction mode** → cole como `DATABASE_URL` (tem `?pgbouncer=true` no final)
   - **Direct connection** → cole como `DIRECT_URL` (sem pgbouncer)

---

## PASSO 2 — Rodar as migrações no Supabase

No seu computador, na pasta do projeto, rode:

```bash
# Defina as variáveis de ambiente com os valores do Supabase
$env:DATABASE_URL="postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Rode as migrações (cria todas as tabelas no Supabase)
cd packages/database
npx prisma migrate deploy
npx prisma generate
```

---

## PASSO 3 — Subir o código no GitHub

```bash
# Na pasta do projeto emporio:
git init
git add .
git commit -m "feat: initial commit - Empório ERP completo"

# Crie um repositório no github.com (emporio-erp) e conecte:
git remote add origin https://github.com/SEU-USUARIO/emporio-erp.git
git branch -M main
git push -u origin main
```

---

## PASSO 4 — Deploy da API no Render

1. Acesse [render.com](https://render.com) e crie uma conta gratuita
2. Clique em **"New" → "Web Service"**
3. Conecte seu repositório GitHub `emporio-erp`
4. Configure:
   - **Name:** `emporio-api`
   - **Root Directory:** *(deixe vazio — usa render.yaml)*
   - **Runtime:** Docker
   - **Dockerfile Path:** `./apps/api/Dockerfile`
5. Em **Environment Variables**, adicione:
   - `DATABASE_URL` = (Transaction mode do Supabase)
   - `DIRECT_URL` = (Direct connection do Supabase)
   - `PORT` = `3001`
   - `NODE_ENV` = `production`
6. Clique em **"Create Web Service"**
7. Aguarde o deploy (~5 minutos). Anote a URL gerada: `https://emporio-api.onrender.com`

---

## PASSO 5 — Deploy do Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com) e crie conta com GitHub
2. Clique em **"Add New → Project"**
3. Selecione o repositório `emporio-erp`
4. Configure:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (detectado automaticamente)
5. Em **Environment Variables**, adicione:
   - `DATABASE_URL` = (Transaction mode do Supabase)
   - `DIRECT_URL` = (Direct connection do Supabase)
   - `NEXT_PUBLIC_API_URL` = `https://emporio-api.onrender.com`
   - `NODE_ENV` = `production`
6. Clique em **"Deploy"**
7. Aguarde (~3 minutos). A URL final será: `https://emporio.vercel.app`

---

## PASSO 6 — Configurar Domínio Personalizado (Opcional)

### Na Vercel:
- Settings → Domains → Add `app.seudominio.com.br`
- Configure o DNS conforme instruído

### No Render:
- Settings → Custom Domains → Add `api.seudominio.com.br`

---

## Atualizações Futuras

Após o primeiro deploy, qualquer `git push` para a branch `main` irá:
- Atualizar automaticamente o frontend na **Vercel**
- Atualizar automaticamente a API no **Render**

---

## Troubleshooting

| Problema | Solução |
|---------|---------|
| `P1001: Can't reach database` | Verifique se DATABASE_URL está correto no Supabase |
| `Error: 401 Unauthorized` | Verifique as variáveis de ambiente na Vercel |
| API retorna 502 | A API no Render pode estar iniciando (free tier dorme) |
| Prisma migration failed | Use DIRECT_URL (sem pgbouncer) para rodar migrações |
