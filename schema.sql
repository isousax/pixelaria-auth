-- ===================================================================
-- schema.sql (SQLite)
-- Created: 28/09/2025
-- Author: isousax
-- ===================================================================

PRAGMA foreign_keys = ON;

-- ===================================================================
-- UTIL: UUID default expression (in rows per table using randomblob)
-- ===================================================================

-- ===================================================================
-- USERS + related auth tables
-- ===================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (
    lower(
      hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
      substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
    )
  ),
  email TEXT UNIQUE NOT NULL,
  email_confirmed INTEGER DEFAULT 0,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'patient',
  session_version INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY DEFAULT (
    lower(
      hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
      substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
    )
  ),
  user_id TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  phone TEXT,
  birth_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens (hashed)
CREATE TABLE IF NOT EXISTS email_verification_codes (
  user_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  used_at TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_token_hash ON email_verification_codes(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_expires ON email_verification_codes(expires_at);

-- Password reset tokens (hashed)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used INTEGER DEFAULT 0,
  used_at TEXT,
  last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- User sessions / refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT (
    lower(
      hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
      substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))
    )
  ),
  user_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked INTEGER DEFAULT 0,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Revoked JTI (access token revocation list)
CREATE TABLE IF NOT EXISTS revoked_jti (
  jti TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revoked_jti_user ON revoked_jti(user_id);

-- Password change audit
CREATE TABLE IF NOT EXISTS password_change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_change_user ON password_change_log(user_id);

-- Login attempts (per email+IP) and global (per email)
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT NOT NULL,
  ip TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  locked_until TEXT,
  PRIMARY KEY(email, ip)
);

CREATE TABLE IF NOT EXISTS login_attempts_global (
  email TEXT PRIMARY KEY,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TEXT,
  locked_until TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip);
CREATE INDEX IF NOT EXISTS idx_login_attempts_global_email ON login_attempts_global(email);

-- ===================================================================
-- MISC NOTES
-- ===================================================================
-- If you ever need to drop all tables (dev only), use:
-- PRAGMA foreign_keys = OFF;
-- DROP TABLE IF EXISTS <table_name>;
-- PRAGMA foreign_keys = ON;
--
-- Keep migrations for schema changes (ALTER TABLE) rather than editing production DB directly.