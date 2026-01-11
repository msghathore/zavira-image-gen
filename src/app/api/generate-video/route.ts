import { NextRequest, NextResponse } from 'next/server';
import { createLaoZhangClient, generateVideo, VideoModel, VideoDuration, VideoAspectRatio, CameraMovement } from '@/lib/laozhang';
import { addMessage, saveGeneratedVideo, createConversation, uploadVideoToStorage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      conversationId,
      model = 'sora-2-pro',
      duration = '5s',
      aspectRatio = '16:9',
      startFrame,
      endFrame,
      cameraMovement,
      withAudio = false,
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.LAOZHANG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Create or use existing conversation
    let convId = conversationId;
    if (!convId) {
      const newConv = await createConversation(`Video: ${prompt.substring(0, 40)}...`);
      convId = newConv.id;
    }

    // Save user message
    const userMessage = await addMessage(convId, 'user', `[Video Request] ${prompt}`);

    // Generate video using Lao Zhang API
    const client = createLaoZhangClient(apiKey);
    const result = await generateVideo(client, {
      prompt: prompt,
      model: model as VideoModel,
      duration: duration as VideoDuration,
      aspectRatio: aspectRatio as VideoAspectRatio,
      startFrame: startFrame,
      endFrame: endFrame,
      cameraMovement: cameraMovement as CameraMovement,
      withAudio: withAudio,
    });

    // Save assistant message
    const assistantMessage = await addMessage(
      convId,
      'assistant',
      result.status === 'completed'
        ? `Generated video for: ${prompt}`
        : `Video generation started for: ${prompt} (processing...)`
    );

    // Upload video to storage if it's base64
    const videoId = uuidv4();
    let videoUrl = result.url || '';

    if (videoUrl && videoUrl.startsWith('data:video/')) {
      try {
        videoUrl = await uploadVideoToStorage(videoUrl, convId, videoId);
      } catch (uploadError) {
        console.error('Video storage upload failed:', uploadError);
        // Fall back to original URL
      }
    }

    // Save generated video (or placeholder for async generation)
    const savedVideo = await saveGeneratedVideo(
      assistantMessage.id,
      convId,
      videoUrl,
      prompt,
      model,
      duration,
      aspectRatio,
      cameraMovement,
      startFrame ? 'uploaded' : undefined,
      endFrame ? 'uploaded' : undefined
    );

    return NextResponse.json({
      success: true,
      conversationId: convId,
      message: assistantMessage,
      video: {
        ...savedVideo,
        url: result.url,
        taskId: result.taskId,
        status: result.status,
      },
    });
  } catch (error: unknown) {
    console.error('Video generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
