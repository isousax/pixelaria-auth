import type { Context, Next } from "hono";
import type { Env } from "../types/Env";

/**
 * Configuração de rate limit
 */
interface RateLimitConfig {
  /**
   * Número máximo de requisições permitidas
   */
  maxRequests: number;

  /**
   * Janela de tempo em segundos
   */
  windowSeconds: number;

  /**
   * Mensagem de erro customizada
   */
  message?: string;

  /**
   * Identificador customizado (default: IP do cliente)
   */
  keyGenerator?: (c: Context) => string;
}

/**
 * Tipo do contexto Hono com Env
 */
type AppContext = {
  Bindings: Env;
};

/**
 * Extrai IP do cliente (compatível com Cloudflare Workers)
 */
function getClientIp(request: Request): string {
  // Cloudflare fornece o IP real no header CF-Connecting-IP
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;

  // Fallback: X-Forwarded-For
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    const ips = forwardedFor.split(",");
    return ips[0].trim();
  }

  // Fallback: X-Real-IP
  const realIp = request.headers.get("X-Real-IP");
  if (realIp) return realIp;

  // Último fallback: unknown
  return "unknown";
}

/**
 * Middleware de rate limiting baseado em KV store
 * 
 * Usa Cloudflare KV para armazenar contadores de requisições.
 * Se KV não estiver configurado, apenas loga warnings e permite a requisição.
 * 
 * @example
 * ```typescript
 * // Limitar login a 5 requisições por minuto
 * router.post("/login", rateLimit({ maxRequests: 5, windowSeconds: 60 }), loginHandler);
 * 
 * // Limitar por user ID ao invés de IP
 * router.post("/change-password", rateLimit({
 *   maxRequests: 3,
 *   windowSeconds: 300,
 *   keyGenerator: (c) => {
 *     const user = getAuthUser(c);
 *     return `user:${user.sub}`;
 *   }
 * }), changePasswordHandler);
 * ```
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    maxRequests,
    windowSeconds,
    message = "Muitas requisições. Tente novamente mais tarde.",
    keyGenerator,
  } = config;

  return async (c: Context<AppContext>, next: Next) => {
    const env = c.env;

    // Se KV não estiver configurado, apenas avisar e permitir
    if (!env.RATE_LIMIT_KV) {
      console.warn("[rateLimit] RATE_LIMIT_KV não configurado. Rate limiting desabilitado.");
      return next();
    }

    // Gerar chave única (IP ou customizado)
    const identifier = keyGenerator 
      ? keyGenerator(c) 
      : getClientIp(c.req.raw);
    
    const key = `ratelimit:${identifier}:${c.req.path}`;

    try {
      // Buscar contador atual
      const counterData = await env.RATE_LIMIT_KV.get(key, { type: "json" }) as {
        count: number;
        resetAt: number;
      } | null;

      const now = Date.now();

      // Se não existe ou expirou, criar novo
      if (!counterData || now >= counterData.resetAt) {
        await env.RATE_LIMIT_KV.put(
          key,
          JSON.stringify({
            count: 1,
            resetAt: now + windowSeconds * 1000,
          }),
          { expirationTtl: windowSeconds }
        );

        // Headers informativos
        c.header("X-RateLimit-Limit", String(maxRequests));
        c.header("X-RateLimit-Remaining", String(maxRequests - 1));
        c.header("X-RateLimit-Reset", String(Math.floor((now + windowSeconds * 1000) / 1000)));

        return next();
      }

      // Incrementar contador
      const newCount = counterData.count + 1;

      // Verificar se excedeu limite
      if (newCount > maxRequests) {
        const retryAfterSec = Math.ceil((counterData.resetAt - now) / 1000);

        console.warn(`[rateLimit] Limite excedido para ${identifier} em ${c.req.path}`);

        return c.json(
          {
            error: message,
            code: "RATE_LIMIT_EXCEEDED",
            retry_after_seconds: retryAfterSec,
          },
          429,
          {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(counterData.resetAt / 1000)),
          }
        );
      }

      // Atualizar contador
      await env.RATE_LIMIT_KV.put(
        key,
        JSON.stringify({
          count: newCount,
          resetAt: counterData.resetAt,
        }),
        { expirationTtl: Math.ceil((counterData.resetAt - now) / 1000) }
      );

      // Headers informativos
      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", String(maxRequests - newCount));
      c.header("X-RateLimit-Reset", String(Math.floor(counterData.resetAt / 1000)));

      return next();
    } catch (error) {
      console.error("[rateLimit] Erro ao verificar rate limit:", error);
      // Em caso de erro, permitir a requisição (fail open)
      return next();
    }
  };
}

/**
 * Rate limit pré-configurado para endpoints de autenticação
 * 5 requisições por minuto
 */
export const authRateLimit = rateLimit({
  maxRequests: 5,
  windowSeconds: 60,
  message: "Muitas tentativas de login. Aguarde 1 minuto.",
});

/**
 * Rate limit pré-configurado para endpoints sensíveis
 * 3 requisições por 5 minutos
 */
export const strictRateLimit = rateLimit({
  maxRequests: 3,
  windowSeconds: 300,
  message: "Limite de requisições excedido. Aguarde 5 minutos.",
});

/**
 * Rate limit pré-configurado para endpoints gerais
 * 60 requisições por minuto
 */
export const generalRateLimit = rateLimit({
  maxRequests: 60,
  windowSeconds: 60,
  message: "Muitas requisições. Aguarde antes de tentar novamente.",
});
