// Lao Zhang API client for image and video generation
// Supports Nano Banana 2 with 4K resolution and various video models

export type ImageModel = 'nano-banana-pro' | 'gpt-image-1.5';

// Video model types
export type VideoModel = 'sora-2-pro' | 'kling-2.6' | 'veo-3.1' | 'wan-2.6' | 'seedance-1.5-pro';

export type VideoDuration = '5s' | '10s' | '15s' | '20s';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';

export type CameraMovement =
  | 'static'
  | 'handheld'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'dolly_in'
  | 'dolly_out'
  | 'truck_left'
  | 'truck_right'
  | 'orbit_left'
  | 'orbit_right'
  | 'jib_up'
  | 'jib_down'
  | 'drone_shot'
  | '360_roll'
  | 'whip_pan'
  | 'rack_focus';

export interface ImageGenerationOptions {
  prompt: string;
  model?: ImageModel;
  imageSize?: '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  referenceImage?: string;
  styleReference?: string;
}

export interface VideoGenerationOptions {
  prompt: string;
  model?: VideoModel;
  duration?: VideoDuration;
  aspectRatio?: VideoAspectRatio;
  startFrame?: string;
  endFrame?: string;
  cameraMovement?: CameraMovement;
  withAudio?: boolean;
}

// Model configurations
const MODEL_CONFIG: Record<ImageModel, {
  apiModelId: string;
  useNativeFormat: boolean;
  useImagesApi: boolean;
  supports4K: boolean;
}> = {
  'nano-banana-pro': {
    apiModelId: 'gemini-3-pro-image-preview-4k',
    useNativeFormat: true,
    useImagesApi: false,
    supports4K: true,
  },
  'gpt-image-1.5': {
    apiModelId: 'gpt-image-1.5',
    useNativeFormat: false,
    useImagesApi: true,
    supports4K: true,
  },
};

export const AVAILABLE_MODELS: { id: ImageModel; name: string; description: string }[] = [
  { id: 'nano-banana-pro', name: 'Banana Pro', description: 'High Quality 4K' },
  { id: 'gpt-image-1.5', name: 'GPT Image 1.5', description: 'OpenAI 4K' },
];

// Video model configurations
const VIDEO_MODEL_CONFIG: Record<VideoModel, {
  apiModelId: string;
  maxDuration: VideoDuration;
  supportsAudio: boolean;
  supportsFrames: boolean;
}> = {
  'sora-2-pro': {
    apiModelId: 'sora-2-pro',
    maxDuration: '20s',
    supportsAudio: true,
    supportsFrames: true,
  },
  'kling-2.6': {
    apiModelId: 'kling-2.6',
    maxDuration: '15s',
    supportsAudio: true,
    supportsFrames: true,
  },
  'veo-3.1': {
    apiModelId: 'veo-3.1',
    maxDuration: '20s',
    supportsAudio: true,
    supportsFrames: true,
  },
  'wan-2.6': {
    apiModelId: 'wan-2.6',
    maxDuration: '15s',
    supportsAudio: false,
    supportsFrames: true,
  },
  'seedance-1.5-pro': {
    apiModelId: 'seedance-1.5-pro',
    maxDuration: '10s',
    supportsAudio: true,
    supportsFrames: false,
  },
};

export const AVAILABLE_VIDEO_MODELS: { id: VideoModel; name: string; description: string }[] = [
  { id: 'sora-2-pro', name: 'Sora 2 Pro', description: 'OpenAI - Premium quality, up to 20s' },
  { id: 'kling-2.6', name: 'Kling 2.6', description: 'Kuaishou - Fast generation, up to 15s' },
  { id: 'veo-3.1', name: 'Veo 3.1', description: 'Google - High quality, up to 20s' },
  { id: 'wan-2.6', name: 'Wan 2.6', description: 'Alibaba - Efficient, up to 15s' },
  { id: 'seedance-1.5-pro', name: 'Seedance 1.5 Pro', description: 'ByteDance - Dance/motion focused, up to 10s' },
];

