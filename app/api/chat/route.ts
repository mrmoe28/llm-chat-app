import { NextRequest, NextResponse } from 'next/server';
import {
  createMessage,
  createChatSession,
  getSessionMessages,
  searchDocumentChunks,
  getProjectById,
  getProjectDocuments
} from '@/lib/db';

const LM_STUDIO_URL = process.env.LM_STUDIO_API_URL || 'http://192.168.1.197:1234/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, sessionId, projectId } = body;

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Create new session if not provided
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const newSession = await createChatSession(
        userId,
        message.substring(0, 50) + '...'
      );
      currentSessionId = newSession.id;
    }

    // Save user message to database
    await createMessage(currentSessionId, userId, 'user', message);

    // Get conversation history
    const messages = await getSessionMessages(currentSessionId);
    const conversationHistory: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // RAG: Search knowledge base if projectId is provided and has documents
    let ragContext = '';
    let sources: Array<{ documentId: string; filename: string; content: string; rank: number }> = [];

    if (projectId) {
      // Check if project has documents
      const documents = await getProjectDocuments(projectId, userId);

      if (documents.length > 0) {
        // Perform full-text search on document chunks
        const searchResults = await searchDocumentChunks(projectId, message, 5);

        if (searchResults.length > 0) {
          // Build context from search results
          ragContext = '\n\nRelevant information from knowledge base:\n';
          ragContext += searchResults.map((chunk, idx) => {
            // Find document for this chunk
            const doc = documents.find(d => d.id === chunk.document_id);

            if (doc) {
              sources.push({
                documentId: chunk.document_id,
                filename: doc.original_filename,
                content: chunk.content.substring(0, 100) + '...',
                rank: chunk.rank
              });
            }

            return `[Source ${idx + 1}]: ${chunk.content}`;
          }).join('\n\n');
        }
      }

      // Add system prompt if project has one
      const project = await getProjectById(projectId, userId);
      if (project?.system_prompt) {
        conversationHistory.unshift({
          role: 'system',
          content: project.system_prompt
        });
      }
    }

    // Add RAG context to the last user message if available
    if (ragContext) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        lastMessage.content += ragContext;
      }
    }

    // Call LM Studio API
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'local-model',
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Save assistant response to database
    await createMessage(currentSessionId, userId, 'assistant', assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      sessionId: currentSessionId,
      sources: sources.length > 0 ? sources : undefined,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
