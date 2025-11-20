/**
 * Auth Engine - Entry Point
 * 
 * Sistema de autenticação com arquitetura em camadas
 * usando Hono framework para Cloudflare Workers.
 * 
 * @see MIGRATION.md para detalhes da arquitetura
 */

import { createApp } from "./api/app";
import type { Env } from "./types/Env";
import { cleanupRevokedJtiJob } from "./jobs/cleanup-revoked-jti.job";
import { cleanupExpiredSessionsJob } from "./jobs/cleanup-sessions.job";

// Criar aplicação Hono com todas as rotas configuradas
const app = createApp();

// Export default para Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env);
  },

  /**
   * Handler para Cron Triggers
   * Executa jobs de limpeza agendados
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.info("[scheduled] Executando cron job:", event.cron);

    // Executar jobs de limpeza
    ctx.waitUntil(
      Promise.all([
        cleanupExpiredSessionsJob(env),
        cleanupRevokedJtiJob(env),
      ])
    );
  },
};
