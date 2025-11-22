# Migrações do Banco de Dados

Este diretório contém as migrações incrementais do banco de dados D1.

## Como Executar

### Localmente (dev)
```bash
wrangler d1 execute auth-engine-db --local --file=./migrations/001_add_last_sent_at.sql
wrangler d1 execute auth-engine-db --local --file=./migrations/002_add_last_sent_at_password_reset.sql
```

### Produção (remote)
```bash
wrangler d1 execute auth-engine-db --remote --file=./migrations/001_add_last_sent_at.sql
wrangler d1 execute auth-engine-db --remote --file=./migrations/002_add_last_sent_at_password_reset.sql
```

## Histórico de Migrações

### 001_add_last_sent_at.sql
**Data:** 2025-11-21  
**Descrição:** Adiciona coluna `last_sent_at` na tabela `email_verification_codes` para implementar cooldown de 60 segundos no reenvio de e-mails de verificação.

**Mudanças:**
- Adiciona coluna `last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Atualiza registros existentes com valor de `created_at`

**Motivo:** Prevenir abuso do endpoint de reenvio de e-mail implementando rate limiting específico com header `Retry-After`.

### 002_add_last_sent_at_password_reset.sql
**Data:** 2025-11-21  
**Descrição:** Adiciona coluna `last_sent_at` na tabela `password_reset_tokens` para implementar cooldown de 60 segundos no reset de senha.

**Mudanças:**
- Adiciona coluna `last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Atualiza registros existentes com valor de `created_at`

**Motivo:** Prevenir abuso do endpoint de reset de senha (DoS, spam de e-mails, enumeração de usuários).
