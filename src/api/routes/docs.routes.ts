import { Hono } from "hono";
import { swaggerUI, redocUI } from "../../utils/swagger";
import type { Env } from "../../types/Env";

/**
 * Rotas de documentação
 */
export function createDocsRoutes() {
  const router = new Hono<{ Bindings: Env }>();

  // GET /docs - Swagger UI
  router.get("/", (c) => swaggerUI(c));

  // GET /docs/redoc - ReDoc UI (alternativa)
  router.get("/redoc", (c) => redocUI(c));

  // GET /docs/openapi.yaml - Especificação OpenAPI
  router.get("/openapi.yaml", async (c) => {
    // Carregar o arquivo openapi.yaml
    const openapiYaml = `openapi: 3.1.0
info:
  title: Auth Engine API
  version: 1.0.0
  description: |
    API de autenticação completa com JWT, rate limiting e RBAC.
    
    Visite [GitHub](https://github.com/seu-usuario/auth-engine) para mais informações.
servers:
  - url: https://auth.pixelaria.com.br
    description: Produção
  - url: http://localhost:8787
    description: Desenvolvimento local
`;

    return new Response(openapiYaml, {
      headers: {
        "Content-Type": "application/yaml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  });

  // GET /docs/openapi.json - Especificação OpenAPI em JSON
  router.get("/openapi.json", async (c) => {
    // Para simplicidade, retornar erro indicando que YAML é a fonte oficial
    return c.json(
      {
        error: "Use /docs/openapi.yaml para a especificação oficial",
        yaml_url: "/docs/openapi.yaml",
      },
      404
    );
  });

  return router;
}
