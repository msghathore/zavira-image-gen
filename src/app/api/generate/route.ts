import { NextRequest, NextResponse } from 'next/server';
import { createLaoZhangClient, generateImage } from '@/lib/laozhang';
import { addMessage, saveGeneratedImage, getConversationImages, createConversation, uploadImageToStorage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { generateBlurhashFromBase64, optimizeBase64ToWebP } from '@/lib/server-image-processing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      conversationId,
      model = 'nano-banana-pro',
      imageSize = '4K',
      aspectRatio = '1:1',
      referenceImageId,
      uploadedImage, // Base64 data URL from user upload
      styleReference, // Base64 data URL for style inspiration
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
      styleReference: styleReference,
    });

    // Save assistant message
    const assistantMessage = await addMessage(
      convId,
      'assistant',
      result.revisedPrompt || `Generated image for: ${prompt}`
    );

    // Upload image to Supabase Storage (converts base64 to URL)
    const imageId = uuidv4();
    let imageUrl = result.url;
    let blurhash = '';

    // Only upload if it's base64 data
    if (result.url.startsWith('data:image/')) {
      try {
        // Generate blurhash and optimize to WebP for faster loading
        const optimized = await optimizeBase64ToWebP(result.url, {
          maxWidth: 1200,
          quality: 80,
        });

        blurhash = optimized.blurhash;
        console.log(`Image optimized: ${Math.round(optimized.size / 1024)}KB, blurhash: ${blurhash.substring(0, 10)}...`);

        // Upload optimized WebP to storage
        imageUrl = await uploadImageToStorage(optimized.dataUrl, convId, imageId);
      } catch (uploadError) {
        console.error('Storage upload failed, using base64:', uploadError);
        // Try to at least generate blurhash for the original
        try {
          blurhash = await generateBlurhashFromBase64(result.url);
        } catch {
          // Ignore blurhash errors
        }
      }
    }

    // Save generated image with storage URL and blurhash
    const savedImage = await saveGeneratedImage(
      assistantMessage.id,
      convId,
      imageUrl,
      prompt,
      result.revisedPrompt,
      model,
      blurhash
    );

    return NextResponse.json({
      success: true,
      conversationId: convId,
      message: assistantMessage,
      image: {
        ...savedImage,
        url: imageUrl,
        blurhash,
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
