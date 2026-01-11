'use client';

import { useState, useCallback, useEffect } from 'react';
import CinemaStudio, {
  VideoGenerateParams,
  GeneratedContent,
  ImageModel,
  AspectRatio,
  Conversation,
} from '@/components/CinemaStudio';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
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

  // Load a specific conversation
  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setConversationId(id);
        // Extract images and videos from messages
        const content: GeneratedContent[] = [];
        data.conversation.messages?.forEach((msg: any) => {
          msg.images?.forEach((img: any) => {
            content.push({
              id: img.id,
              type: 'image',
              url: img.image_url,
              prompt: img.prompt || '',
              created_at: img.created_at,
            });
          });
          msg.videos?.forEach((vid: any) => {
            content.push({
              id: vid.id,
              type: 'video',
              url: vid.video_url,
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

  // Handle image generation
  const handleImageGenerate = useCallback(async (
    prompt: string,
    model: ImageModel,
    aspectRatio: AspectRatio,
    uploadedImage?: string,
    styleReference?: string
  ) => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          conversationId,
          model,
          aspectRatio,
          uploadedImage,
          styleReference,
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update conversation ID if new
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        fetchConversations(); // Refresh list
      }

      // Add to generated content
      if (data.image) {
        const newContent: GeneratedContent = {
          id: data.image.id,
          type: 'image',
          url: data.image.url || data.image.image_url,
          prompt,
          created_at: new Date().toISOString(),
        };
        setGeneratedContent(prev => [newContent, ...prev]);
      }
    } catch (error: unknown) {
      console.error('Image generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Handle video generation
  const handleVideoGenerate = useCallback(async (params: VideoGenerateParams) => {
    setIsLoading(true);

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

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update conversation ID if new
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        fetchConversations(); // Refresh list
      }

      // Add to generated content
      if (data.video) {
        const newContent: GeneratedContent = {
          id: data.video.id,
          type: 'video',
          url: data.video.url || data.video.video_url,
          prompt: params.prompt,
          created_at: new Date().toISOString(),
        };
        setGeneratedContent(prev => [newContent, ...prev]);
      }
    } catch (error: unknown) {
      console.error('Video generation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate video');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  return (
    <CinemaStudio
      onImageGenerate={handleImageGenerate}
      onVideoGenerate={handleVideoGenerate}
      isLoading={isLoading}
      generatedContent={generatedContent}
      conversations={conversations}
      activeConversationId={conversationId}
      onSelectConversation={loadConversation}
      onNewProject={handleNewProject}
      onDeleteConversation={handleDeleteConversation}
    />
  );
}
