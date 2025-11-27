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
  project_id: string | null;
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

export interface Project {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  description: string | null;
  system_prompt: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  project_id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text: string | null;
  chunk_count: number;
  upload_date: Date;
  created_at: Date;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  project_id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
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

    // Create projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(50) DEFAULT '📁',
        description TEXT,
        system_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(10) NOT NULL,
        file_size BIGINT NOT NULL,
        storage_path VARCHAR(500) NOT NULL,
        extracted_text TEXT,
        chunk_count INTEGER DEFAULT 0,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create document_chunks table
    await sql`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        token_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add project_id to chat_sessions
    await sql`
      ALTER TABLE chat_sessions
      ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_apikeys_key ON api_keys(key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chunks_project ON document_chunks(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_project ON chat_sessions(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chunks_content_fts ON document_chunks USING GIN(to_tsvector('english', content))`;

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

// Project operations
export async function createProject(
  userId: string,
  name: string,
  icon: string = '📁',
  description?: string,
  systemPrompt?: string
) {
  const result = await sql`
    INSERT INTO projects (user_id, name, icon, description, system_prompt)
    VALUES (${userId}, ${name}, ${icon}, ${description || null}, ${systemPrompt || null})
    RETURNING *
  `;
  return result.rows[0] as Project;
}

export async function getUserProjects(userId: string) {
  const result = await sql`
    SELECT * FROM projects
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return result.rows as Project[];
}

export async function getProjectById(projectId: string, userId: string) {
  const result = await sql`
    SELECT * FROM projects
    WHERE id = ${projectId} AND user_id = ${userId}
  `;
  return result.rows[0] as Project | undefined;
}

export async function updateProject(
  projectId: string,
  userId: string,
  updates: {
    name?: string;
    icon?: string;
    description?: string;
    system_prompt?: string;
  }
) {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push(`name = $${fields.length + 1}`);
    values.push(updates.name);
  }
  if (updates.icon !== undefined) {
    fields.push(`icon = $${fields.length + 1}`);
    values.push(updates.icon);
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${fields.length + 1}`);
    values.push(updates.description);
  }
  if (updates.system_prompt !== undefined) {
    fields.push(`system_prompt = $${fields.length + 1}`);
    values.push(updates.system_prompt);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(projectId, userId);

  const result = await sql.query(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND user_id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0] as Project | undefined;
}

export async function deleteProject(projectId: string, userId: string) {
  await sql`
    DELETE FROM projects
    WHERE id = ${projectId} AND user_id = ${userId}
  `;
}

// Document operations
export async function createDocument(
  projectId: string,
  userId: string,
  filename: string,
  originalFilename: string,
  fileType: string,
  fileSize: number,
  storagePath: string,
  extractedText?: string
) {
  const result = await sql`
    INSERT INTO documents (
      project_id, user_id, filename, original_filename, file_type,
      file_size, storage_path, extracted_text
    )
    VALUES (
      ${projectId}, ${userId}, ${filename}, ${originalFilename}, ${fileType},
      ${fileSize}, ${storagePath}, ${extractedText || null}
    )
    RETURNING *
  `;
  return result.rows[0] as Document;
}

export async function getProjectDocuments(projectId: string, userId: string) {
  const result = await sql`
    SELECT * FROM documents
    WHERE project_id = ${projectId} AND user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return result.rows as Document[];
}

export async function getDocumentById(documentId: string, userId: string) {
  const result = await sql`
    SELECT * FROM documents
    WHERE id = ${documentId} AND user_id = ${userId}
  `;
  return result.rows[0] as Document | undefined;
}

export async function updateDocumentChunkCount(documentId: string, chunkCount: number) {
  await sql`
    UPDATE documents
    SET chunk_count = ${chunkCount}
    WHERE id = ${documentId}
  `;
}

export async function deleteDocument(documentId: string, userId: string) {
  await sql`
    DELETE FROM documents
    WHERE id = ${documentId} AND user_id = ${userId}
  `;
}

// Document chunk operations
export async function createDocumentChunk(
  documentId: string,
  projectId: string,
  chunkIndex: number,
  content: string,
  tokenCount?: number
) {
  const result = await sql`
    INSERT INTO document_chunks (document_id, project_id, chunk_index, content, token_count)
    VALUES (${documentId}, ${projectId}, ${chunkIndex}, ${content}, ${tokenCount || null})
    RETURNING *
  `;
  return result.rows[0] as DocumentChunk;
}

export async function getDocumentChunks(documentId: string) {
  const result = await sql`
    SELECT * FROM document_chunks
    WHERE document_id = ${documentId}
    ORDER BY chunk_index ASC
  `;
  return result.rows as DocumentChunk[];
}

export async function searchDocumentChunks(projectId: string, searchQuery: string, limit: number = 5) {
  const result = await sql`
    SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${searchQuery})) as rank
    FROM document_chunks
    WHERE project_id = ${projectId}
    AND to_tsvector('english', content) @@ plainto_tsquery('english', ${searchQuery})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
  return result.rows as (DocumentChunk & { rank: number })[];
}
