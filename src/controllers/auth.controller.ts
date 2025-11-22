import type { Env } from "../types/Env";
import { AuthService } from "../services/auth.service";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  logoutSchema,
  confirmVerificationTokenSchema,
} from "../validators/auth.validators";
import { normalizePhone, phoneErrorMessage } from "../utils/normalizePhone";
import { verifyAccessToken } from "../service/tokenVerify";
import type { IntrospectionRequest } from "../types/Introspection";

/**
 * JSON Response helper
 */
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
) {
  const headers = { ...JSON_HEADERS, ...(extraHeaders || {}) };
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Controller de autenticação
 * Responsável por:
 * - Validar requisições HTTP
 * - Chamar services
 * - Retornar respostas HTTP apropriadas
 */
export class AuthController {
  private authService: AuthService;

  constructor(private env: Env) {
    this.authService = new AuthService(env);
  }

  /**
   * POST /auth/login
   */
  async login(request: Request): Promise<Response> {
    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    // Validar com Zod
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return jsonResponse(
        { error: firstError.message, field: firstError.path.join(".") },
        400
      );
    }

    const { email, password, remember } = validation.data;

    // Verificar configuração: precisa de JWT_SECRET OU JWT_PRIVATE_KEY_PEM
    if (!this.env.JWT_SECRET && !this.env.JWT_PRIVATE_KEY_PEM) {
      console.error(
        "[AuthController.login] JWT_SECRET ou JWT_PRIVATE_KEY_PEM ausente no ambiente"
      );
      return jsonResponse(
        {
          error:
            "Erro interno no servidor. Por favor, tente novamente mais tarde.",
        },
        500
      );
    }

    // Chamar service
    const result = await this.authService.login(
      email,
      password,
      remember,
      request
    );

    if (!result.success) {
      const statusCode =
        result.error?.code === "TOO_MANY_ATTEMPTS"
          ? 429
          : result.error?.code === "EMAIL_NOT_CONFIRMED"
          ? 403
          : 401;

      const extraHeaders =
        result.error?.retryAfterSec !== undefined
          ? { "Retry-After": String(result.error.retryAfterSec) }
          : undefined;

      return jsonResponse(
        { error: result.error?.message },
        statusCode,
        extraHeaders
      );
    }

    return jsonResponse(result.data, 200);
  }

  /**
   * POST /auth/logout
   */
  async logout(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = logoutSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return jsonResponse(
        { error: firstError.message, field: firstError.path.join(".") },
        400
      );
    }

    const { refresh_token, access_token } = validation.data;

    await this.authService.logout(refresh_token, access_token);

    return jsonResponse({ message: "Logout realizado com sucesso." }, 200);
  }

  /**
   * POST /auth/refresh
   */
  async refresh(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = refreshTokenSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse({ error: "Refresh token inválido." }, 400);
    }

    const { refresh_token } = validation.data;

    const result = await this.authService.refresh(refresh_token);

    if (!result.success) {
      return jsonResponse({ error: result.error?.message }, 401);
    }

    return jsonResponse(result.data, 200);
  }

  /**
   * POST /auth/register
   */
  async register(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return jsonResponse(
        { error: firstError.message, field: firstError.path.join(".") },
        400
      );
    }

    const { email, password, full_name, phone, birth_date } = validation.data;

    // Normalizar telefone
    const phoneNorm = normalizePhone(phone, "BR");
    if (!phoneNorm.ok || !phoneNorm.normalized) {
      return jsonResponse({ error: phoneErrorMessage(phoneNorm.reason) }, 400);
    }

    const result = await this.authService.register(
      email,
      password,
      full_name,
      phoneNorm.normalized,
      birth_date,
      request
    );

    if (!result.success) {
      const statusCode =
        result.error?.code === "EMAIL_ALREADY_EXISTS"
          ? 409
          : result.error?.code === "EMAIL_SEND_FAILED"
          ? 500
          : 400;

      return jsonResponse({ error: result.error?.message }, statusCode);
    }

    return jsonResponse(
      {
        ok: true,
        message: "Conta criada com sucesso. Verifique seu e-mail.",
        user_id: result.data?.userId,
      },
      201
    );
  }

  /**
   * POST /auth/request-reset
   */
  async requestPasswordReset(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = requestPasswordResetSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse({ error: "E-mail inválido." }, 400);
    }

    const { email } = validation.data;

    const result = await this.authService.requestPasswordReset(email);

    return jsonResponse(result.data, 200);
  }

  /**
   * POST /auth/reset-password
   */
  async resetPassword(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return jsonResponse({ error: firstError.message }, 400);
    }

    const { token, new_password } = validation.data;

    const result = await this.authService.resetPassword(token, new_password);

    if (!result.success) {
      return jsonResponse({ error: result.error?.message }, 400);
    }

    return jsonResponse(result.data, 200);
  }

  /**
   * POST /auth/change-password
   * Requer autenticação via middleware
   */
  async changePassword(request: Request, userId?: string): Promise<Response> {
    if (!userId) {
      return jsonResponse(
        { error: "Não autorizado. Token de autenticação ausente." },
        401
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return jsonResponse(
        { error: firstError.message, field: firstError.path.join(".") },
        400
      );
    }

    const { current_password, new_password } = validation.data;

    const result = await this.authService.changePassword(
      userId,
      current_password,
      new_password
    );

    if (!result.success) {
      const statusCode = result.error?.code === "INVALID_PASSWORD" ? 401 : 400;
      return jsonResponse({ error: result.error?.message }, statusCode);
    }

    return jsonResponse({ ok: true, message: result.data?.message }, 200);
  }

  /**
   * POST /auth/confirm-verification
   */
  async confirmVerification(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = confirmVerificationTokenSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse({ error: "Token inválido." }, 400);
    }

    const { token } = validation.data;

    const result = await this.authService.confirmEmail(token, request);

    if (!result.success) {
      const statusCode = result.error?.code === "TOKEN_EXPIRED" ? 401 : 400;
      return jsonResponse({ error: result.error?.message }, statusCode);
    }

    return jsonResponse(
      {
        ok: true,
        message: result.data?.message,
        already_confirmed: result.data?.alreadyConfirmed,
      },
      200
    );
  }

  /**
   * POST /auth/resend-verification
   */
  async resendVerification(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse(
        { error: "O corpo da requisição não está em formato JSON válido." },
        400
      );
    }

    const validation = requestPasswordResetSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse({ error: "E-mail inválido." }, 400);
    }

    const { email } = validation.data;

    const result = await this.authService.resendVerificationEmail(
      email,
      request
    );

    if (!result.success) {
      // Se for rate limit, adicionar header Retry-After
      if (result.error?.code === "RATE_LIMITED" && result.error.retryAfterSec) {
        return new Response(JSON.stringify({ error: result.error.message }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": result.error.retryAfterSec.toString(),
          },
        });
      }

      const statusCode =
        result.error?.code === "EMAIL_ALREADY_CONFIRMED" ? 400 : 500;
      return jsonResponse({ error: result.error?.message }, statusCode);
    }

    return jsonResponse(
      {
        ok: true,
        message: result.data?.message,
      },
      200
    );
  }

  /**
   * POST /auth/introspect
   * Valida um access token JWT e retorna suas claims
   */
  async introspect(request: Request): Promise<Response> {
    // Extrair token do header Authorization ou body
    const token = await this.extractToken(request);

    if (!token) {
      return jsonResponse(
        { error: "Token não fornecido.", reason: "missing_token" },
        401
      );
    }

    // Verificar token
    const { valid, payload, reason } = await verifyAccessToken(
      this.env,
      token,
      {
        issuer: this.env.SITE_DNS,
        audience: this.env.SITE_DNS,
      }
    );

    if (!valid || !payload) {
      return jsonResponse(
        { error: "Token inválido ou expirado.", reason },
        401
      );
    }

    return jsonResponse({ valid, payload, reason }, 200);
  }

  /**
   * Helper: Extrai token do header Authorization ou body
   */
  private async extractToken(request: Request): Promise<string | null> {
    // 1. Tentar extrair do header Authorization
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }

    // 2. Tentar extrair do body
    try {
      const body = (await request.clone().json()) as IntrospectionRequest;
      if (typeof body.token === "string") {
        return body.token.trim() || null;
      }
    } catch (err) {
      // Ignore - não é JSON válido
    }

    return null;
  }
}
