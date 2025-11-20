import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "../types/Env";
import { createAuthRoutes } from "./routes/auth.routes";
import { createDocsRoutes } from "./routes/docs.routes";
import { ensureRequestId } from "../middleware/requestId";
import { getDynamicCorsOrigin } from "../utils/getDynamicCorsOrigin";

/**
 * Configuração principal da aplicação
 * Wiring de rotas, middlewares globais e handlers
 */
export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  // Middleware global: Request ID + CORS
  app.use("*", async (c, next) => {
    const requestId = ensureRequestId(c.req.raw);
    await next();
    // Adicionar headers na resposta
    c.res.headers.set("X-Request-Id", requestId);
  });

  // Middleware global: CORS dinâmico
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Adaptar getDynamicCorsOrigin para retornar string ou null
        const allowed = getDynamicCorsOrigin(origin);
        return allowed || origin;
      },
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    })
  );

  // Rotas organizadas por domínio
  app.route("/auth", createAuthRoutes());
  app.route("/docs", createDocsRoutes());

  // TODO: Adicionar rotas de outros domínios quando migrados:
  // app.route("/user", createUserRoutes());
  // app.route("/admin", createAdminRoutes());

  // Health check
  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: "Recurso não encontrado ou não implementado" }, 404);
  });

  // Error handler
  app.onError((err, c) => {
    console.error("[App Error]", err);
    return c.json(
      {
        error: "Erro interno no servidor",
        message: err.message,
      },
      500
    );
  });

  return app;
}
