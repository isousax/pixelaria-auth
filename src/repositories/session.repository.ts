import type { Env } from "../types/Env";

/**
 * Tipo para sessão do banco
 */
export interface DBSession {
  id: string;
  user_id: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
}

/**
 * Repository para operações de sessão
 */
export class SessionRepository {
  constructor(private env: Env) {}

  /**
   * Cria uma nova sessão
   */
  async create(data: {
    id: string;
    user_id: string;
    refresh_token: string;
    expires_at: string;
  }): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO user_sessions (id, user_id, refresh_token, expires_at)
       VALUES (?, ?, ?, ?)`
    )
      .bind(
        data.id,
        data.user_id,
        data.refresh_token,
        data.expires_at
      )
      .run();
  }

  /**
   * Busca sessão válida pelo refresh_token
   */
  async findValidByRefreshToken(
    refreshToken: string
  ): Promise<DBSession | null> {
    const session = await this.env.DB.prepare(
      `SELECT id, user_id, refresh_token, expires_at, created_at
       FROM user_sessions
       WHERE refresh_token = ? AND datetime(expires_at) > datetime('now') AND revoked = 0`
    )
      .bind(refreshToken)
      .first<DBSession>();

    return session || null;
  }

  /**
   * Revoga sessão pelo ID (marca como revoked)
   */
  async revokeById(sessionId: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE user_sessions SET revoked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(sessionId)
      .run();
  }

  /**
   * Remove sessão pelo ID (delete físico)
   */
  async deleteById(sessionId: string): Promise<void> {
    await this.env.DB.prepare(`DELETE FROM user_sessions WHERE id = ?`)
      .bind(sessionId)
      .run();
  }

  /**
   * Revoga todas as sessões de um usuário (marca como revoked)
   */
  async revokeAllByUserId(userId: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE user_sessions SET revoked = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    )
      .bind(userId)
      .run();
  }

  /**
   * Remove todas as sessões de um usuário (delete físico)
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.env.DB.prepare(`DELETE FROM user_sessions WHERE user_id = ?`)
      .bind(userId)
      .run();
  }

  /**
   * Remove sessões expiradas e revogadas (cleanup job)
   */
  async deleteExpired(): Promise<void> {
    await this.env.DB.prepare(
      `DELETE FROM user_sessions 
       WHERE datetime(expires_at) <= datetime('now') OR revoked = 1`
    ).run();
  }

  /**
   * Lista sessões ativas de um usuário
   */
  async listActiveByUserId(userId: string): Promise<DBSession[]> {
    const sessions = await this.env.DB.prepare(
      `SELECT id, user_id, refresh_token, expires_at, created_at
       FROM user_sessions
       WHERE user_id = ? AND datetime(expires_at) > datetime('now') AND revoked = 0
       ORDER BY created_at DESC`
    )
      .bind(userId)
      .all<DBSession>();

    return sessions.results || [];
  }
}
