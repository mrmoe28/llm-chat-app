import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyDetails, updateApiKeyLastUsed, createMessage, createChatSession } from '@/lib/db';

const LM_STUDIO_URL = process.env.LM_STUDIO_API_URL || 'http://192.168.1.197:1234/v1';

export async function POST(request: NextRequest) {
  try {
    // Check for API key authentication
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Missing or invalid authorization header', type: 'invalid_request_error' } },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify API key
    const keyDetails = await getApiKeyDetails(apiKey);
    if (!keyDetails) {
      return NextResponse.json(
        { error: { message: 'Invalid API key', type: 'invalid_request_error' } },
        { status: 401 }
      );
    }

    // Update last used timestamp
    await updateApiKeyLastUsed(keyDetails.id);

    const body = await request.json();
    const { messages, model, temperature, max_tokens, stream } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: { message: 'messages is required and must be an array', type: 'invalid_request_error' } },
        { status: 400 }
      );
    }

    // Call LM Studio API
    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'local-model',
        messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 2000,
        stream: stream || false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Return OpenAI-compatible response
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error: any) {
    console.error('Chat completions API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal server error', type: 'api_error' } },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
