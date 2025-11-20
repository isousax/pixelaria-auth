import type { Env } from "../types/Env";
import { UserRepository } from "../repositories/user.repository";
import { SessionRepository } from "../repositories/session.repository";
import { generateJWT } from "../service/generateJWT";
import { comparePassword, hashPassword } from "../service/managerPassword";
import { generateRefreshToken, createSession, findSessionByRefreshToken, rotateSession } from "../service/sessionManager";
import {
  getClientIp,
  checkLocks,
  registerFailedAttempt,
  clearAttempts,
} from "../service/authAttempts";
import { generateToken } from "../utils/generateToken";
import { hashToken } from "../utils/hashToken";
import { sendVerificationEmail } from "../utils/sendVerificationEmail";

/**
 * Resultado do login
 */
export interface LoginResult {
  success: boolean;
  data?: {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    user: {
      id: string;
      email: string;
      role: string;
      display_name: string;
      full_name?: string | null;
    };
  };
  error?: {
    message: string;
    code: string;
    retryAfterSec?: number;
  };
}

/**
 * Resultado genérico
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    retryAfterSec?: number;
  };
}

/**
 * Service de autenticação - lógica de negócio pura
 */
export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;

  constructor(private env: Env) {
    this.userRepo = new UserRepository(env);
    this.sessionRepo = new SessionRepository(env);
  }

  /**
   * Realiza login do usuário
   */
  async login(
    email: string,
    password: string,
    remember: boolean,
    request: Request
  ): Promise<LoginResult> {
    const clientIp = getClientIp(request);

    // Verificar bloqueios por tentativas
    const lock = await checkLocks(this.env, email, clientIp);
    if (lock.blocked) {
      return {
        success: false,
        error: {
          message:
            "Muitas tentativas de acesso. Por favor, tente novamente mais tarde.",
          code: "TOO_MANY_ATTEMPTS",
          retryAfterSec: lock.retryAfterSec,
        },
      };
    }

    // Buscar usuário
    const user = await this.userRepo.findByEmail(email);

    // Verificar se email foi confirmado
    if (user && user.email_confirmed !== 1) {
      return {
        success: false,
        error: {
          message: "E-mail não verificado. Verifique sua caixa de entrada.",
          code: "EMAIL_NOT_CONFIRMED",
        },
      };
    }

    // Usuário não encontrado
    if (!user) {
      const res = await registerFailedAttempt(this.env, email, clientIp);
      if (res.status === 429) {
        return {
          success: false,
          error: {
            message:
              "Muitas tentativas de acesso. Por favor, tente novamente mais tarde.",
            code: "TOO_MANY_ATTEMPTS",
            retryAfterSec: res.retryAfterSec,
          },
        };
      }
      return {
        success: false,
        error: { message: "Credenciais inválidas.", code: "INVALID_CREDENTIALS" },
      };
    }

    // Verificar senha
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      const res = await registerFailedAttempt(this.env, email, clientIp);
      if (res.status === 429) {
        return {
          success: false,
          error: {
            message:
              "Muitas tentativas de acesso. Por favor, tente novamente mais tarde.",
            code: "TOO_MANY_ATTEMPTS",
            retryAfterSec: res.retryAfterSec,
          },
        };
      }
      return {
        success: false,
        error: { message: "Credenciais inválidas.", code: "INVALID_CREDENTIALS" },
      };
    }

    // Sucesso: limpar tentativas falhas
    await clearAttempts(this.env.DB, email, clientIp);

    // Atualizar last_login e display_name
    const fallbackName = email.split("@")[0];
    await this.userRepo.updateLastLogin(user.id, fallbackName);

    // Recuperar display_name atualizado
    const displayName =
      (await this.userRepo.getDisplayName(user.id)) || fallbackName;

    // Gerar tokens
    const expiresIn = this.env.JWT_EXPIRATION_SEC
      ? Number(this.env.JWT_EXPIRATION_SEC)
      : 3600;

    const accessToken = await generateJWT(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.session_version,
        displayName: displayName,
      },
      this.env.JWT_SECRET,
      expiresIn
    );

    // Gerar refresh token se remember = true
    let refreshToken: string | undefined;
    if (remember) {
      const refreshDays = this.env.REFRESH_TOKEN_EXPIRATION_DAYS
        ? Number(this.env.REFRESH_TOKEN_EXPIRATION_DAYS)
        : 30;

      refreshToken = await generateRefreshToken();
      const expiresAt = new Date(
        Date.now() + refreshDays * 24 * 60 * 60 * 1000
      ).toISOString();
      
      await createSession(
        this.env.DB,
        user.id,
        refreshToken,
        expiresAt
      );
    }

    return {
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: expiresIn,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          display_name: displayName,
          full_name: user.full_name,
        },
      },
    };
  }

  /**
   * Realiza logout (invalida refresh token)
   */
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const session = await this.sessionRepo.findValidByRefreshToken(
      refreshToken
    );

    if (session) {
      await this.sessionRepo.deleteById(session.id);
    }

    return { success: true };
  }

  /**
   * Força logout de todas as sessões de um usuário
   */
  async forceLogoutAll(userId: string): Promise<{ success: boolean }> {
    await this.sessionRepo.deleteAllByUserId(userId);
    await this.userRepo.incrementSessionVersion(userId);
    return { success: true };
  }

  /**
   * Registra um novo usuário
   */
  async register(
    email: string,
    password: string,
    fullName: string,
    phone: string,
    birthDate?: string,
    request?: Request
  ): Promise<ServiceResult<{ userId: string }>> {
    console.info("[AuthService.register] Iniciando registro para:", email);

    // Verificar se usuário já existe
    const existingUser = await this.userRepo.findByEmail(email);

    // Se já confirmado, rejeitar
    if (existingUser && existingUser.email_confirmed === 1) {
      console.warn(
        "[AuthService.register] E-mail já existe e está confirmado:",
        email
      );
      return {
        success: false,
        error: {
          message:
            "Este e-mail já está cadastrado. Tente fazer login ou recupere sua senha.",
          code: "EMAIL_ALREADY_EXISTS",
        },
      };
    }

    // Hash da senha
    const passwordHash = await hashPassword(password);

    let userId: string;

    // Se existe mas NÃO confirmado -> atualizar dados
    if (existingUser && existingUser.email_confirmed !== 1) {
      console.info(
        "[AuthService.register] E-mail não confirmado - atualizando dados:",
        email
      );
      
      userId = existingUser.id;
      const displayName = fullName.trim().split(" ")[0];

      // Atualizar senha e display_name
      await this.env.DB.prepare(
        "UPDATE users SET password_hash = ?, display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
        .bind(passwordHash, displayName, userId)
        .run();

      // Atualizar perfil (delete + insert)
      await this.env.DB.prepare("DELETE FROM user_profiles WHERE user_id = ?")
        .bind(userId)
        .run();

      if (birthDate) {
        await this.env.DB.prepare(
          "INSERT INTO user_profiles (user_id, full_name, phone, birth_date) VALUES (?, ?, ?, ?)"
        )
          .bind(userId, fullName, phone, birthDate)
          .run();
      } else {
        await this.env.DB.prepare(
          "INSERT INTO user_profiles (user_id, full_name, phone) VALUES (?, ?, ?)"
        )
          .bind(userId, fullName, phone)
          .run();
      }
    } else {
      // Novo usuário
      console.info("[AuthService.register] Criando novo usuário:", email);

      userId = crypto.randomUUID();
      const displayName = fullName.trim().split(" ")[0];

      // Determinar role inicial (admin se for INITIAL_ADMIN_EMAIL)
      let initialRole: "user" | "admin" = "user";
      if (
        this.env.INITIAL_ADMIN_EMAIL &&
        this.env.INITIAL_ADMIN_EMAIL.toLowerCase() === email.toLowerCase()
      ) {
        initialRole = "admin";
        console.info("[AuthService.register] Criando usuário ADMIN:", email);
      }

      // Criar usuário
      await this.env.DB.prepare(
        "INSERT INTO users (id, email, password_hash, role, display_name, email_confirmed) VALUES (?, ?, ?, ?, ?, 0)"
      )
        .bind(userId, email, passwordHash, initialRole, displayName)
        .run();

      // Criar perfil
      if (birthDate) {
        await this.env.DB.prepare(
          "INSERT INTO user_profiles (user_id, full_name, phone, birth_date) VALUES (?, ?, ?, ?)"
        )
          .bind(userId, fullName, phone, birthDate)
          .run();
      } else {
        await this.env.DB.prepare(
          "INSERT INTO user_profiles (user_id, full_name, phone) VALUES (?, ?, ?)"
        )
          .bind(userId, fullName, phone)
          .run();
      }
    }

    // Gerar token de verificação
    const plainToken = await generateToken();
    const hashedToken = await hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Upsert token de verificação
    await this.env.DB.prepare(
      `INSERT INTO email_verification_codes (user_id, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(user_id) DO UPDATE SET
         token_hash = excluded.token_hash,
         expires_at = excluded.expires_at,
         created_at = CURRENT_TIMESTAMP,
         used = 0`
    )
      .bind(userId, hashedToken, expiresAt)
      .run();

    // Montar link de verificação e enviar email
    const base = this.env.SITE_DNS || "http://localhost:8787";
    const link = `${base}/confirm-email?token=${encodeURIComponent(plainToken)}`;

    try {
      await sendVerificationEmail(this.env, email, link);
      console.info("[AuthService.register] E-mail de verificação enviado para:", email);
    } catch (error) {
      console.error("[AuthService.register] Erro ao enviar e-mail:", error);
      
      // Cleanup: remover token se falhar
      await this.env.DB.prepare(
        "DELETE FROM email_verification_codes WHERE user_id = ?"
      )
        .bind(userId)
        .run();

      return {
        success: false,
        error: {
          message:
            "Não foi possível enviar o e-mail de verificação. Por favor, tente novamente mais tarde.",
          code: "EMAIL_SEND_FAILED",
        },
      };
    }

    console.info("[AuthService.register] Registro concluído com sucesso:", email);

    // Limpar tentativas de login após sucesso (non-fatal)
    if (request) {
      try {
        const clientIp = getClientIp(request);
        await clearAttempts(this.env.DB, email, clientIp);
      } catch (err) {
        console.warn("[AuthService.register] Falha ao limpar tentativas (não fatal):", err);
      }
    }

    return {
      success: true,
      data: { userId },
    };
  }

  /**
   * Refresh token - gera novo access token
   */
  async refresh(refreshToken: string): Promise<LoginResult> {
    // Buscar sessão
    const session = await findSessionByRefreshToken(this.env.DB, refreshToken);

    if (!session) {
      return {
        success: false,
        error: {
          message: "Sessão inválida ou expirada.",
          code: "INVALID_SESSION",
        },
      };
    }

    // Verificar se sessão está revogada
    if (session.revoked) {
      return {
        success: false,
        error: {
          message: "Sessão revogada.",
          code: "SESSION_REVOKED",
        },
      };
    }

    // Verificar expiração
    if (new Date(session.expires_at) < new Date()) {
      return {
        success: false,
        error: {
          message: "Sessão expirada.",
          code: "SESSION_EXPIRED",
        },
      };
    }

    // Buscar usuário
    const user = await this.userRepo.findById(session.user_id);
    if (!user) {
      return {
        success: false,
        error: {
          message: "Usuário não encontrado.",
          code: "USER_NOT_FOUND",
        },
      };
    }

    // Gerar novo access token
    const expiresIn = this.env.JWT_EXPIRATION_SEC
      ? Number(this.env.JWT_EXPIRATION_SEC)
      : 3600;

    const accessToken = await generateJWT(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionVersion: user.session_version,
        displayName: user.display_name || user.email.split("@")[0],
      },
      this.env.JWT_SECRET,
      expiresIn
    );

    // Rotacionar refresh token (opcional - comentado para manter compatibilidade)
    // const newRefreshToken = await rotateSession(this.env.DB, session.id, refreshToken);

    return {
      success: true,
      data: {
        access_token: accessToken,
        // refresh_token: newRefreshToken, // Se implementar rotação
        token_type: "Bearer",
        expires_in: expiresIn,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          display_name: user.display_name || user.email.split("@")[0],
          full_name: user.full_name,
        },
      },
    };
  }

  /**
   * Solicitar reset de senha
   */
  async requestPasswordReset(email: string): Promise<ServiceResult> {
    const user = await this.userRepo.findByEmail(email);

    // Sempre retorna sucesso para não vazar informação de usuários
    if (!user) {
      return {
        success: true,
        data: {
          message:
            "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
        },
      };
    }

    // Gerar token de reset
    const plainToken = await generateToken();
    const hashedToken = await hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    await this.env.DB.prepare(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`
    )
      .bind(user.id, hashedToken, expiresAt)
      .run();

    // Enviar email (implementar)
    // await sendPasswordResetEmail(this.env, email, plainToken);

    return {
      success: true,
      data: {
        message:
          "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
      },
    };
  }

  /**
   * Reset de senha com token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ServiceResult> {
    const hashedToken = await hashToken(token);

    // Buscar token válido
    const tokenRow = await this.env.DB.prepare(
      `SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ? AND datetime(expires_at) > datetime('now')`
    )
      .bind(hashedToken)
      .first<{ user_id: string; expires_at: string }>();

    if (!tokenRow) {
      return {
        success: false,
        error: {
          message: "Token inválido ou expirado.",
          code: "INVALID_TOKEN",
        },
      };
    }

    // Atualizar senha
    const passwordHash = await hashPassword(newPassword);
    await this.userRepo.updatePassword(tokenRow.user_id, passwordHash);

    // Invalidar token
    await this.env.DB.prepare(
      `DELETE FROM password_reset_tokens WHERE token = ?`
    )
      .bind(hashedToken)
      .run();

    // Invalidar todas as sessões
    await this.forceLogoutAll(tokenRow.user_id);

    return {
      success: true,
      data: {
        message: "Senha alterada com sucesso.",
      },
    };
  }

  /**
   * Alterar senha (usuário autenticado)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ServiceResult> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      return {
        success: false,
        error: {
          message: "Usuário não encontrado.",
          code: "USER_NOT_FOUND",
        },
      };
    }

    // Verificar senha atual
    const passwordMatch = await comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!passwordMatch) {
      return {
        success: false,
        error: {
          message: "Senha atual incorreta.",
          code: "INVALID_PASSWORD",
        },
      };
    }

    // Atualizar senha
    const passwordHash = await hashPassword(newPassword);
    await this.userRepo.updatePassword(userId, passwordHash);

    // Invalidar todas as sessões
    await this.forceLogoutAll(userId);

    return {
      success: true,
      data: {
        message: "Senha alterada com sucesso.",
      },
    };
  }

  /**
   * Confirmar email com token
   */
  async confirmEmail(token: string, request?: Request): Promise<ServiceResult<{ message: string; alreadyConfirmed?: boolean }>> {
    console.info("[AuthService.confirmEmail] Processando confirmação de email");

    // Hash do token
    const tokenHash = await hashToken(token);

    // Buscar token
    const row = await this.env.DB.prepare(
      `SELECT user_id, expires_at, used
       FROM email_verification_codes
       WHERE token_hash = ?`
    )
      .bind(tokenHash)
      .first<{ user_id?: string; expires_at?: string; used?: number }>();

    if (!row || !row.user_id) {
      console.warn("[AuthService.confirmEmail] Token não encontrado");
      return {
        success: false,
        error: {
          message: "Token inválido ou expirado.",
          code: "INVALID_TOKEN",
        },
      };
    }

    // Já foi usado?
    if (Number(row.used) === 1) {
      console.info("[AuthService.confirmEmail] Token já foi usado:", row.user_id);
      // Idempotente - retorna sucesso
      return {
        success: true,
        data: {
          message: "Email confirmado.",
          alreadyConfirmed: true,
        },
      };
    }

    // Expirado?
    const expiresMs = Date.parse(row.expires_at || "");
    if (isNaN(expiresMs) || expiresMs < Date.now()) {
      console.warn("[AuthService.confirmEmail] Token expirado:", row.user_id);
      return {
        success: false,
        error: {
          message: "Token inválido ou expirado.",
          code: "TOKEN_EXPIRED",
        },
      };
    }

    // Marcar usuário como confirmado
    await this.env.DB.prepare(
      "UPDATE users SET email_confirmed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(row.user_id)
      .run();

    // Marcar token como usado
    await this.env.DB.prepare(
      "UPDATE email_verification_codes SET used = 1, used_at = CURRENT_TIMESTAMP WHERE token_hash = ?"
    )
      .bind(tokenHash)
      .run();

    // Limpar tentativas de login (non-fatal)
    if (request) {
      try {
        const clientIp = getClientIp(request);
        const user = await this.env.DB.prepare("SELECT email FROM users WHERE id = ?")
          .bind(row.user_id)
          .first<{ email?: string }>();
        if (user?.email) {
          await clearAttempts(this.env.DB, user.email, clientIp);
        }
      } catch (err) {
        console.warn("[AuthService.confirmEmail] Falha ao limpar tentativas (não fatal):", err);
      }
    }

    console.info("[AuthService.confirmEmail] Email confirmado com sucesso:", row.user_id);

    return {
      success: true,
      data: {
        message: "Email confirmado.",
      },
    };
  }
}
