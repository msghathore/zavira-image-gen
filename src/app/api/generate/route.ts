import { NextRequest, NextResponse } from 'next/server';
import { createLaoZhangClient, generateImage, buildEditPrompt } from '@/lib/laozhang';
import { addMessage, saveGeneratedImage, getConversationImages, createConversation } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      conversationId,
      model = 'nano-banana-pro',
      size = '1024x1024',
      referenceImageId
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
      const newConv = await createConversation(prompt.substring(0, 50) + '...');
      convId = newConv.id;
    }

    // Get previous images for context
    const previousImages = await getConversationImages(convId);

    // Build context-aware prompt
    let finalPrompt = prompt;
    if (previousImages && previousImages.length > 0) {
      const imageContext = previousImages.map(img => ({
        prompt: img.prompt,
        url: img.image_url,
      }));

      // Find reference image if specified
      const referenceUrl = referenceImageId
        ? previousImages.find(img => img.id === referenceImageId)?.image_url
        : undefined;

      finalPrompt = buildEditPrompt(prompt, imageContext, referenceUrl);
    }

    // Save user message
    const userMessage = await addMessage(convId, 'user', prompt);

    // Generate image using Lao Zhang API
    const client = createLaoZhangClient(apiKey);
    const result = await generateImage(client, {
      prompt: finalPrompt,
      model: model as any,
      size: size as any,
    });

    // Save assistant message
    const assistantMessage = await addMessage(
      convId,
      'assistant',
      result.revisedPrompt || `Generated image for: ${prompt}`
    );

    // Save generated image
    const savedImage = await saveGeneratedImage(
      assistantMessage.id,
      convId,
      result.url,
      prompt,
      result.revisedPrompt,
      model
    );

    return NextResponse.json({
      success: true,
      conversationId: convId,
      message: assistantMessage,
      image: {
        ...savedImage,
        url: result.url,
      },
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
