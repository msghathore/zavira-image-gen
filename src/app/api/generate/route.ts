import { NextRequest } from 'next/server';
import { createLaoZhangClient, generateImage, summarizePromptToTitle } from '@/lib/laozhang';
import { addMessage, saveGeneratedImage, getConversationImages, createConversation, uploadImageToStorage, updateConversationTitle } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { generateBlurhashFromBase64 } from '@/lib/server-image-processing';

// Streaming response to bypass Vercel's 4.5MB payload limit
// The large image is uploaded directly to storage, only URLs are streamed back
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        const body = await request.json();
        const {
          prompt,
          conversationId,
          model = 'nano-banana-pro',
          imageSize = '4K',
          aspectRatio = '1:1',
          referenceImageId,
          uploadedImage,
          styleReference,
        } = body;

        if (!prompt) {
          sendEvent({ error: 'Prompt is required' });
          controller.close();
          return;
        }

        const apiKey = process.env.LAOZHANG_API_KEY;
        if (!apiKey) {
          sendEvent({ error: 'API key not configured' });
          controller.close();
          return;
        }

        // Send initial status
        sendEvent({ status: 'starting', message: 'Initializing...' });

        // Create or use existing conversation
        let convId = conversationId;
        let isNewConversation = false;
        if (!convId) {
          const newConv = await createConversation('New Project');
          isNewConversation = true;
          convId = newConv.id;
        }

        // Get previous images for context
        const previousImages = await getConversationImages(convId);

        // Determine if this is an edit request
        let referenceImageData: string | undefined;
        const editKeywords = ['edit', 'modify', 'change', 'update', 'make it', 'add', 'remove', 'adjust', 'keep', 'same', 'but'];
        const isEditRequest = editKeywords.some(keyword =>
          prompt.toLowerCase().includes(keyword)
        );

        if (uploadedImage) {
          referenceImageData = uploadedImage;
        } else if (previousImages && previousImages.length > 0) {
          if (referenceImageId) {
            referenceImageData = previousImages.find(img => img.id === referenceImageId)?.image_url;
          } else if (isEditRequest) {
            referenceImageData = previousImages[0]?.image_url;
          }
        }

        // Save user message
        const userMessage = await addMessage(convId, 'user', prompt);

        // Send generating status
        sendEvent({ status: 'generating', message: 'Generating image...' });

        // Generate image
        console.log(`🎨 Generating image - Model: ${model}, Size: ${imageSize}, Aspect: ${aspectRatio}`);
        const client = createLaoZhangClient(apiKey);
        const result = await generateImage(client, {
          prompt: prompt,
          model: model as any,
          imageSize: imageSize as any,
          aspectRatio: aspectRatio as any,
          referenceImage: referenceImageData,
          styleReference: styleReference,
        });
        console.log(`✅ Image generated - URL length: ${result.url?.length || 0} chars`);

        // Save assistant message
        const assistantMessage = await addMessage(
          convId,
          'assistant',
          result.revisedPrompt || `Generated image for: ${prompt}`
        );

        // Send uploading status
        sendEvent({ status: 'uploading', message: 'Uploading to storage...' });

        // Upload to storage
        const imageId = uuidv4();
        let imageUrl = result.url;
        let blurhash = '';

        if (result.url.startsWith('data:image/')) {
          try {
            // Upload ORIGINAL full-quality image directly to storage
            console.log(`📤 Uploading original image to storage...`);
            imageUrl = await uploadImageToStorage(result.url, convId, imageId);
            console.log(`✅ Uploaded to storage: ${imageUrl.substring(0, 50)}...`);

            // Generate blurhash (small operation)
            try {
              blurhash = await generateBlurhashFromBase64(result.url);
              console.log(`🎨 Blurhash generated: ${blurhash.substring(0, 10)}...`);
            } catch {
              // Blurhash is optional
            }
          } catch (uploadError: any) {
            console.error('Storage upload failed:', uploadError);
            sendEvent({ error: `Upload failed: ${uploadError.message}` });
            controller.close();
            return;
          }
        }

        // Save to database
        const savedImage = await saveGeneratedImage(
          assistantMessage.id,
          convId,
          imageUrl,
          prompt,
          result.revisedPrompt,
          model,
          blurhash
        );

        // Send final success response (only URLs, no image data)
        sendEvent({
          success: true,
          conversationId: convId,
          message: assistantMessage,
          image: {
            ...savedImage,
            url: imageUrl,
            blurhash,
          },
        });

        // Generate AI title for new conversations (non-blocking)
        if (isNewConversation) {
          try {
            console.log('📝 Generating AI title for new conversation...');
            const title = summarizePromptToTitle(client, prompt);
            await updateConversationTitle(convId, title);
            console.log(`✅ Conversation title updated: "${title}"`);
          } catch (titleError) {
            console.error('Failed to generate title:', titleError);
            // Non-critical - conversation still works with default title
          }
        }

        controller.close();
      } catch (error: any) {
        console.error('Generation error:', error);
        sendEvent({ error: error.message || 'Failed to generate image' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
