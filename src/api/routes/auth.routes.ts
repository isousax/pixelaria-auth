import { Hono } from "hono";
import { AuthController } from "../../controllers/auth.controller";
import { jwksHandler } from "../../utils/jwks";
import { requireAuth, getAuthUser, type AppContext } from "../../middleware/auth";
import { authRateLimit, strictRateLimit } from "../../middleware/rateLimit";

/**
 * Rotas de autenticação
 */
export function createAuthRoutes() {
  const router = new Hono<AppContext>();

  // GET /auth/.well-known/jwks.json
  router.get("/.well-known/jwks.json", async (c) => {
    return jwksHandler(c.env);
  });

  // POST /auth/introspect
  router.post("/introspect", async (c) => {
    const controller = new AuthController(c.env);
    return controller.introspect(c.req.raw);
  });

  // POST /auth/login (rate limited)
  router.post("/login", authRateLimit, async (c) => {
    const controller = new AuthController(c.env);
    return controller.login(c.req.raw);
  });

  // POST /auth/logout
  router.post("/logout", async (c) => {
    const controller = new AuthController(c.env);
    return controller.logout(c.req.raw);
  });

  // POST /auth/refresh
  router.post("/refresh", async (c) => {
    const controller = new AuthController(c.env);
    return controller.refresh(c.req.raw);
  });

  // POST /auth/register (rate limited)
  router.post("/register", authRateLimit, async (c) => {
    const controller = new AuthController(c.env);
    return controller.register(c.req.raw);
  });

  // POST /auth/request-reset (strict rate limit)
  router.post("/request-reset", strictRateLimit, async (c) => {
    const controller = new AuthController(c.env);
    return controller.requestPasswordReset(c.req.raw);
  });

  // POST /auth/reset-password (strict rate limit)
  router.post("/reset-password", strictRateLimit, async (c) => {
    const controller = new AuthController(c.env);
    return controller.resetPassword(c.req.raw);
  });

  // POST /auth/change-password (requer autenticação + strict rate limit)
  router.post("/change-password", strictRateLimit, requireAuth, async (c) => {
    const controller = new AuthController(c.env);
    const user = getAuthUser(c);
    return controller.changePassword(c.req.raw, user.sub);
  });

  // POST /auth/confirm-verification
  router.post("/confirm-verification", async (c) => {
    const controller = new AuthController(c.env);
    return controller.confirmVerification(c.req.raw);
  });

  // POST /auth/resend-verification (rate limited)
  router.post("/resend-verification", authRateLimit, async (c) => {
    const controller = new AuthController(c.env);
    return controller.resendVerification(c.req.raw);
  });

  return router;
}