export const CAMERA_MOVEMENTS: { id: CameraMovement; name: string; description: string }[] = [
  { id: 'static', name: 'Static', description: 'Camera remains fixed in place' },
  { id: 'handheld', name: 'Handheld', description: 'Natural handheld camera shake' },
  { id: 'zoom_in', name: 'Zoom In', description: 'Camera zooms closer to subject' },
  { id: 'zoom_out', name: 'Zoom Out', description: 'Camera zooms away from subject' },
  { id: 'pan_left', name: 'Pan Left', description: 'Camera rotates horizontally left' },
  { id: 'pan_right', name: 'Pan Right', description: 'Camera rotates horizontally right' },
  { id: 'tilt_up', name: 'Tilt Up', description: 'Camera rotates vertically upward' },
  { id: 'tilt_down', name: 'Tilt Down', description: 'Camera rotates vertically downward' },
  { id: 'dolly_in', name: 'Dolly In', description: 'Camera moves forward toward subject' },
  { id: 'dolly_out', name: 'Dolly Out', description: 'Camera moves backward from subject' },
  { id: 'truck_left', name: 'Truck Left', description: 'Camera moves horizontally left' },
  { id: 'truck_right', name: 'Truck Right', description: 'Camera moves horizontally right' },
  { id: 'orbit_left', name: 'Orbit Left', description: 'Camera orbits around subject leftward' },
  { id: 'orbit_right', name: 'Orbit Right', description: 'Camera orbits around subject rightward' },
  { id: 'jib_up', name: 'Jib Up', description: 'Camera moves vertically upward' },
  { id: 'jib_down', name: 'Jib Down', description: 'Camera moves vertically downward' },
  { id: 'drone_shot', name: 'Drone Shot', description: 'Aerial perspective movement' },
  { id: '360_roll', name: '360 Roll', description: 'Full rotation around the lens axis' },
  { id: 'whip_pan', name: 'Whip Pan', description: 'Fast horizontal camera rotation' },
  { id: 'rack_focus', name: 'Rack Focus', description: 'Focus shift between subjects' },
];

export interface LaoZhangClient {
  apiKey: string;
}

export function createLaoZhangClient(apiKey: string): LaoZhangClient {
  return { apiKey };
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return null;
}

// Helper to convert aspect ratio to OpenAI Images API size
function getOpenAISizeFromAspectRatio(aspectRatio: string): string {
  switch (aspectRatio) {
    case '9:16':
    case '3:4':
      return '1024x1792';
    case '16:9':
    case '4:3':
      return '1792x1024';
    case '1:1':
    default:
      return '1024x1024';
  }
}

export async function generateImage(
  client: LaoZhangClient,
  options: ImageGenerationOptions
): Promise<{ url: string; revisedPrompt?: string }> {
  const {
    prompt,
    model = 'nano-banana-pro',
    imageSize = '4K',
    aspectRatio = '1:1',
    referenceImage,
    styleReference,
  } = options;

  const config = MODEL_CONFIG[model] || MODEL_CONFIG['nano-banana-pro'];

  try {
    let response: Response;
    let imageUrl: string | null = null;

    if (config.useNativeFormat) {
      const actualSize = config.supports4K ? imageSize : (imageSize === '4K' ? '2K' : imageSize);
      const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
      parts.push({ text: prompt });

      if (referenceImage) {
        const imageData = parseDataUrl(referenceImage);
        if (imageData) {
          parts.push({
            inline_data: {
              mime_type: imageData.mimeType,
              data: imageData.data,
            }
          });
        }
      }

      if (styleReference) {
        const styleData = parseDataUrl(styleReference);
        if (styleData) {
          parts.push({
            inline_data: {
              mime_type: styleData.mimeType,
              data: styleData.data,
            }
          });
        }
      }

      const requestBody = {
        contents: [{ parts: parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: actualSize,
          },
        },
      };

      console.log('🚀 Gemini API Request:', { model: config.apiModelId, imageSize: actualSize, aspectRatio });

      response = await fetch(`https://api.laozhang.ai/v1beta/models/${config.apiModelId}:generateContent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const candidates = data.candidates || [];

      if (data.error) {
        throw new Error(`API returned error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (candidates.length === 0) {
        const blockReason = data.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(`Request blocked: ${blockReason}`);
        }
        throw new Error('No candidates in response');
      }

      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          const inlineData = part.inlineData || part.inline_data;
          if (inlineData?.data) {
            const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
            imageUrl = `data:${mimeType};base64,${inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      }
    } else if (config.useImagesApi) {
      // Use OpenAI Images API for GPT-image-1
      const size = getOpenAISizeFromAspectRatio(aspectRatio);
      const quality = 'hd'; // Always use HD quality

      const requestBody = {
        model: config.apiModelId,
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        response_format: 'b64_json',
      };

      console.log('🚀 GPT Image API Request:', { model: config.apiModelId, size, quality, aspectRatio });

      response = await fetch('https://api.laozhang.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GPT Image API Error:', response.status, errorText);
        throw new Error(`GPT Image API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      } else if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url;
      }

      const revisedPrompt = data.data?.[0]?.revised_prompt;
      if (imageUrl) {
        return { url: imageUrl, revisedPrompt: revisedPrompt || prompt };
      }
    } else {
      // Fallback: chat completions
      response = await fetch('https://api.laozhang.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.apiModelId,
          stream: false,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
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

    return { url: imageUrl, revisedPrompt: prompt };
  } catch (error: any) {
    console.error('Image generation error:', error);
    throw new Error(error.message || 'Failed to generate image');
  }
}

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
  const isEditRequest = editKeywords.some(keyword => userRequest.toLowerCase().includes(keyword));

  if (isEditRequest && previousImages.length > 0 && !referenceImageUrl) {
    const lastImage = previousImages[0];
    contextPrompt = `Based on the previous image with prompt "${lastImage.prompt}", ${userRequest}`;
  }

  return contextPrompt;
}

