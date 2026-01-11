import { NextRequest, NextResponse } from 'next/server';
import { createLaoZhangClient, checkVideoStatus } from '@/lib/laozhang';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const videoId = searchParams.get('videoId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const apiKey = process.env.LAOZHANG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const client = createLaoZhangClient(apiKey);
    const result = await checkVideoStatus(client, taskId);

    // If video is completed and we have a videoId, update the database
    if (result.status === 'completed' && result.url && videoId) {
      await supabase
        .from('generated_videos')
        .update({ video_url: result.url })
        .eq('id', videoId);
    }

    return NextResponse.json({
      success: true,
      taskId,
      status: result.status,
      url: result.url,
      error: result.error,
    });
  } catch (error: unknown) {
    console.error('Video status check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check video status';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
