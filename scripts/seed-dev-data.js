/**
 * Script para seed de dados de desenvolvimento
 * Execute: node scripts/seed-dev-data.js
 */

console.log("🌱 Seed de dados de desenvolvimento");
console.log("⚠️  Execute via wrangler local ou conecte ao DB adequadamente");

// Exemplo de queries de seed
const seedQueries = [
  `
  -- Criar usuário de teste
  INSERT INTO users (id, email, password_hash, role, email_confirmed, session_version)
  VALUES (
    'test-user-id-123',
    'test@example.com',
    '$2a$10$hashedPasswordExample', -- Use bcrypt para gerar
    'user',
    1,
    1
  );
  `,
  `
  -- Criar perfil do usuário de teste
  INSERT INTO user_profiles (user_id, full_name, phone, birth_date)
  VALUES (
    'test-user-id-123',
    'Usuário de Teste',
    '+5511999999999',
    '1990-01-01'
  );
  `,
  `
  -- Criar usuário admin
  INSERT INTO users (id, email, password_hash, role, email_confirmed, session_version)
  VALUES (
    'admin-user-id-456',
    'admin@example.com',
    '$2a$10$hashedPasswordExample',
    'admin',
    1,
    1
  );
  `,
];

console.log("\n📋 Queries de seed:");
seedQueries.forEach((query, i) => {
  console.log(`\n--- Query ${i + 1} ---`);
  console.log(query.trim());
});

console.log("\n✅ Execute essas queries no seu ambiente de desenvolvimento");
console.log("💡 Para gerar password_hash, use bcryptjs no Node.js:");
console.log(`
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('SuaSenha123!', 10);
console.log(hash);
`);
