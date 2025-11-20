export function getDynamicCorsOrigin(origin: string | null): string {
  const allowedOrigins = [
    "https://pixelaria.com.br",
    "https://app.pixelaria.com.br",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }

  // Se não for reconhecido, bloqueia
  return "null";
}
