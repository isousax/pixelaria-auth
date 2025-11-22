/**
 * Type declarations for raw file imports
 * Permite importar arquivos com ?raw suffix
 */

declare module "*.yaml?raw" {
  const content: string;
  export default content;
}

declare module "*.yml?raw" {
  const content: string;
  export default content;
}

declare module "*.txt?raw" {
  const content: string;
  export default content;
}
