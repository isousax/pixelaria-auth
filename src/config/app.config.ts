import type { Env } from "../types/Env";

/**
 * Configuração centralizada da aplicação
 * Valida e normaliza variáveis de ambiente
 */
export class AppConfig {
  readonly jwtSecret: string;
  readonly jwtExpirationSec: number;
  readonly refreshTokenExpirationDays: number;
  readonly corsOrigins: string[];
  readonly environment: "development" | "production" | "test";

  constructor(env: Env) {
    // Validações críticas
    if (!env.JWT_SECRET) {
      throw new Error("JWT_SECRET não configurado");
    }

    this.jwtSecret = env.JWT_SECRET;
    this.jwtExpirationSec = env.JWT_EXPIRATION_SEC
      ? Number(env.JWT_EXPIRATION_SEC)
      : 3600; // 1 hora default

    this.refreshTokenExpirationDays = env.REFRESH_TOKEN_EXPIRATION_DAYS
      ? Number(env.REFRESH_TOKEN_EXPIRATION_DAYS)
      : 30; // 30 dias default

    // CORS origins - usar FRONTEND_URL como fallback
    this.corsOrigins = env.FRONTEND_URL
      ? [env.FRONTEND_URL]
      : ["http://localhost:3000"];

    // Environment - inferir do contexto
    this.environment = "production"; // Default seguro
  }

  isDevelopment(): boolean {
    return this.environment === "development";
  }

  isProduction(): boolean {
    return this.environment === "production";
  }
}
