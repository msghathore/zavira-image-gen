import { NextRequest, NextResponse } from 'next/server';
import { getImageData } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await getImageData(id);
    return NextResponse.json({ image });
  } catch (error: any) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
