export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  images?: GeneratedImage[];
  videos?: GeneratedVideo[];
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

// Video Generation Types
export type VideoModel = 'sora-2-pro' | 'kling-2.6' | 'veo-3.1' | 'wan-2.6' | 'seedance-1.5-pro';

export interface VideoModelInfo {
  id: VideoModel;
  name: string;
  description: string;
  maxDuration: number;
}

export interface GeneratedVideo {
  id: string;
  message_id: string;
  conversation_id: string;
  video_url: string;
  prompt: string;
  model: VideoModel;
  duration: string;
  aspect_ratio: string;
  camera_movement?: string;
  start_frame_url?: string;
  end_frame_url?: string;
  created_at: string;
}

export interface CinemaSettings {
  cameraBody: string;
  lensType: string;
  focalLength: number;
  aperture: string;
}

export type CameraMovement =
  | 'static' | 'handheld' | 'zoom-in' | 'zoom-out'
  | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down'
  | 'dolly-in' | 'dolly-out' | 'truck-left' | 'truck-right'
  | 'orbit-left' | 'orbit-right' | 'jib-up' | 'jib-down'
  | 'drone-shot' | '360-roll' | 'whip-pan' | 'rack-focus';
