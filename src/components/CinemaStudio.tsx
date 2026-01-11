'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

// ==================== TYPES ====================

export type VideoModel = 'sora-2-pro' | 'kling-2.6' | 'veo-3.1' | 'wan-2.6' | 'seedance-1.5-pro';
export type ImageModel = 'nano-banana-2' | 'nano-banana-pro' | 'gpt-image-1' | 'flux-kontext-pro' | 'flux-1.1-ultra' | 'ideogram-v3' | 'recraft-v3';
export type VideoDuration = '5s' | '10s' | '15s' | '20s';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
export type ContentMode = 'image' | 'video';
export type Resolution = '720p' | '1080p' | '2K' | '4K';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
}

export type CameraMovement =
  | 'static'
  | 'handheld'
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'dolly-in'
  | 'dolly-out'
  | 'orbit-left'
  | 'orbit-right'
  | 'jib-up'
  | 'jib-down'
  | 'drone-shot'
  | '360-roll';

export interface VideoModelInfo {
  id: VideoModel;
  name: string;
  description: string;
  maxDuration: number;
}

export interface ImageModelInfo {
  id: ImageModel;
  name: string;
  description: string;
}

export interface CinemaSettings {
  cameraBody: string;
  lensType: string;
  focalLength: number;
  aperture: string;
}

export interface FrameData {
  base64: string;
  fileName: string;
}

export interface GeneratedContent {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  created_at: string;
}

export interface CinemaStudioProps {
  onImageGenerate?: (prompt: string, model: ImageModel, aspectRatio: AspectRatio, uploadedImage?: string, styleReference?: string) => Promise<void>;
  onVideoGenerate?: (state: VideoGenerateParams) => Promise<void>;
  isLoading?: boolean;
  generatedContent?: GeneratedContent[];
  // Conversation/Project history
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onNewProject?: () => void;
  onDeleteConversation?: (id: string) => void;
}

export interface VideoGenerateParams {
  prompt: string;
  model: VideoModel;
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  cameraMovement: CameraMovement;
  audioEnabled: boolean;
  startFrame?: FrameData;
  endFrame?: FrameData;
  cinemaSettings: CinemaSettings;
  resolution: Resolution;
}

// ==================== CONSTANTS ====================

const VIDEO_MODELS: VideoModelInfo[] = [
  { id: 'sora-2-pro', name: 'Sora 2 Pro', description: 'OpenAI Sora', maxDuration: 20 },
  { id: 'kling-2.6', name: 'Kling 2.6', description: 'Kuaishou', maxDuration: 15 },
  { id: 'veo-3.1', name: 'Veo 3.1', description: 'Google', maxDuration: 20 },
  { id: 'wan-2.6', name: 'Wan 2.6', description: 'Alibaba', maxDuration: 15 },
  { id: 'seedance-1.5-pro', name: 'Seedance 1.5', description: 'ByteDance', maxDuration: 10 },
];

const IMAGE_MODELS: ImageModelInfo[] = [
  { id: 'nano-banana-2', name: 'Banana 2', description: 'Fast Generation' },
  { id: 'nano-banana-pro', name: 'Banana Pro', description: 'High Quality' },
  { id: 'gpt-image-1', name: 'GPT Image', description: 'OpenAI DALL-E' },
  { id: 'flux-kontext-pro', name: 'Flux Kontext', description: 'Context Aware' },
  { id: 'flux-1.1-ultra', name: 'Flux Ultra', description: 'Ultra Quality' },
  { id: 'ideogram-v3', name: 'Ideogram v3', description: 'Text in Images' },
  { id: 'recraft-v3', name: 'Recraft v3', description: 'Design Focused' },
];

