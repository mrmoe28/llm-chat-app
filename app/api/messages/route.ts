import { NextRequest, NextResponse } from 'next/server';
import { getSessionMessages } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const messages = await getSessionMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Messages API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
