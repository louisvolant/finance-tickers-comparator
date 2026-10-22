-- Accounts are relational state: one row per user, unique email, optional Google
-- identity. KV remains the cache layer for quotes, search and rates.
CREATE TABLE users (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL,
  username           TEXT NOT NULL,
  hashed_password    TEXT,
  google_id          TEXT,
  preferred_currency TEXT,
  created_at         INTEGER NOT NULL
);

-- Case-insensitive uniqueness without relying on the application to normalise
-- every read. The API still stores emails lowercased; this is the invariant.
CREATE UNIQUE INDEX users_email_unique ON users(email COLLATE NOCASE);

-- NULL is allowed for password-only accounts, and SQLite ignores NULLs in a
-- unique index, so Google-only and password-only accounts can coexist.
CREATE UNIQUE INDEX users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;

CREATE INDEX users_created_at_idx ON users(created_at);
