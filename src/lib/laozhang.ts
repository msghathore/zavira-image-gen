// Lao Zhang API client for image generation
// Supports Nano Banana 2 with 4K resolution

export type ImageModel = 'nano-banana-2' | 'nano-banana-pro' | 'gpt-image-1';

export interface ImageGenerationOptions {
  prompt: string;
  model?: ImageModel;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  referenceImage?: string; // Base64 image data for editing (data:image/... format)
}

// Model configurations
const MODEL_CONFIG: Record<ImageModel, {
  apiModelId: string;
  useNativeFormat: boolean;
  supports4K: boolean;
}> = {
  'nano-banana-2': {
    apiModelId: 'gemini-3-pro-image-preview',  // Nano Banana 2 - supports 4K
    useNativeFormat: true,
    supports4K: true,
  },
  'nano-banana-pro': {
    apiModelId: 'gemini-2.5-flash-image-preview',  // Nano Banana 1 - up to 2K
    useNativeFormat: true,
    supports4K: false,
  },
  'gpt-image-1': {
    apiModelId: 'gpt-image-1',
    useNativeFormat: false,
    supports4K: false,
  },
};

export const AVAILABLE_MODELS: { id: ImageModel; name: string; description: string }[] = [
  { id: 'nano-banana-2', name: 'Nano Banana 2', description: 'Google Gemini 3 Pro - 4K Support' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: 'Google Gemini 2.5 - Fast' },
  { id: 'gpt-image-1', name: 'GPT Image', description: 'OpenAI - High quality' },
];

export interface LaoZhangClient {
  apiKey: string;
}

// Create client with API key
export function createLaoZhangClient(apiKey: string): LaoZhangClient {
  return { apiKey };
}

// Generate image using Lao Zhang API
// Helper to extract base64 data and mime type from data URL
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
}

export async function generateImage(
  client: LaoZhangClient,
  options: ImageGenerationOptions
): Promise<{ url: string; revisedPrompt?: string }> {
  const {
    prompt,
    model = 'nano-banana-2',
    imageSize = '4K',
    aspectRatio = '1:1',
    referenceImage,
  } = options;

  const config = MODEL_CONFIG[model] || MODEL_CONFIG['nano-banana-2'];

  try {
    let response: Response;
    let imageUrl: string | null = null;

    if (config.useNativeFormat) {
      // Use Google native format for Nano Banana models (supports 4K)
      const actualSize = config.supports4K ? imageSize : (imageSize === '4K' ? '2K' : imageSize);

      // Build parts array - include reference image if provided for editing
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // Add reference image first if provided (for image editing)
      if (referenceImage) {
        const imageData = parseDataUrl(referenceImage);
        if (imageData) {
          parts.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            }
          });
        }
      }

      // Add text prompt
      parts.push({ text: prompt });

      response = await fetch(`https://api.laozhang.ai/v1beta/models/${config.apiModelId}:generateContent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: {
              aspectRatio: aspectRatio,
              imageSize: actualSize,  // Must be uppercase: 1K, 2K, 4K
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Extract image from Google native format response
      const candidates = data.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            // Base64 image data
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      }
    } else {
      // Use OpenAI-compatible format for GPT models
      response = await fetch('https://api.laozhang.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.apiModelId,
          stream: false,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Extract image URL from OpenAI-style response
      const patterns = [
        /!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+)\)/i,
        /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i,
        /(data:image\/[^;]+;base64,[^\s<>"]+)/i,
        /https?:\/\/[^\s<>"]+\.(png|jpg|jpeg|webp|gif)[^\s<>"]*/i,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          imageUrl = match[1] || match[0];
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('No image found in response');
    }

    return {
      url: imageUrl,
      revisedPrompt: prompt,
    };
  } catch (error: any) {
    console.error('Image generation error:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
}

// Build context-aware prompt for image editing
export function buildEditPrompt(
  userRequest: string,
  previousImages: Array<{ prompt: string; url: string }>,
  referenceImageUrl?: string
): string {
  let contextPrompt = userRequest;

  if (referenceImageUrl) {
    const referencedImage = previousImages.find(img => img.url === referenceImageUrl);
    if (referencedImage) {
      contextPrompt = `Based on the previous image with prompt "${referencedImage.prompt}", ${userRequest}`;
    }
  }

  const editKeywords = ['edit', 'modify', 'change', 'update', 'make it', 'add', 'remove', 'adjust'];
  const isEditRequest = editKeywords.some(keyword =>
    userRequest.toLowerCase().includes(keyword)
  );

  if (isEditRequest && previousImages.length > 0 && !referenceImageUrl) {
    const lastImage = previousImages[0];
    contextPrompt = `Based on the previous image with prompt "${lastImage.prompt}", ${userRequest}`;
  }

  return contextPrompt;
}
