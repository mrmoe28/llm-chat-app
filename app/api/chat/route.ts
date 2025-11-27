import { NextRequest, NextResponse } from 'next/server';
import { createMessage, createChatSession, getSessionMessages } from '@/lib/db';

const LM_STUDIO_URL = process.env.LM_STUDIO_API_URL || 'http://192.168.1.197:1234/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, userId, sessionId } = body;

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
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

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
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
