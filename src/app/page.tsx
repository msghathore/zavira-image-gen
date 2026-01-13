'use client';

import { useState, useCallback, useEffect } from 'react';
import CinemaStudio, {
  VideoGenerateParams,
  GeneratedContent,
  ImageModel,
  AspectRatio,
  Resolution,
  Conversation,
  GenerationSlot,
} from '@/components/CinemaStudio';

export default function Home() {
  const [activeGenerations, setActiveGenerations] = useState(0);
  const isLoading = activeGenerations > 0;
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [generationSlots, setGenerationSlots] = useState<GenerationSlot[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  };

  // Load a specific conversation (metadata only - images load on demand)
  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setConversationId(id);
        // Extract images and videos from messages (URLs will be loaded on demand)
        const content: GeneratedContent[] = [];
        data.conversation.messages?.forEach((msg: any) => {
          msg.images?.forEach((img: any) => {
            content.push({
              id: img.id,
              type: 'image',
              url: '', // Will be loaded on demand via /api/images/[id]
              prompt: img.prompt || '',
              created_at: img.created_at,
            });
          });
          msg.videos?.forEach((vid: any) => {
            content.push({
              id: vid.id,
              type: 'video',
              url: '', // Will be loaded on demand
              prompt: vid.prompt || '',
              created_at: vid.created_at,
            });
          });
        });
        setGeneratedContent(content.reverse());
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Start new project
  const handleNewProject = () => {
    setConversationId(null);
    setGeneratedContent([]);
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        handleNewProject();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Single image generation helper
  const generateSingleImage = async (
    prompt: string, model: ImageModel, aspectRatio: AspectRatio, imageSize: Resolution,
    currentConversationId: string | null, uploadedImage?: string, styleReference?: string
  ): Promise<{ conversationId?: string; image?: GeneratedContent }> => {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, conversationId: currentConversationId, model, aspectRatio, imageSize, uploadedImage, styleReference }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    let result: { conversationId?: string; image?: GeneratedContent } = {};
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.error) throw new Error(data.error);
          if (data.status) console.log(`Generation status: ${data.status} - ${data.message}`);
          if (data.success && data.image) {
            result.conversationId = data.conversationId;
            result.image = { id: data.image.id, type: 'image', url: data.image.url || data.image.image_url, prompt, created_at: new Date().toISOString() };
          }
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes('Server error')) throw parseError;
          console.error('Failed to parse stream line:', line, parseError);
        }
      }
    }
    return result;
  };

  // Parallel image generation with slots
  const handleImageGenerate = useCallback(async (
    prompt: string, model: ImageModel, aspectRatio: AspectRatio, imageSize: Resolution,
    imageCount: number, uploadedImage?: string, styleReference?: string
  ) => {
    // Create slots for each image being generated
    const newSlots: GenerationSlot[] = Array.from({ length: imageCount }, (_, i) => ({
      id: `img-${Date.now()}-${i}`,
      type: 'image' as const,
      prompt,
      status: 'generating' as const,
    }));

    setGenerationSlots(prev => [...newSlots, ...prev]);
    setActiveGenerations(prev => prev + imageCount);
    let currentConvId = conversationId;

    const generatePromises = newSlots.map(async (slot) => {
      try {
        const result = await generateSingleImage(prompt, model, aspectRatio, imageSize, currentConvId, uploadedImage, styleReference);
        if (result.conversationId && !currentConvId) {
          currentConvId = result.conversationId;
          setConversationId(result.conversationId);
          fetchConversations();
        }
        if (result.image) {
          // Update slot to complete with result
          setGenerationSlots(prev => prev.map(s =>
            s.id === slot.id ? { ...s, status: 'complete' as const, result: result.image } : s
          ));
          setGeneratedContent(prev => [result.image!, ...prev]);
        }
        return result;
      } catch (error: unknown) {
        console.error('Image generation error:', error);
        // Update slot to error state
        setGenerationSlots(prev => prev.map(s =>
          s.id === slot.id ? { ...s, status: 'error' as const, error: error instanceof Error ? error.message : 'Unknown error' } : s
        ));
        return null;
      } finally {
        setActiveGenerations(prev => prev - 1);
      }
    });

    const results = await Promise.all(generatePromises);

    // Remove completed/error slots after a delay (let user see results)
    setTimeout(() => {
      setGenerationSlots(prev => prev.filter(s => !newSlots.some(ns => ns.id === s.id)));
    }, 3000);

    const successCount = results.filter(r => r?.image).length;
    if (successCount === 0 && imageCount > 0) {
      // Don't alert, error is shown in slots
      console.error('All image generations failed');
    }
  }, [conversationId]);

  // Handle video generation with slots
  const handleVideoGenerate = useCallback(async (params: VideoGenerateParams) => {
    // Create a slot for this video
    const slotId = `vid-${Date.now()}`;
    const newSlot: GenerationSlot = {
      id: slotId,
      type: 'video',
      prompt: params.prompt,
      status: 'generating',
    };

    setGenerationSlots(prev => [newSlot, ...prev]);
    setActiveGenerations(prev => prev + 1);

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          conversationId,
          model: params.model,
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          startFrame: params.startFrame?.base64,
          endFrame: params.endFrame?.base64,
          cameraMovement: params.cameraMovement,
          withAudio: params.audioEnabled,
          resolution: params.resolution,
          cinemaSettings: params.cinemaSettings,
        }),
      });

      // Handle non-OK responses properly
      if (!res.ok) {
        const errorText = await res.text();
        // Try to parse as JSON, fallback to text error
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Server error: ${res.status}`);
        } catch {
          throw new Error(errorText || `Server error: ${res.status}`);
        }
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update conversation ID if new
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        fetchConversations(); // Refresh list
      }

      // Add to generated content and update slot
      if (data.video) {
        const newContent: GeneratedContent = {
          id: data.video.id,
          type: 'video',
          url: data.video.url || data.video.video_url,
          prompt: params.prompt,
          created_at: new Date().toISOString(),
        };

        // Update slot to complete
        setGenerationSlots(prev => prev.map(s =>
          s.id === slotId ? { ...s, status: 'complete' as const, result: newContent } : s
        ));
        setGeneratedContent(prev => [newContent, ...prev]);
      }
    } catch (error: unknown) {
      console.error('Video generation error:', error);
      // Update slot to error state
      setGenerationSlots(prev => prev.map(s =>
        s.id === slotId ? { ...s, status: 'error' as const, error: error instanceof Error ? error.message : 'Unknown error' } : s
      ));
    } finally {
      setActiveGenerations(prev => prev - 1);

      // Remove slot after delay
      setTimeout(() => {
        setGenerationSlots(prev => prev.filter(s => s.id !== slotId));
      }, 3000);
    }
  }, [conversationId]);

  return (
    <CinemaStudio
      onImageGenerate={handleImageGenerate}
      onVideoGenerate={handleVideoGenerate}
      isLoading={isLoading}
      activeGenerations={activeGenerations}
      generationSlots={generationSlots}
      generatedContent={generatedContent}
      conversations={conversations}
      activeConversationId={conversationId}
      onSelectConversation={loadConversation}
      onNewProject={handleNewProject}
      onDeleteConversation={handleDeleteConversation}
    />
  );
}
