import type { Context, Next } from "hono";
import type { Env } from "../types/Env";
import { verifyAccessToken } from "../service/tokenVerify";

/**
 * Payload do JWT decodificado
 */
export interface JWTPayload {
  sub: string; // user_id (padrão JWT RFC 7519)
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  birth_date?: string;
  iss: string;
  aud: string;
  exp: number;
  jti?: string;
}

/**
 * Tipo de contexto Hono com variáveis customizadas
 */
export type AppContext = {
  Bindings: Env;
  Variables: {
    user?: JWTPayload;
  };
};

/**
 * Middleware para extrair e validar JWT
 * Adiciona dados do usuário ao contexto se token válido
 */
export async function requireAuth(
  c: Context<AppContext>,
  next: Next
): Promise<Response | void> {
  const env = c.env;

  // Extrair token do header Authorization
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { 
        error: "Não autorizado. Token de autenticação ausente.",
        code: "MISSING_TOKEN" 
      },
      401
    );
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return c.json(
      { 
        error: "Não autorizado. Token de autenticação inválido.",
        code: "INVALID_TOKEN" 
      },
      401
    );
  }

  // Verificar token
  const { valid, payload, reason } = await verifyAccessToken(env, token, {
    issuer: env.SITE_DNS,
    audience: env.SITE_DNS,
  });

  if (!valid || !payload) {
    const errorMessages: Record<string, string> = {
      expired: "Token expirado. Faça login novamente.",
      invalid_signature: "Token inválido. Faça login novamente.",
      revoked: "Token revogado. Faça login novamente.",
      invalid_issuer: "Token inválido.",
      invalid_audience: "Token inválido.",
      malformed: "Token malformado.",
    };

    return c.json(
      {
        error: errorMessages[reason || "invalid"] || "Token inválido.",
        code: "INVALID_TOKEN",
        reason,
      },
      401
    );
  }

  // Adicionar dados do usuário ao contexto
  c.set("user", payload as JWTPayload);

  await next();
}

/**
 * Middleware para verificar se usuário tem role específica
 */
export function requireRole(...allowedRoles: string[]) {
  return async (c: Context<AppContext>, next: Next): Promise<Response | void> => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          error: "Não autorizado. Autenticação requerida.",
          code: "UNAUTHORIZED",
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: "Acesso negado. Você não tem permissão para acessar este recurso.",
          code: "FORBIDDEN",
          required_roles: allowedRoles,
          user_role: user.role,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware específico para admin
 */
export const requireAdmin = requireRole("admin");

/**
 * Helper para extrair usuário do contexto com type safety
 */
export function getAuthUser(c: Context<AppContext>): JWTPayload {
  const user = c.get("user");
  
  if (!user) {
    throw new Error("Usuário não autenticado. Use middleware requireAuth primeiro.");
  }

  return user;
}