const CAMERA_MOVEMENTS: { id: CameraMovement; label: string; video: string }[] = [
  { id: 'static', label: 'Static', video: '/camera-movements/static.mp4' },
  { id: 'handheld', label: 'Handheld', video: '/camera-movements/handheld.mp4' },
  { id: 'zoom-out', label: 'Zoom Out', video: '/camera-movements/zoom-out.mp4' },
  { id: 'zoom-in', label: 'Zoom In', video: '/camera-movements/zoom-in.mp4' },
  { id: 'orbit-left', label: 'Camera Follows', video: '/camera-movements/camera-follows.mp4' },
  { id: 'pan-left', label: 'Pan Left', video: '/camera-movements/pan-left.mp4' },
  { id: 'pan-right', label: 'Pan Right', video: '/camera-movements/pan-right.mp4' },
  { id: 'tilt-up', label: 'Tilt Up', video: '/camera-movements/tilt-up.mp4' },
  { id: 'tilt-down', label: 'Tilt Down', video: '/camera-movements/tilt-down.mp4' },
  { id: 'orbit-right', label: 'Orbit Around', video: '/camera-movements/orbit-around.mp4' },
  { id: 'dolly-in', label: 'Dolly In', video: '/camera-movements/dolly-in.mp4' },
  { id: 'dolly-out', label: 'Dolly Out', video: '/camera-movements/dolly-out.mp4' },
  { id: 'jib-up', label: 'Jib Up', video: '/camera-movements/jib-up.mp4' },
  { id: 'jib-down', label: 'Jib Down', video: '/camera-movements/jib-down.mp4' },
  { id: 'drone-shot', label: 'Drone', video: '/camera-movements/drone-shot.mp4' },
  { id: '360-roll', label: '360 Roll', video: '/camera-movements/360-roll.mp4' },
];

const CAMERA_BODIES = [
  'ARRI Alexa 35',
  'RED Komodo',
  'ARRI Alexa Mini LF',
  'Sony Venice 2',
  'Blackmagic URSA',
  'Canon C70',
];

const LENS_TYPES = ['Spherical', 'Anamorphic', 'Vintage', 'Macro', 'Fisheye'];
const APERTURES = ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11'];
const DURATIONS: VideoDuration[] = ['5s', '10s', '15s', '20s'];
const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '21:9'];
const RESOLUTIONS: Resolution[] = ['720p', '1080p', '2K', '4K'];

// ==================== COMPONENT ====================

