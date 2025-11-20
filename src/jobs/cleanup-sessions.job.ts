import type { Env } from "../types/Env";
import { SessionRepository } from "../repositories/session.repository";

/**
 * Job de limpeza de sessões expiradas
 * Pode ser executado via Cron Trigger ou scheduled event
 */
export class CleanupExpiredSessionsJob {
  private sessionRepo: SessionRepository;

  constructor(private env: Env) {
    this.sessionRepo = new SessionRepository(env);
  }

  async execute(): Promise<void> {
    console.log("[CleanupExpiredSessionsJob] Iniciando limpeza de sessões expiradas");
    
    try {
      await this.sessionRepo.deleteExpired();
      console.log("[CleanupExpiredSessionsJob] Limpeza concluída com sucesso");
    } catch (error) {
      console.error("[CleanupExpiredSessionsJob] Erro durante limpeza:", error);
      throw error;
    }
  }
}

/**
 * Handler para Cloudflare Workers Cron Trigger
 * Adicionar em wrangler.jsonc:
 * 
 * "triggers": {
 *   "crons": ["0 0 * * *"]  // Executa diariamente à meia-noite
 * }
 */
export async function scheduledCleanupHandler(
  event: ScheduledEvent,
  env: Env
): Promise<void> {
  const job = new CleanupExpiredSessionsJob(env);
  await job.execute();
}
