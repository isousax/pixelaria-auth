import type { Env } from "../types/Env";

/**
 * Tipo de retorno para usuário do banco
 */
export interface DBUser {
  id: string;
  email: string;
  email_confirmed: number;
  password_hash: string;
  role: string;
  session_version: number;
  full_name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  display_name?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Repository para operações de usuário
 */
export class UserRepository {
  constructor(private env: Env) {}

  /**
   * Busca um usuário pelo email (com profile join)
   */
  async findByEmail(email: string): Promise<DBUser | null> {
    const user = await this.env.DB.prepare(
      `SELECT u.id, u.email, u.email_confirmed, u.password_hash, u.role, u.session_version,
              p.full_name, p.phone, p.birth_date, p.display_name, u.last_login_at
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.email = ?`
    )
      .bind(email)
      .first<DBUser>();

    return user || null;
  }

  /**
   * Busca um usuário pelo ID
   */
  async findById(userId: string): Promise<DBUser | null> {
    const user = await this.env.DB.prepare(
      `SELECT u.id, u.email, u.email_confirmed, u.password_hash, u.role, u.session_version,
              p.full_name, p.phone, p.birth_date, p.display_name, u.last_login_at, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`
    )
      .bind(userId)
      .first<DBUser>();

    return user || null;
  }

  /**
   * Cria um novo usuário
   */
  async create(data: {
    id: string;
    email: string;
    password_hash: string;
    role?: string;
  }): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, role, email_confirmed, session_version)
       VALUES (?, ?, ?, ?, 0, 1)`
    )
      .bind(data.id, data.email, data.password_hash, data.role || "user")
      .run();
  }

  /**
   * Atualiza display_name e last_login_at
   */
  async updateLastLogin(userId: string, displayName: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE users 
       SET last_login_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    )
      .bind(userId)
      .run();
    
    await this.env.DB.prepare(
      `UPDATE user_profiles 
       SET display_name = COALESCE(display_name, ?),
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`
    )
      .bind(displayName, userId)
      .run();
  }

  /**
   * Recupera o display_name atualizado
   */
  async getDisplayName(userId: string): Promise<string | null> {
    const row = await this.env.DB.prepare(
      `SELECT display_name FROM user_profiles WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ display_name?: string }>();

    return row?.display_name || null;
  }

  /**
   * Atualiza o password_hash do usuário
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(passwordHash, userId)
      .run();
  }

  /**
   * Confirma o email do usuário
   */
  async confirmEmail(userId: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE users SET email_confirmed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(userId)
      .run();
  }

  /**
   * Incrementa session_version (invalida todas as sessões)
   */
  async incrementSessionVersion(userId: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE users SET session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(userId)
      .run();
  }

  /**
   * Atualiza o role do usuário
   */
  async updateRole(userId: string, role: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
      .bind(role, userId)
      .run();
  }

  /**
   * Lista usuários com paginação (admin)
   */
  async listUsers(limit: number = 50, offset: number = 0): Promise<DBUser[]> {
    const users = await this.env.DB.prepare(
      `SELECT u.id, u.email, u.email_confirmed, u.role, u.session_version, p.display_name,
              u.last_login_at, u.created_at, u.updated_at,
              p.full_name, p.phone, p.birth_date
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all<DBUser>();

    return users.results || [];
  }
}
