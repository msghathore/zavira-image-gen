import { NextRequest, NextResponse } from 'next/server';
import { getConversations, createConversation, deleteConversation } from '@/lib/supabase';

export async function GET() {
  try {
    const conversations = await getConversations();
    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title } = body;

    const conversation = await createConversation(title);
    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    await deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
