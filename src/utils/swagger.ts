import type { Context } from "hono";

/**
 * Serve Swagger UI para visualizar a documentação
 */
export function swaggerUI(c: Context): Response {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auth Engine API - Documentação</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .topbar {
      display: none;
    }
    .swagger-ui .info {
      margin: 30px 0;
    }
    .swagger-ui .info .title {
      font-size: 36px;
      color: #3b4151;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <script src="https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/docs/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 3,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai'
        }
      });
    }
  </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

/**
 * Serve ReDoc para visualizar a documentação (alternativa ao Swagger UI)
 */
export function redocUI(c: Context): Response {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auth Engine API - Documentação</title>
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <redoc spec-url='/docs/openapi.yaml'></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
