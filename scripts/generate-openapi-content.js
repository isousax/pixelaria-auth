// Script para gerar arquivo com conteúdo do openapi.yaml
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openapiPath = join(__dirname, '..', 'openapi.yaml');
const outputPath = join(__dirname, '..', 'src', 'api', 'routes', 'openapi-content.ts');

const openapiContent = readFileSync(openapiPath, 'utf-8');

const tsContent = `/**
 * Conteúdo do arquivo openapi.yaml
 * Este arquivo é gerado automaticamente. Não edite manualmente.
 * Execute: node scripts/generate-openapi-content.js
 */

export const openapiYaml = ${JSON.stringify(openapiContent)};
`;

writeFileSync(outputPath, tsContent, 'utf-8');
console.log('✅ openapi-content.ts gerado com sucesso!');
