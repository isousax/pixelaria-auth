# Auth Engine - API de Autenticação Serverless

Sistema de autenticação completo rodando em Cloudflare Workers com [Hono](https://hono.dev/) e arquitetura em camadas.

## ✨ Características

- 🔐 Autenticação JWT (RS256/HS256) com refresh tokens
- 📧 Verificação de email e reset de senha
- 🛡️ Rate limiting e proteção contra brute force
- 🗄️ Cloudflare D1 (SQLite) para persistência
- 🎯 Arquitetura em camadas (Clean Architecture)
- ✅ Validação com Zod
- 🚀 TypeScript strict mode
- 🌍 CORS configurável
- 📚 Documentação OpenAPI/Swagger interativa

## 📚 Documentação

- **[OpenAPI/Swagger](OPENAPI.md)** - Documentação interativa da API
- **[Middleware de Autenticação](MIDDLEWARE_AUTH.md)** - Guia de autenticação JWT
- **[Rate Limiting](RATE_LIMITING.md)** - Guia de rate limiting
- **[Migração Completa](MIGRATION_COMPLETE.md)** - Histórico de refatoração

**Swagger UI**: http://localhost:8787/docs (após `npm run dev`)

## 🚀 Quick Start

1. Clone o repositório e instale dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente em `wrangler.jsonc` ou `.dev.vars`:
```bash
SITE_DNS=https://api.exemplo.com
FRONTEND_URL=https://app.exemplo.com
JWT_PRIVATE_KEY_PEM=...
JWT_PUBLIC_KEY_PEM=...
JWT_JWKS_KID=k1
JWT_EXPIRATION_SEC=3600
REFRESH_TOKEN_EXPIRATION_DAYS=30
RESEND_API_KEY=...
```

3. Crie o banco de dados D1:
```bash
wrangler d1 create auth-engine-db
# Copie o database_id para wrangler.jsonc
```

4. Execute as migrações:
```bash
wrangler d1 execute auth-engine-db --local --file=./schema.sql
wrangler d1 execute auth-engine-db --remote --file=./schema.sql
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse `http://localhost:8787/health` para verificar se está rodando.

## 📂 Estrutura do Projeto

```
src/
├── api/                    # Configuração do Hono e rotas
│   ├── app.ts             # Setup do app Hono
│   └── routes/            # Definição de rotas
│       └── auth.routes.ts # Rotas de autenticação
├── controllers/           # Camada de controllers (HTTP handlers)
│   └── auth.controller.ts # Controller de auth
├── services/              # Lógica de negócio
│   ├── auth.service.ts    # Service de autenticação
│   ├── sessionManager.ts  # Gerenciamento de sessões
│   └── ...
├── repositories/          # Acesso a dados (D1)
│   ├── user.repository.ts
│   └── session.repository.ts
├── validators/            # Schemas Zod
│   └── auth.validators.ts
├── middleware/            # Middlewares Hono
│   ├── requestId.ts
│   ├── requireAdmin.ts
│   └── requireRoles.ts
├── utils/                 # Utilitários
├── types/                 # Tipos TypeScript
├── config/                # Configuração
│   └── app.config.ts
└── index.ts               # Entry point
```

## 🔐 Autenticação

**📖 Documentação completa**: Acesse http://localhost:8787/docs para Swagger UI interativo.

### Endpoints Disponíveis

| Endpoint | Método | Descrição | Rate Limit |
|----------|--------|-----------|-----------|
| `/auth/register` | POST | Registrar novo usuário | 5/min |
| `/auth/login` | POST | Login com email/senha | 5/min |
| `/auth/logout` | POST | Logout (invalidar refresh token) | - |
| `/auth/refresh` | POST | Renovar access token | - |
| `/auth/request-reset` | POST | Solicitar reset de senha | 3/5min |
| `/auth/reset-password` | POST | Reset de senha com token | 3/5min |
| `/auth/change-password` | POST | Alterar senha (autenticado) | 3/5min |
| `/auth/confirm-verification` | POST | Confirmar email via link (token UUID) | - |
| `/auth/introspect` | POST | Validar token JWT | - |
| `/auth/.well-known/jwks.json` | GET | JWKS para validação de tokens | - |

### Exemplo: Registro e Login

```bash
# 1. Registrar usuário
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SenhaSegura123!",
    "full_name": "João Silva",
    "phone": "+5511999999999"
  }'

# 2. Login
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SenhaSegura123!",
    "remember": true
  }'

# Resposta:
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "rt_...",
  "expires_in": 3600,
  "token_type": "Bearer"
}

# 3. Usar access token
curl http://localhost:8787/api/protected \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."

# 4. Renovar token
curl -X POST http://localhost:8787/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "rt_..."
  }'
```

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas baseada em Clean Architecture:

```
┌─────────────────────────────────────────┐
│         API Layer (Hono Routes)         │
│  - Definição de rotas                   │
│  - Middlewares (CORS, Auth, etc)        │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Controllers Layer               │
│  - Validação de entrada (Zod)           │
│  - Adaptação HTTP (request/response)    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Services Layer                  │
│  - Lógica de negócio pura               │
│  - Orquestração de repositórios         │
│  - Business rules                       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Repositories Layer              │
│  - Acesso a dados (D1/SQLite)           │
│  - Queries SQL                          │
│  - Mapeamento de entidades              │
└─────────────────────────────────────────┘
```

### Benefícios

- ✅ **Testabilidade**: Services isolados sem dependências HTTP
- ✅ **Reutilização**: Mesma lógica em múltiplos endpoints
- ✅ **Manutenibilidade**: Separação clara de responsabilidades
- ✅ **Escalabilidade**: Fácil adicionar novos domínios

## 🔧 Desenvolvimento

### Comandos Disponíveis

```bash
# Desenvolvimento local
npm run dev

# Type checking
npm run type-check

# Build
npm run build

# Deploy para Cloudflare
npm run deploy
```

### Adicionando Novos Endpoints

1. **Criar validator** em `src/validators/`:
```typescript
// src/validators/myfeature.validators.ts
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
```

2. **Criar repository** em `src/repositories/`:
```typescript
// src/repositories/myfeature.repository.ts
export class MyFeatureRepository {
  constructor(private db: D1Database) {}

  async create(data: CreateItemInput) {
    const result = await this.db.prepare(
      'INSERT INTO items (name, description) VALUES (?, ?)'
    ).bind(data.name, data.description).run();
    return result.meta.last_row_id;
  }
}
```

3. **Criar service** em `src/services/`:
```typescript
// src/services/myfeature.service.ts
export class MyFeatureService {
  constructor(private repo: MyFeatureRepository) {}

  async createItem(data: CreateItemInput) {
    // Business logic aqui
    const id = await this.repo.create(data);
    return { id, ...data };
  }
}
```

4. **Criar controller** em `src/controllers/`:
```typescript
// src/controllers/myfeature.controller.ts
export class MyFeatureController {
  constructor(private service: MyFeatureService) {}

  create = async (c: Context) => {
    const body = await c.req.json();
    const data = createItemSchema.parse(body);
    const result = await this.service.createItem(data);
    return c.json(result, 201);
  };
}
```

5. **Criar rotas** em `src/api/routes/`:
```typescript
// src/api/routes/myfeature.routes.ts
import { Hono } from 'hono';

export function createMyFeatureRoutes(env: Env) {
  const router = new Hono();
  const repo = new MyFeatureRepository(env.DB);
  const service = new MyFeatureService(repo);
  const controller = new MyFeatureController(service);

  router.post('/', controller.create);
  return router;
}
```

6. **Registrar no app** em `src/api/app.ts`:
```typescript
import { createMyFeatureRoutes } from './routes/myfeature.routes';

app.route('/api/items', createMyFeatureRoutes(env));
```

---

## 📚 Documentação Adicional
- 🗄️ [schema.sql](./schema.sql) - Schema completo do banco de dados

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é licenciado sob a licença MIT.

---

## 🚀 Deploy

### Deploy para Cloudflare Workers

```bash
# 1. Login na Cloudflare
wrangler login

# 2. Criar banco D1 (primeira vez)
wrangler d1 create auth-engine-db
# Copie o database_id retornado para wrangler.jsonc

# 3. Executar migrations
wrangler d1 execute auth-engine-db --remote --file=./schema.sql

# 4. Deploy
npm run deploy
```

### Configurar Secrets

```bash
# Secrets sensíveis não devem estar em wrangler.jsonc
wrangler secret put JWT_PRIVATE_KEY_PEM
wrangler secret put JWT_PUBLIC_KEY_PEM
wrangler secret put RESEND_API_KEY
```

### Verificar Deploy

```bash
# Testar endpoint de health
curl https://seu-worker.workers.dev/health
```

---

**Feito usando Cloudflare Workers + Hono + TypeScript**

## 🔐 JWT RS256 & JWKS

O serviço suporta emissão de tokens JWT via RS256 (preferido) com fallback para HS256 se chaves RSA não estiverem configuradas.

### Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `SITE_DNS` | Usado como `iss` e `aud` nos tokens | `https://api.exemplo.com` |
| `FRONTEND_URL` | URL do frontend para CORS | `https://app.exemplo.com` |
| `JWT_SECRET` | Segredo legado HS256 (fallback) | `seu-secret-super-secreto` |
| `JWT_PRIVATE_KEY_PEM` | Chave privada PKCS8 para RS256 | `-----BEGIN PRIVATE KEY-----...` |
| `JWT_PUBLIC_KEY_PEM` | Chave pública SPKI correspondente | `-----BEGIN PUBLIC KEY-----...` |
| `JWT_JWKS_KID` | Identificador (kid) exposto no JWKS | `k1` |
| `JWT_EXPIRATION_SEC` | Expiração do access token (segundos) | `3600` |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | Expiração do refresh token (dias) | `30` |
| `RESEND_API_KEY` | API key do Resend para envio de emails | `re_...` |

### Endpoint JWKS

`GET /auth/.well-known/jwks.json` retorna um documento JWK Set contendo a chave pública para validação de tokens:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "alg": "RS256",
      "kid": "k1",
      "use": "sig",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### Geração de Chaves (Exemplo)

```bash
# Gerar chave privada RSA
openssl genrsa -out private.pem 2048

# Converter para PKCS8 (formato exigido)
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
  -in private.pem -out private_pkcs8.pem

# Extrair chave pública
openssl rsa -in private.pem -pubout -out public.pem

# Usar em wrangler.jsonc:
# JWT_PRIVATE_KEY_PEM = conteúdo de private_pkcs8.pem
# JWT_PUBLIC_KEY_PEM = conteúdo de public.pem
```

### Rotação de Chaves (Recomendado)

1. Gerar novo par de chaves (kid `k2`)
2. Publicar JWKS com ambas (`k1` + `k2`)
3. Passar a assinar novos tokens com `k2`
4. Após expirar tokens `k1`, remover do JWKS

### Claims Emitidos

- `sub`: User ID
- `email`: Email do usuário
- `role`: Papel (`patient`, `admin`, etc)
- `full_name`: Nome completo
- `phone`: Telefone
- `birth_date`: Data de nascimento
- `iss`: Issuer (SITE_DNS)
- `aud`: Audience (SITE_DNS)
- `exp`: Timestamp de expiração
- `kid`: Key ID (se RS256)
- `jti`: JWT ID (único por token)

### Revogação de Access Tokens

- Tabela `revoked_jti` controla JWTs invalidados antes da expiração natural
- Fluxos que adicionam revogação:
  - Logout
  - Troca de senha
  - Invalidação manual por admin
- Verificação centralizada em `service/tokenVerify.ts` rejeita tokens com `jti` revogado

### Segurança Complementar

- ✅ Soft lock + backoff progressivo em tentativas inválidas
- ✅ Jitter para mitigar análise de tempo
- ✅ Sessões de refresh rotacionadas
- ✅ Proteção contra timing attacks
- ✅ Rate limiting por IP/email

---

## 📊 Database Schema

O banco de dados utiliza Cloudflare D1 (SQLite). Principais tabelas:

- **users**: Dados de usuários (email, password_hash, role, etc)
- **sessions**: Refresh tokens ativos
- **revoked_jti**: JWTs revogados manualmente
- **auth_attempts**: Rate limiting de tentativas de login
- **password_reset_tokens**: Tokens de reset de senha
- **email_verification_codes**: Códigos de verificação de email

Para schema completo, veja `schema.sql`.

---
