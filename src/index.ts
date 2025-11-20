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

// Criar aplicação Hono com todas as rotas configuradas
const app = createApp();

// Export default para Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env);
  },
};