export default function CinemaStudio({
  onImageGenerate,
  onVideoGenerate,
  isLoading = false,
  generatedContent = [],
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onNewProject,
  onDeleteConversation,
}: CinemaStudioProps) {
  // Core State
  const [mode, setMode] = useState<ContentMode>('video');
  const [prompt, setPrompt] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Video Settings
  const [videoModel, setVideoModel] = useState<VideoModel>('sora-2-pro');
  const [duration, setDuration] = useState<VideoDuration>('5s');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>('static');
  const [startFrame, setStartFrame] = useState<FrameData | null>(null);
  const [endFrame, setEndFrame] = useState<FrameData | null>(null);

  // Image Settings
  const [imageModel, setImageModel] = useState<ImageModel>('nano-banana-2');
  const [imageCount, setImageCount] = useState(1);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [styleReference, setStyleReference] = useState<string | null>(null);

  // Cinema Settings
  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings>({
    cameraBody: 'ARRI Alexa 35',
    lensType: 'Spherical',
    focalLength: 35,
    aperture: 'f/2.8',
  });

  // UI State
  const [showMovements, setShowMovements] = useState(false);
  const [showCinemaSettings, setShowCinemaSettings] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showFrameUpload, setShowFrameUpload] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Refs
  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const styleUploadRef = useRef<HTMLInputElement>(null);
  const movementsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (movementsRef.current && !movementsRef.current.contains(e.target as Node)) {
        setShowMovements(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleFrameUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setFrame: (frame: FrameData | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFrame({ base64, fileName: file.name });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isStyle: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isStyle) {
        setStyleReference(base64);
      } else {
        setUploadedImage(base64);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    if (mode === 'video' && onVideoGenerate) {
      await onVideoGenerate({
        prompt,
        model: videoModel,
        duration,
        aspectRatio,
        cameraMovement,
        audioEnabled,
        startFrame: startFrame || undefined,
        endFrame: endFrame || undefined,
        cinemaSettings,
        resolution,
      });
    } else if (mode === 'image' && onImageGenerate) {
      await onImageGenerate(prompt, imageModel, aspectRatio, uploadedImage || undefined, styleReference || undefined);
    }
  }, [mode, prompt, videoModel, imageModel, duration, aspectRatio, cameraMovement, audioEnabled, startFrame, endFrame, cinemaSettings, resolution, uploadedImage, styleReference, onVideoGenerate, onImageGenerate]);

  const selectedVideoModel = VIDEO_MODELS.find(m => m.id === videoModel);
  const selectedImageModel = IMAGE_MODELS.find(m => m.id === imageModel);
  const selectedMovement = CAMERA_MOVEMENTS.find(m => m.id === cameraMovement);

  // Get latest generated content for preview
  const latestContent = generatedContent[0];

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={startFrameInputRef} type="file" accept="image/*" onChange={(e) => handleFrameUpload(e, setStartFrame)} className="hidden" />
      <input ref={endFrameInputRef} type="file" accept="image/*" onChange={(e) => handleFrameUpload(e, setEndFrame)} className="hidden" />
      <input ref={imageUploadRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
      <input ref={styleUploadRef} type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Project History Sidebar (Like Higgsfield) */}
        <div className={`bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 ${
          sidebarVisible ? 'w-64' : 'w-0'
        } overflow-hidden`}>
          {/* Hide/Show Toggle */}
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors border-b border-zinc-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Hide
          </button>

          {/* New Project Button */}
          <button
            onClick={onNewProject}
            className="flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-zinc-800/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New project
          </button>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  console.log('Selecting conversation:', conv.id);
                  onSelectConversation?.(conv.id);
                }}
                className={`group relative w-full text-left px-4 py-3 transition-colors ${
                  activeConversationId === conv.id
                    ? 'bg-zinc-800 border-l-2 border-lime-500'
                    : 'hover:bg-zinc-800/50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded bg-zinc-700 flex-shrink-0 overflow-hidden">
                    {conv.thumbnail ? (
                      <img src={conv.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Title */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-sm text-white truncate">{conv.title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {/* Delete button on hover */}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteConversation?.(conv.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded bg-zinc-700 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </span>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                No projects yet
              </div>
            )}
          </div>
        </div>

        {/* Minimal Icon Sidebar */}
        <div className="w-14 bg-zinc-900/50 border-r border-zinc-800 flex flex-col items-center py-4 gap-3">
          {/* Show/Hide Sidebar Toggle */}
          {!sidebarVisible && (
            <button
              onClick={() => setSidebarVisible(true)}
              className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              title="Show Projects"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Gallery */}
          <button
            onClick={() => setShowGallery(!showGallery)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              showGallery ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
            title="Gallery"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Frames (Video only) */}
          {mode === 'video' && (
            <button
              onClick={() => setShowFrameUpload(!showFrameUpload)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                showFrameUpload ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
              title="Keyframes"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </button>
          )}

          <div className="flex-1" />

          {/* Settings */}
          <button
            className="w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Center Preview Area */}
        <div className="flex-1 flex flex-col">
          {/* Preview Canvas */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            {latestContent ? (
              <div className="relative max-w-4xl max-h-full">
                {latestContent.type === 'video' ? (
                  <video
                    src={latestContent.url}
                    className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                    controls
                    autoPlay
                    loop
                  />
                ) : (
                  <Image
                    src={latestContent.url}
                    alt={latestContent.prompt}
                    width={1024}
                    height={1024}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl cursor-pointer"
                    onClick={() => setExpandedImage(latestContent.url)}
                  />
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center">
                  {mode === 'video' ? (
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  {mode === 'video' ? 'Create Cinematic Videos' : 'Generate Stunning Images'}
                </h2>
                <p className="text-zinc-500 max-w-md">
                  Enter a prompt below and click Generate to create {mode === 'video' ? 'a video' : 'an image'}.
                </p>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium">Generating...</p>
                  <p className="text-sm text-zinc-400">This may take a moment</p>
                </div>
              </div>
            )}
          </div>

          {/* Frame Upload Panel (Video only) */}
          {mode === 'video' && showFrameUpload && (
            <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
              <div className="flex gap-4 justify-center">
                {/* Start Frame */}
                <div
                  onClick={() => startFrameInputRef.current?.click()}
                  className={`relative w-40 aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                    startFrame ? 'border-lime-500' : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {startFrame ? (
                    <>
                      <img src={startFrame.base64} alt="Start" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setStartFrame(null); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 py-1 text-center">
                        <span className="text-xs text-lime-400 font-medium">START FRAME</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-zinc-500">START FRAME</span>
                    </div>
                  )}
                </div>

                {/* End Frame */}
                <div
                  onClick={() => endFrameInputRef.current?.click()}
                  className={`relative w-40 aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                    endFrame ? 'border-lime-500' : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {endFrame ? (
                    <>
                      <img src={endFrame.base64} alt="End" className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setEndFrame(null); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 py-1 text-center">
                        <span className="text-xs text-lime-400 font-medium">END FRAME</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-zinc-500">END FRAME</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Gallery Panel */}
        {showGallery && (
          <div className="w-72 bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
            <div className="p-3 border-b border-zinc-800">
              <h3 className="font-medium text-sm">Gallery</h3>
            </div>
            <div className="p-2 grid grid-cols-2 gap-2">
              {generatedContent.map((content) => (
                <div
                  key={content.id}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all"
                  onClick={() => setExpandedImage(content.url)}
                >
                  {content.type === 'video' ? (
                    <video src={content.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <Image src={content.url} alt={content.prompt} fill className="object-cover" />
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[10px] text-white truncate">{content.prompt}</p>
                  </div>
                </div>
              ))}
              {generatedContent.length === 0 && (
                <div className="col-span-2 py-8 text-center text-zinc-500 text-sm">
                  No content yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="inline-flex bg-zinc-800 rounded-full p-0.5">
            <button
              onClick={() => setMode('image')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'image' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image
            </button>
            <button
              onClick={() => setMode('video')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'video' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Video
            </button>
          </div>

          {/* Prompt Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
              placeholder={mode === 'video' ? "Describe your video scene..." : "Describe what you want to create..."}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent placeholder:text-zinc-500"
            />
          </div>

          {/* Video Controls */}
          {mode === 'video' && (
            <>
              {/* Movements Dropdown */}
              <div className="relative" ref={movementsRef}>
                <button
                  onClick={() => setShowMovements(!showMovements)}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Movements
                  <svg className={`w-3 h-3 transition-transform ${showMovements ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Movements Popup */}
                {showMovements && (
                  <div className="absolute bottom-full left-0 mb-2 w-[500px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4 z-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Camera Movement</h4>
                      <span className="text-xs text-lime-500">{selectedMovement?.label}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {CAMERA_MOVEMENTS.map((movement, index) => (
                        <button
                          key={`${movement.id}-${index}`}
                          onClick={() => {
                            setCameraMovement(movement.id);
                            setShowMovements(false);
                          }}
                          className={`relative aspect-[4/5] rounded-lg overflow-hidden transition-all ${
                            cameraMovement === movement.id
                              ? 'ring-2 ring-lime-500 ring-offset-2 ring-offset-zinc-900'
                              : 'hover:ring-1 hover:ring-zinc-600'
                          }`}
                        >
                          <video
                            src={movement.video}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            autoPlay
                            onLoadedData={(e) => {
                              setTimeout(() => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0.5;
                              }, 100);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.currentTime = 0;
                              e.currentTarget.play();
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0.5;
                            }}
                          />
                          <div className={`absolute inset-0 transition-colors ${
                            cameraMovement === movement.id ? 'bg-lime-500/20' : 'bg-black/20 hover:bg-black/10'
                          }`} />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <p className={`text-[9px] font-medium text-center truncate ${
                              cameraMovement === movement.id ? 'text-lime-400' : 'text-white'
                            }`}>
                              {movement.label}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Aspect Ratio */}
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                {ASPECT_RATIOS.map(ar => (
                  <option key={ar} value={ar}>{ar}</option>
                ))}
              </select>

              {/* Duration */}
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as VideoDuration)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                {DURATIONS.map(d => (
                  <option key={d} value={d} disabled={selectedVideoModel && parseInt(d) > selectedVideoModel.maxDuration}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Audio Toggle */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  audioEnabled ? 'bg-lime-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
                title={audioEnabled ? 'Audio On' : 'Audio Off'}
              >
                {audioEnabled ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>

              {/* Resolution */}
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as Resolution)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                {RESOLUTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Camera Info / Cinema Settings */}
              <button
                onClick={() => setShowCinemaSettings(!showCinemaSettings)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  showCinemaSettings ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {cinemaSettings.cameraBody}
              </button>

              {/* Model Selector */}
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  showModelSelector ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {selectedVideoModel?.name || 'Model'}
              </button>
            </>
          )}

          {/* Image Controls */}
          {mode === 'image' && (
            <>
              {/* Aspect Ratio */}
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                {ASPECT_RATIOS.map(ar => (
                  <option key={ar} value={ar}>{ar}</option>
                ))}
              </select>

              {/* Image Count */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-1">
                <span className="text-xs text-zinc-400">×</span>
                <select
                  value={imageCount}
                  onChange={(e) => setImageCount(parseInt(e.target.value))}
                  className="bg-transparent text-xs font-medium focus:outline-none"
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Upload Image */}
              <button
                onClick={() => imageUploadRef.current?.click()}
                className={`p-2 rounded-lg transition-colors ${
                  uploadedImage ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
                title="Upload Reference Image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Style Reference */}
              <button
                onClick={() => styleUploadRef.current?.click()}
                className={`p-2 rounded-lg transition-colors ${
                  styleReference ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
                title="Upload Style Reference"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>

              {/* Model Selector */}
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  showModelSelector ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {selectedImageModel?.name || 'Model'}
              </button>
            </>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              isLoading || !prompt.trim()
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-lime-500 hover:bg-lime-400 text-black'
            }`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating
              </>
            ) : (
              'GENERATE'
            )}
          </button>
        </div>
      </div>

      {/* Cinema Settings Modal */}
      {showCinemaSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCinemaSettings(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Cinema Settings</h3>
              <button onClick={() => setShowCinemaSettings(false)} className="p-1 hover:bg-zinc-800 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Camera Body</label>
                <select
                  value={cinemaSettings.cameraBody}
                  onChange={(e) => setCinemaSettings({ ...cinemaSettings, cameraBody: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  {CAMERA_BODIES.map(body => (
                    <option key={body} value={body}>{body}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Lens Type</label>
                <div className="flex gap-1.5">
                  {LENS_TYPES.map(lens => (
                    <button
                      key={lens}
                      onClick={() => setCinemaSettings({ ...cinemaSettings, lensType: lens })}
                      className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
                        cinemaSettings.lensType === lens
                          ? 'bg-lime-500 text-black font-medium'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {lens}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs text-zinc-500">Focal Length</label>
                  <span className="text-xs text-lime-500 font-medium">{cinemaSettings.focalLength}mm</span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="200"
                  value={cinemaSettings.focalLength}
                  onChange={(e) => setCinemaSettings({ ...cinemaSettings, focalLength: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Aperture</label>
                <select
                  value={cinemaSettings.aperture}
                  onChange={(e) => setCinemaSettings({ ...cinemaSettings, aperture: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  {APERTURES.map(ap => (
                    <option key={ap} value={ap}>{ap}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModelSelector(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">{mode === 'video' ? 'Video Model' : 'Image Model'}</h3>
              <button onClick={() => setShowModelSelector(false)} className="p-1 hover:bg-zinc-800 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {mode === 'video' ? (
                VIDEO_MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setVideoModel(m.id); setShowModelSelector(false); }}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      videoModel === m.id ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className={`text-xs ${videoModel === m.id ? 'text-black/70' : 'text-zinc-400'}`}>
                      {m.description} • Max {m.maxDuration}s
                    </div>
                  </button>
                ))
              ) : (
                IMAGE_MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setImageModel(m.id); setShowModelSelector(false); }}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      imageModel === m.id ? 'bg-lime-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className={`text-xs ${imageModel === m.id ? 'text-black/70' : 'text-zinc-400'}`}>
                      {m.description}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <Image
              src={expandedImage}
              alt="Expanded"
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
