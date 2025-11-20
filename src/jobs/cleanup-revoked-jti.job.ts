import type { Env } from "../types/Env";
import { cleanupExpiredRevokedTokens } from "../service/tokenRevocation";

/**
 * Job de limpeza de JTIs expirados da tabela revoked_jti
 * Deve ser executado periodicamente via Cron Trigger
 * 
 * Exemplo de configuração no wrangler.toml:
 * [[triggers.crons]]
 * cron = "0 3 * * *"  # Todo dia às 3h da manhã
 */
export async function cleanupRevokedJtiJob(env: Env): Promise<void> {
  console.info("[cleanupRevokedJtiJob] Iniciando limpeza de JTIs expirados");
  
  try {
    const deleted = await cleanupExpiredRevokedTokens(env.DB);
    
    console.info(
      `[cleanupRevokedJtiJob] Limpeza concluída: ${deleted} JTIs removidos`
    );
  } catch (error) {
    console.error(
      "[cleanupRevokedJtiJob] Erro ao executar limpeza:",
      error
    );
    throw error;
  }
}
