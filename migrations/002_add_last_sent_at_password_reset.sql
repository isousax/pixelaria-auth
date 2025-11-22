-- Adiciona coluna last_sent_at para controle de cooldown de reset de senha
-- Executar com: wrangler d1 execute auth-engine-db --local --file=./migrations/002_add_last_sent_at_password_reset.sql
-- Executar com: wrangler d1 execute auth-engine-db --remote --file=./migrations/002_add_last_sent_at_password_reset.sql

ALTER TABLE password_reset_tokens 
ADD COLUMN last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Atualizar registros existentes com a data de created_at
UPDATE password_reset_tokens 
SET last_sent_at = created_at 
WHERE last_sent_at IS NULL;
