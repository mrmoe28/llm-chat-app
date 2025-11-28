import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectDocuments,
  createDocument,
  deleteDocument,
  getDocumentById,
  createDocumentChunk
} from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET: Retrieve all documents for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const documents = await getProjectDocuments(id, userId);
    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Upload a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;

    if (!userId || !file) {
      return NextResponse.json(
        { error: 'userId and file are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: .txt, .pdf, .doc, .docx' },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text based on file type
    let extractedText = '';
    if (fileExt === '.txt') {
      extractedText = buffer.toString('utf-8');
    } else {
      // For PDF, DOC, DOCX - placeholder for now
      // Agent 4 will implement actual extraction using pdf-parse and mammoth
      extractedText = `[Document content extraction pending - ${file.name}]`;
    }

    // Generate unique filename
    const uniqueFilename = `${uuidv4()}${fileExt}`;

    // For now, store as base64 in the database (Vercel Blob will be implemented by Agent 4)
    const storagePath = `data:${file.type};base64,${buffer.toString('base64')}`;

    const { id } = await params;

    // Create document record
    const document = await createDocument(
      id,
      userId,
      uniqueFilename,
      file.name,
      fileExt.substring(1),
      file.size,
      storagePath,
      extractedText
    );

    // Chunk the text (simple implementation - 500 chars per chunk)
    const chunkSize = 500;
    const chunks: string[] = [];
    for (let i = 0; i < extractedText.length; i += chunkSize) {
      chunks.push(extractedText.substring(i, i + chunkSize));
    }

    // Store chunks
    for (let i = 0; i < chunks.length; i++) {
      await createDocumentChunk(
        document.id,
        id,
        i,
        chunks[i],
        chunks[i].split(/\s+/).length // Approximate token count
      );
    }

    // Update chunk count
    const { updateDocumentChunkCount } = await import('@/lib/db');
    await updateDocumentChunkCount(document.id, chunks.length);

    return NextResponse.json({ document }, { status: 201 });
  } catch (error: any) {
    console.error('Upload document error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const documentId = searchParams.get('documentId');

    if (!userId || !documentId) {
      return NextResponse.json(
        { error: 'userId and documentId are required' },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Verify document belongs to user and project
    const document = await getDocumentById(documentId, userId);
    if (!document || document.project_id !== id) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    await deleteDocument(documentId, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
