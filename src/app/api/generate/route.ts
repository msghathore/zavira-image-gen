import { NextRequest, NextResponse } from 'next/server';
import { createLaoZhangClient, generateImage } from '@/lib/laozhang';
import { addMessage, saveGeneratedImage, getConversationImages, createConversation } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      conversationId,
      model = 'nano-banana-2',
      imageSize = '4K',
      aspectRatio = '1:1',
      referenceImageId,
      uploadedImage, // Base64 data URL from user upload
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

    // Determine if this is an edit request and get reference image
    let referenceImageData: string | undefined;
    const editKeywords = ['edit', 'modify', 'change', 'update', 'make it', 'add', 'remove', 'adjust', 'keep', 'same', 'but'];
    const isEditRequest = editKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword)
    );

    // Priority: User-uploaded image takes precedence over conversation history
    if (uploadedImage) {
      // User uploaded an image - use it as the reference
      referenceImageData = uploadedImage;
    } else if (previousImages && previousImages.length > 0) {
      // Fall back to conversation history images
      if (referenceImageId) {
        // User explicitly selected an image from history
        referenceImageData = previousImages.find(img => img.id === referenceImageId)?.image_url;
      } else if (isEditRequest) {
        // Auto-select the most recent image for edit requests
        referenceImageData = previousImages[0]?.image_url;
      }
    }

    // Save user message
    const userMessage = await addMessage(convId, 'user', prompt);

    // Generate image using Lao Zhang API
    const client = createLaoZhangClient(apiKey);
    const result = await generateImage(client, {
      prompt: prompt,
      model: model as any,
      imageSize: imageSize as any,
      aspectRatio: aspectRatio as any,
      referenceImage: referenceImageData,
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
