'use client';

import { useState, useRef, useCallback } from 'react';

// ==================== TYPES ====================

export type VideoModel = 'sora-2-pro' | 'kling-2.6' | 'veo-3.1' | 'wan-2.6' | 'seedance-1.5-pro';
export type VideoDuration = '5s' | '10s' | '15s' | '20s';
export type VideoAspectRatio = '16:9' | '9:16' | '1:1';
export type ContentMode = 'image' | 'video';

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

export interface VideoTabState {
  mode: ContentMode;
  model: VideoModel;
  startFrame: FrameData | null;
  endFrame: FrameData | null;
  cameraMovement: CameraMovement;
  duration: VideoDuration;
  aspectRatio: VideoAspectRatio;
  audioEnabled: boolean;
  cinemaExpanded: boolean;
  cinemaSettings: CinemaSettings;
  prompt: string;
}

export interface VideoTabProps {
  onGenerate?: (state: VideoTabState) => void;
  isLoading?: boolean;
}

// ==================== CONSTANTS ====================

const VIDEO_MODELS: VideoModelInfo[] = [
  { id: 'sora-2-pro', name: 'Sora 2 Pro', description: 'OpenAI Sora - Cinematic', maxDuration: 20 },
  { id: 'kling-2.6', name: 'Kling 2.6', description: 'Kuaishou - Fast & Detailed', maxDuration: 15 },
  { id: 'veo-3.1', name: 'Veo 3.1', description: 'Google DeepMind - High Quality', maxDuration: 20 },
  { id: 'wan-2.6', name: 'Wan 2.6', description: 'Alibaba - Versatile', maxDuration: 15 },
  { id: 'seedance-1.5-pro', name: 'Seedance 1.5 Pro', description: 'ByteDance - Motion Rich', maxDuration: 10 },
];

const CAMERA_MOVEMENTS: { id: CameraMovement; label: string; video: string }[] = [
  { id: 'static', label: 'Static', video: '/camera-movements/static.mp4' },
  { id: 'handheld', label: 'Handheld', video: '/camera-movements/handheld.mp4' },
  { id: 'zoom-out', label: 'Zoom Out', video: '/camera-movements/zoom-out.mp4' },
  { id: 'zoom-in', label: 'Zoom in', video: '/camera-movements/zoom-in.mp4' },
  { id: 'orbit-left', label: 'Camera follows', video: '/camera-movements/camera-follows.mp4' },
  { id: 'pan-left', label: 'Pan left', video: '/camera-movements/pan-left.mp4' },
  { id: 'pan-right', label: 'Pan right', video: '/camera-movements/pan-right.mp4' },
  { id: 'tilt-up', label: 'Tilt up', video: '/camera-movements/tilt-up.mp4' },
  { id: 'tilt-down', label: 'Tilt down', video: '/camera-movements/tilt-down.mp4' },
  { id: 'orbit-right', label: 'Orbit around', video: '/camera-movements/orbit-around.mp4' },
  { id: 'dolly-in', label: 'Dolly in', video: '/camera-movements/dolly-in.mp4' },
  { id: 'dolly-out', label: 'Dolly out', video: '/camera-movements/dolly-out.mp4' },
  { id: 'jib-up', label: 'Jib up', video: '/camera-movements/jib-up.mp4' },
  { id: 'jib-down', label: 'Jib down', video: '/camera-movements/jib-down.mp4' },
  { id: 'drone-shot', label: 'Drone', video: '/camera-movements/drone-shot.mp4' },
  { id: '360-roll', label: '360 Roll', video: '/camera-movements/360-roll.mp4' },
  { id: 'dolly-in', label: 'Dolly left', video: '/camera-movements/dolly-left.mp4' },
  { id: 'dolly-out', label: 'Dolly right', video: '/camera-movements/dolly-right.mp4' },
];

const CAMERA_BODIES = [
  'RED Komodo',
  'ARRI Alexa Mini LF',
  'Sony Venice 2',
  'Blackmagic URSA',
  'Canon C70',
  'Panasonic S1H',
];

const LENS_TYPES = ['Anamorphic', 'Spherical', 'Vintage', 'Macro', 'Fisheye'];

