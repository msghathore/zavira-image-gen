export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  images?: GeneratedImage[];
  uploadedImage?: string; // Base64 image uploaded by user
}

export interface GeneratedImage {
  id: string;
  message_id: string;
  conversation_id: string;
  image_url: string;
  prompt: string;
  revised_prompt?: string;
  model: string;
  width: number;
  height: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  latestImage?: GeneratedImage;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
  attachedImageId?: string; // For editing existing images
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  conversationId?: string;
  referenceImageUrl?: string; // For image editing context
  uploadedImage?: string; // Base64 data URL for user-uploaded reference image
}

export interface LaoZhangImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}
