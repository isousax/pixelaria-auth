import type { Env } from "../types/Env";

/**
 * Tipo para sessão do banco
 */
export interface DBSession {
  id: string;
  user_id: string;
  refresh_token: string;
  ip_address?: string;
  user_agent?: string;
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
    ip_address?: string;
    user_agent?: string;
    expires_at: string;
  }): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.id,
        data.user_id,
        data.refresh_token,
        data.ip_address || null,
        data.user_agent || null,
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
      `SELECT id, user_id, refresh_token, ip_address, user_agent, expires_at, created_at
       FROM sessions
       WHERE refresh_token = ? AND datetime(expires_at) > datetime('now')`
    )
      .bind(refreshToken)
      .first<DBSession>();

    return session || null;
  }

  /**
   * Remove sessão pelo ID
   */
  async deleteById(sessionId: string): Promise<void> {
    await this.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
      .bind(sessionId)
      .run();
  }

  /**
   * Remove todas as sessões de um usuário
   */
  async deleteAllByUserId(userId: string): Promise<void> {
    await this.env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`)
      .bind(userId)
      .run();
  }

  /**
   * Remove sessões expiradas (cleanup job)
   */
  async deleteExpired(): Promise<void> {
    await this.env.DB.prepare(
      `DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')`
    ).run();
  }

  /**
   * Lista sessões ativas de um usuário
   */
  async listActiveByUserId(userId: string): Promise<DBSession[]> {
    const sessions = await this.env.DB.prepare(
      `SELECT id, user_id, refresh_token, ip_address, user_agent, expires_at, created_at
       FROM sessions
       WHERE user_id = ? AND datetime(expires_at) > datetime('now')
       ORDER BY created_at DESC`
    )
      .bind(userId)
      .all<DBSession>();

    return sessions.results || [];
  }
}
