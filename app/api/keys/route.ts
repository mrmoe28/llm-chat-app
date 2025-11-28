import { NextRequest, NextResponse } from 'next/server';
import { createApiKey, getUserApiKeys, deleteApiKey } from '@/lib/db';
import { randomBytes } from 'crypto';

// Generate API key in sk-proj-xxx format like OpenAI
function generateApiKey(): string {
  const randomPart = randomBytes(32).toString('base64url');
  return `sk-proj-${randomPart}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const keys = await getUserApiKeys(userId);

    // Mask the keys for security (show only last 4 characters)
    const maskedKeys = keys.map(key => ({
      ...key,
      key: `sk-proj-...${key.key.slice(-4)}`,
      fullKey: undefined, // Don't send full key
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error: any) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'userId and name are required' },
        { status: 400 }
      );
    }

    const apiKey = generateApiKey();
    const key = await createApiKey(userId, name, apiKey);

    return NextResponse.json({
      key: {
        ...key,
        fullKey: apiKey, // Only show full key once during creation
      },
    });
  } catch (error: any) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyId, userId } = body;

    if (!keyId || !userId) {
      return NextResponse.json(
        { error: 'keyId and userId are required' },
        { status: 400 }
      );
    }

    await deleteApiKey(keyId, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