const APERTURES = ['f/1.4', 'f/2', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16', 'f/22'];

const DURATIONS: VideoDuration[] = ['5s', '10s', '15s', '20s'];
const ASPECT_RATIOS: VideoAspectRatio[] = ['16:9', '9:16', '1:1'];

// ==================== COMPONENT ====================

export default function VideoTab({ onGenerate, isLoading = false }: VideoTabProps) {
  // State
  const [mode, setMode] = useState<ContentMode>('video');
  const [model, setModel] = useState<VideoModel>('sora-2-pro');
  const [startFrame, setStartFrame] = useState<FrameData | null>(null);
  const [endFrame, setEndFrame] = useState<FrameData | null>(null);
  const [cameraMovement, setCameraMovement] = useState<CameraMovement>('static');
  const [duration, setDuration] = useState<VideoDuration>('10s');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [cinemaExpanded, setCinemaExpanded] = useState(false);
  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings>({
    cameraBody: 'RED Komodo',
    lensType: 'Anamorphic',
    focalLength: 50,
    aperture: 'f/2.8',
  });
  const [prompt, setPrompt] = useState('');

  // Refs
  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);

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

  const handleGenerate = useCallback(() => {
    if (onGenerate) {
      onGenerate({
        mode,
        model,
        startFrame,
        endFrame,
        cameraMovement,
        duration,
        aspectRatio,
        audioEnabled,
        cinemaExpanded,
        cinemaSettings,
        prompt,
      });
    }
  }, [mode, model, startFrame, endFrame, cameraMovement, duration, aspectRatio, audioEnabled, cinemaExpanded, cinemaSettings, prompt, onGenerate]);

  const selectedModelInfo = VIDEO_MODELS.find(m => m.id === model);

  return (
    <div className="bg-zinc-900 text-white h-full flex flex-col">
      {/* Hidden file inputs */}
      <input
        ref={startFrameInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFrameUpload(e, setStartFrame)}
        className="hidden"
      />
      <input
        ref={endFrameInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFrameUpload(e, setEndFrame)}
        className="hidden"
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-zinc-800 rounded-full p-1">
            <button
              onClick={() => setMode('image')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                mode === 'image'
                  ? 'bg-lime-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Image
            </button>
            <button
              onClick={() => setMode('video')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                mode === 'video'
                  ? 'bg-lime-500 text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Video
            </button>
          </div>
        </div>

        {/* Video Model Selector */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
            Video Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as VideoModel)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} - {m.description}
              </option>
            ))}
          </select>
          {selectedModelInfo && (
            <p className="text-xs text-zinc-500 mt-1">
              Max duration: {selectedModelInfo.maxDuration}s
            </p>
          )}
        </div>

        {/* Frame Upload Section */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
            Keyframes (Optional)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Start Frame */}
            <div
              onClick={() => startFrameInputRef.current?.click()}
              className={`relative aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                startFrame
                  ? 'border-lime-500 bg-lime-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              {startFrame ? (
                <>
                  <img
                    src={startFrame.base64}
                    alt="Start frame"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartFrame(null);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                    <p className="text-xs text-lime-400 font-medium">START</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-2">
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
              className={`relative aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                endFrame
                  ? 'border-lime-500 bg-lime-500/10'
                  : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              {endFrame ? (
                <>
                  <img
                    src={endFrame.base64}
                    alt="End frame"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEndFrame(null);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                    <p className="text-xs text-lime-400 font-medium">END</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-2">
                  <svg className="w-6 h-6 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs text-zinc-500">END FRAME</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Movement Grid */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
            Camera Movement
          </label>
          <div className="grid grid-cols-6 gap-2">
            {CAMERA_MOVEMENTS.map((movement, index) => (
              <button
                key={`${movement.id}-${index}`}
                onClick={() => setCameraMovement(movement.id)}
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
                    // Pause after first frame loads to show thumbnail
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
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className={`text-[10px] font-medium text-center truncate ${
                    cameraMovement === movement.id ? 'text-lime-400' : 'text-white'
                  }`}>
                    {movement.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Controls Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Duration */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
              Duration
            </label>
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  disabled={selectedModelInfo && parseInt(d) > selectedModelInfo.maxDuration}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    duration === d
                      ? 'bg-lime-500 text-black'
                      : selectedModelInfo && parseInt(d) > selectedModelInfo.maxDuration
                      ? 'text-zinc-600 cursor-not-allowed'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
              Ratio
            </label>
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  onClick={() => setAspectRatio(ar)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    aspectRatio === ar
                      ? 'bg-lime-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Toggle */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
              Audio
            </label>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                audioEnabled
                  ? 'bg-lime-500 text-black'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {audioEnabled ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  ON
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  OFF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Cinema Controls (Collapsible) */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setCinemaExpanded(!cinemaExpanded)}
            className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-lime-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">Cinema Controls</span>
            </div>
            <svg
              className={`w-4 h-4 text-zinc-400 transition-transform ${cinemaExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {cinemaExpanded && (
            <div className="p-3 space-y-3 bg-zinc-900/50">
              {/* Camera Body */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Camera Body</label>
                <select
                  value={cinemaSettings.cameraBody}
                  onChange={(e) => setCinemaSettings({ ...cinemaSettings, cameraBody: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  {CAMERA_BODIES.map((body) => (
                    <option key={body} value={body}>{body}</option>
                  ))}
                </select>
              </div>

              {/* Lens Type */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Lens Type</label>
                <div className="flex gap-1.5">
                  {LENS_TYPES.map((lens) => (
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

              {/* Focal Length Slider */}
              <div>
                <div className="flex justify-between mb-1">
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
                <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                  <span>14mm</span>
                  <span>200mm</span>
                </div>
              </div>

              {/* Aperture */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Aperture</label>
                <select
                  value={cinemaSettings.aperture}
                  onChange={(e) => setCinemaSettings({ ...cinemaSettings, aperture: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                >
                  {APERTURES.map((ap) => (
                    <option key={ap} value={ap}>{ap}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5 block">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video scene..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            isLoading || !prompt.trim()
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-lime-500 hover:bg-lime-400 text-black'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate Video
            </>
          )}
        </button>
      </div>
    </div>
  );
}

