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

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    // Use the internal search API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error('Web search failed:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, sessionId, projectId, webSearchEnabled } = body;

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

    // Web Search: Search the web if enabled
    let webSearchContext = '';
    let webSources: Array<{ title: string; url: string; snippet: string }> = [];

    if (webSearchEnabled) {
      const searchResults = await performWebSearch(message);
      if (searchResults.length > 0) {
        webSources = searchResults;
        webSearchContext = '\n\nWeb search results:\n';
        webSearchContext += searchResults.map((result, idx) => 
          `[${idx + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}`
        ).join('\n\n');
      }
    }

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

    // Add web search context to the last user message if available
    if (webSearchContext) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        lastMessage.content += webSearchContext;
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
        model: process.env.LM_STUDIO_MODEL || 'liquid/lfm2-1.2b',
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
      webSources: webSources.length > 0 ? webSources : undefined,
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
