import type { D1Database } from "@cloudflare/workers-types";

/**
 * Revoga um access token específico pelo JTI
 * @param db - Instância do banco D1
 * @param jti - JWT ID a ser revogado
 * @param userId - ID do usuário dono do token
 * @param expiresAt - Data de expiração do token (ISO string)
 * @param reason - Motivo da revogação (opcional)
 */
export async function revokeAccessToken(
  db: D1Database,
  jti: string,
  userId: string,
  expiresAt: string,
  reason?: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO revoked_jti (jti, user_id, revoked_at, expires_at, reason)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
       ON CONFLICT(jti) DO NOTHING`
    )
    .bind(jti, userId, expiresAt, reason || null)
    .run();
}

/**
 * Revoga todos os access tokens ativos de um usuário
 * Usado quando: troca de senha, force logout all
 * @param db - Instância do banco D1
 * @param userId - ID do usuário
 * @param reason - Motivo da revogação
 */
export async function revokeAllUserTokens(
  db: D1Database,
  userId: string,
  reason: string
): Promise<void> {
  // Nota: Não temos uma lista de JTIs ativos por usuário no banco
  // A revogação total é feita incrementando session_version
  // Essa função registra o evento para auditoria
  console.info(
    `[tokenRevocation] Todos os tokens do usuário ${userId} serão invalidados via session_version. Motivo: ${reason}`
  );
  
  // A invalidação real acontece via session_version no verifyAccessToken
  // que já verifica se o sessionVersion do token bate com o do banco
}

/**
 * Extrai o JTI de um token JWT (sem validar assinatura)
 * Útil para revogar token no logout
 * @param token - Token JWT
 * @returns JTI ou null se não encontrado
 */
export function extractJtiFromToken(token: string): string | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    
    return payload.jti || null;
  } catch {
    return null;
  }
}

/**
 * Extrai a expiração (exp) de um token JWT (sem validar assinatura)
 * @param token - Token JWT
 * @returns Data de expiração ISO string ou null
 */
export function extractExpFromToken(token: string): string | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    
    if (!payload.exp) return null;
    
    // Converter timestamp Unix para ISO string
    return new Date(payload.exp * 1000).toISOString();
  } catch {
    return null;
  }
}

/**
 * Extrai userId de um token JWT (sem validar assinatura)
 * @param token - Token JWT
 * @returns userId ou null
 */
export function extractUserIdFromToken(token: string): string | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

/**
 * Remove JTIs expirados da tabela revoked_jti
 * Deve ser executado periodicamente via Cron Trigger
 * @param db - Instância do banco D1
 * @returns Número de registros removidos
 */
export async function cleanupExpiredRevokedTokens(
  db: D1Database
): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM revoked_jti 
       WHERE datetime(expires_at) < datetime('now')`
    )
    .run();

  const deleted = result.meta.changes || 0;
  console.info(`[tokenRevocation] Limpeza: ${deleted} JTIs expirados removidos`);
  
  return deleted;
}
