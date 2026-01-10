import OpenAI from 'openai';

// Create OpenAI client configured for Lao Zhang API
export function createLaoZhangClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.laozhang.ai/v1',
  });
}

export interface ImageGenerationOptions {
  prompt: string;
  model?: 'nano-banana-pro' | 'nano-banana' | 'gpt-image-1' | 'dall-e-3' | 'flux-pro';
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512';
  quality?: 'standard' | 'hd';
  n?: number;
}

export async function generateImage(
  client: OpenAI,
  options: ImageGenerationOptions
): Promise<{ url: string; revisedPrompt?: string }> {
  const {
    prompt,
    model = 'nano-banana-pro',
    size = '1024x1024',
    quality = 'standard',
    n = 1,
  } = options;

  try {
    const response = await client.images.generate({
      model,
      prompt,
      n,
      size,
      quality,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned');
    }

    const imageData = response.data[0];

    if (!imageData.url && !imageData.b64_json) {
      throw new Error('No image URL or base64 data returned');
    }

    return {
      url: imageData.url || `data:image/png;base64,${imageData.b64_json}`,
      revisedPrompt: imageData.revised_prompt,
    };
  } catch (error: any) {
    console.error('Image generation error:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
}

// Chat-based image generation (for models that support it)
export async function generateImageViaChat(
  client: OpenAI,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  model: string = 'gpt-4o-image'
): Promise<{ content: string; imageUrl?: string }> {
  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || '';

    // Extract image URL if present in response
    const imageUrlMatch = content.match(/https?:\/\/[^\s]+\.(png|jpg|jpeg|webp|gif)/i);

    return {
      content,
      imageUrl: imageUrlMatch?.[0],
    };
  } catch (error: any) {
    console.error('Chat completion error:', error);
    throw new Error(error.message || 'Failed to generate response');
  }
}

// Build context-aware prompt for image editing
export function buildEditPrompt(
  userRequest: string,
  previousImages: Array<{ prompt: string; url: string }>,
  referenceImageUrl?: string
): string {
  let contextPrompt = userRequest;

  // If user is referencing a previous image
  if (referenceImageUrl) {
    const referencedImage = previousImages.find(img => img.url === referenceImageUrl);
    if (referencedImage) {
      contextPrompt = `Based on the previous image with prompt "${referencedImage.prompt}", ${userRequest}`;
    }
  }

  // If user says "edit", "modify", "change" without specifying which image
  const editKeywords = ['edit', 'modify', 'change', 'update', 'make it', 'add', 'remove', 'adjust'];
  const isEditRequest = editKeywords.some(keyword =>
    userRequest.toLowerCase().includes(keyword)
  );

  if (isEditRequest && previousImages.length > 0 && !referenceImageUrl) {
    const lastImage = previousImages[0]; // Most recent
    contextPrompt = `Based on the previous image with prompt "${lastImage.prompt}", ${userRequest}`;
  }

  return contextPrompt;
}