export async function generateVideo(
  client: LaoZhangClient,
  options: VideoGenerationOptions
): Promise<{ url: string; taskId?: string; status: 'completed' | 'processing' | 'failed'; revisedPrompt?: string }> {
  const {
    prompt,
    model = 'sora-2-pro',
    duration = '5s',
    aspectRatio = '16:9',
    startFrame,
    endFrame,
    cameraMovement,
    withAudio = false,
  } = options;

  const config = VIDEO_MODEL_CONFIG[model] || VIDEO_MODEL_CONFIG['sora-2-pro'];
  const durationSeconds = parseInt(duration.replace('s', ''), 10);

  try {
    const requestBody: Record<string, unknown> = {
      model: config.apiModelId,
      prompt: prompt,
      duration: durationSeconds,
      aspect_ratio: aspectRatio,
    };

    if (cameraMovement && cameraMovement !== 'static') {
      const cameraDesc = CAMERA_MOVEMENTS.find(c => c.id === cameraMovement)?.name || cameraMovement;
      requestBody.prompt = `${prompt}. Camera movement: ${cameraDesc}`;
    }

    if (withAudio && config.supportsAudio) {
      requestBody.with_audio = true;
    }

    if (startFrame && config.supportsFrames) {
      const frameData = parseDataUrl(startFrame);
      if (frameData) {
        requestBody.start_frame = { type: 'image', data: frameData.data, mime_type: frameData.mimeType };
      }
    }

    if (endFrame && config.supportsFrames) {
      const frameData = parseDataUrl(endFrame);
      if (frameData) {
        requestBody.end_frame = { type: 'image', data: frameData.data, mime_type: frameData.mimeType };
      }
    }

    console.log('🎬 Video API Request:', { model: config.apiModelId, duration: durationSeconds, aspectRatio });

    const response = await fetch('https://api.laozhang.ai/v1/video/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Video API Error:', response.status, errorText);
      throw new Error(`Video API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.data?.[0]?.url) {
      return { url: data.data[0].url, status: 'completed', revisedPrompt: data.data[0].revised_prompt || prompt };
    } else if (data.data?.[0]?.b64_json) {
      const videoUrl = `data:video/mp4;base64,${data.data[0].b64_json}`;
      return { url: videoUrl, status: 'completed', revisedPrompt: data.data[0].revised_prompt || prompt };
    } else if (data.task_id || data.id) {
      return { url: '', taskId: data.task_id || data.id, status: 'processing', revisedPrompt: prompt };
    } else if (data.url) {
      return { url: data.url, status: 'completed', revisedPrompt: prompt };
    }

    throw new Error('No video URL or task ID found in response');
  } catch (error: unknown) {
    console.error('Video generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
    throw new Error(errorMessage);
  }
}

export async function checkVideoStatus(
  client: LaoZhangClient,
  taskId: string
): Promise<{ url: string; status: 'completed' | 'processing' | 'failed'; error?: string }> {
  try {
    const response = await fetch(`https://api.laozhang.ai/v1/video/generations/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${client.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video status API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.status === 'completed' || data.status === 'succeeded') {
      const videoUrl = data.data?.[0]?.url || data.url || data.output?.url;
      if (videoUrl) {
        return { url: videoUrl, status: 'completed' };
      }
    } else if (data.status === 'failed' || data.status === 'error') {
      return { url: '', status: 'failed', error: data.error || data.message || 'Video generation failed' };
    }

    return { url: '', status: 'processing' };
  } catch (error: unknown) {
    console.error('Video status check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check video status';
    throw new Error(errorMessage);
  }
}
