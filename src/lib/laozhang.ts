// Lao Zhang API client for image generation
// Uses direct fetch to match official API format

export type ImageModel = 'nano-banana-pro' | 'gpt-image-1';

export interface ImageGenerationOptions {
  prompt: string;
  model?: ImageModel;
  size?: '1024x1024' | '1792x1024' | '1024x1792' | '512x512';
}

export const AVAILABLE_MODELS: { id: ImageModel; name: string; description: string }[] = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: 'Google Gemini - Fast & affordable' },
  { id: 'gpt-image-1', name: 'GPT Image', description: 'OpenAI - High quality' },
];

export interface LaoZhangClient {
  apiKey: string;
}

// Create client with API key
export function createLaoZhangClient(apiKey: string): LaoZhangClient {
  return { apiKey };
}

// Generate image using Nano Banana Pro via chat completions API
export async function generateImage(
  client: LaoZhangClient,
  options: ImageGenerationOptions
): Promise<{ url: string; revisedPrompt?: string }> {
  const {
    prompt,
    model = 'nano-banana-pro',
  } = options;

  try {
    // Use fetch directly to match official API format
    const response = await fetch('https://api.laozhang.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
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

    // Extract image URL from response
    // The API returns images in markdown format: ![image](data:image/png;base64,...)
    // Or sometimes with http URLs
    const patterns = [
      /!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+)\)/i,  // Base64 data URL in markdown
      /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/i,  // HTTP URL in markdown
      /(data:image\/[^;]+;base64,[^\s<>"]+)/i,  // Raw base64 data URL
      /https?:\/\/[^\s<>"]+\.(png|jpg|jpeg|webp|gif)[^\s<>"]*/i,  // Direct image URL
    ];

    let imageUrl: string | null = null;
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        imageUrl = match[1] || match[0];
        break;
      }
    }

    if (!imageUrl) {
      console.error('Response content (truncated):', content.substring(0, 500));
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
