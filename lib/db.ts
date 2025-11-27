import { sql } from '@vercel/postgres';

export interface User {
  id: string;
  email: string;
  password: string;
  created_at: Date;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key: string;
  name: string;
  last_used: Date | null;
  created_at: Date;
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create chat_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create chat_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create api_keys table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        key VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apikeys_key ON api_keys(key)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// User operations
export async function createUser(email: string, hashedPassword: string) {
  const result = await sql`
    INSERT INTO users (email, password)
    VALUES (${email}, ${hashedPassword})
    RETURNING id, email, created_at
  `;
  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return result.rows[0] as User | undefined;
}

// Chat session operations
export async function createChatSession(userId: string, title: string) {
  const result = await sql`
    INSERT INTO chat_sessions (user_id, title)
    VALUES (${userId}, ${title})
    RETURNING *
  `;
  return result.rows[0] as ChatSession;
}

export async function getUserSessions(userId: string) {
  const result = await sql`
    SELECT * FROM chat_sessions
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return result.rows as ChatSession[];
}

export async function updateSessionTimestamp(sessionId: string) {
  await sql`
    UPDATE chat_sessions
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sessionId}
  `;
}

export async function deleteSession(sessionId: string, userId: string) {
  await sql`
    DELETE FROM chat_sessions
    WHERE id = ${sessionId} AND user_id = ${userId}
  `;
}

// Chat message operations
export async function createMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const result = await sql`
    INSERT INTO chat_messages (session_id, user_id, role, content)
    VALUES (${sessionId}, ${userId}, ${role}, ${content})
    RETURNING *
  `;
  await updateSessionTimestamp(sessionId);
  return result.rows[0] as ChatMessage;
}

export async function getSessionMessages(sessionId: string) {
  const result = await sql`
    SELECT * FROM chat_messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
  `;
  return result.rows as ChatMessage[];
}

// API Key operations
export async function createApiKey(userId: string, name: string, key: string) {
  const result = await sql`
    INSERT INTO api_keys (user_id, name, key)
    VALUES (${userId}, ${name}, ${key})
    RETURNING id, user_id, key, name, last_used, created_at
  `;
  return result.rows[0] as ApiKey;
}

export async function getUserApiKeys(userId: string) {
  const result = await sql`
    SELECT id, user_id, key, name, last_used, created_at
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result.rows as ApiKey[];
}

export async function getApiKeyDetails(key: string) {
  const result = await sql`
    SELECT * FROM api_keys WHERE key = ${key}
  `;
  return result.rows[0] as ApiKey | undefined;
}

export async function updateApiKeyLastUsed(keyId: string) {
  await sql`
    UPDATE api_keys
    SET last_used = CURRENT_TIMESTAMP
    WHERE id = ${keyId}
  `;
}

export async function deleteApiKey(keyId: string, userId: string) {
  await sql`
    DELETE FROM api_keys
    WHERE id = ${keyId} AND user_id = ${userId}
  `;
}
