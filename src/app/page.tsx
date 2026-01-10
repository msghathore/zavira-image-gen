'use client';

import { useState, useEffect, useRef } from 'react';
import { Conversation, Message, GeneratedImage } from '@/types';
import { AVAILABLE_MODELS, ImageModel } from '@/lib/laozhang';
import ConversationSidebar from '@/components/ConversationSidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import TypingIndicator from '@/components/TypingIndicator';
import ImageGallery from '@/components/ImageGallery';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [conversationImages, setConversationImages] = useState<GeneratedImage[]>([]);
  const [selectedModel, setSelectedModel] = useState<ImageModel>('nano-banana-2');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageInfo, setUploadedImageInfo] = useState<{
    base64: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load conversations on mount
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

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setActiveConversation(data.conversation);
        setMessages(data.conversation.messages || []);
        // Extract all images from messages
        const images = data.conversation.messages
          ?.flatMap((m: Message) => m.images || [])
          .filter(Boolean) || [];
        setConversationImages(images);
      }
      setSidebarOpen(false);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setConversationImages([]);
    setSelectedImage(null);
    setSidebarOpen(false);
  };

  const deleteConversation = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversation?.id === id) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSend = async (message: string, referenceImageId?: string, uploadedImageData?: string) => {
    setIsLoading(true);

    // Optimistically add user message (include uploaded image if present)
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversation?.id || '',
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      uploadedImage: uploadedImageData, // Show uploaded image in message
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    // Clear uploaded image immediately after adding to message
    setUploadedImage(null);
    setUploadedImageInfo(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          conversationId: activeConversation?.id,
          referenceImageId,
          model: selectedModel,
          uploadedImage: uploadedImageData, // User-uploaded image takes priority
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Update conversation ID if new
      if (!activeConversation && data.conversationId) {
        setActiveConversation({ id: data.conversationId } as Conversation);
      }

      // Add assistant message with image
      const assistantMessage: Message = {
        ...data.message,
        images: data.image ? [{ ...data.image, image_url: data.image.url || data.image.image_url }] : [],
      };
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        { ...tempUserMessage, id: data.message?.id || tempUserMessage.id },
        assistantMessage,
      ]);

      // Update conversation images
      if (data.image) {
        setConversationImages((prev) => [
          { ...data.image, image_url: data.image.url || data.image.image_url },
          ...prev,
        ]);
      }

      // Refresh conversations list
      fetchConversations();
    } catch (error: any) {
      console.error('Generation error:', error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversation_id: activeConversation?.id || '',
          role: 'assistant',
          content: `Error: ${error.message || 'Failed to generate image. Please try again.'}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
    }
  };

  const handleImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image);
    setShowGallery(false);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversation?.id || null}
        onSelect={loadConversation}
        onNew={startNewConversation}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-zinc-800 rounded-lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold">
                {activeConversation?.title || 'AI Image Generator'}
              </h1>
              <p className="text-xs text-gray-500">
                {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.description || 'AI Image Generation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model selector */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ImageModel)}
              className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>

            {/* Gallery toggle */}
          {conversationImages.length > 0 && (
            <button
              onClick={() => setShowGallery(!showGallery)}
              className={`p-2 rounded-lg transition-colors ${
                showGallery ? 'bg-indigo-600' : 'hover:bg-zinc-800'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${showGallery ? 'hidden md:block md:w-1/2' : ''}`}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Create Amazing Images with AI
                </h2>
                <p className="text-gray-400 max-w-md mb-6">
                  Describe the image you want to create in natural language. You can
                  refine and edit images through conversation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left w-full max-w-lg">
                  <button
                    onClick={() =>
                      handleSend('A serene Japanese garden with cherry blossoms')
                    }
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                  >
                    🌸 Japanese garden with cherry blossoms
                  </button>
                  <button
                    onClick={() =>
                      handleSend('A futuristic city at sunset with flying cars')
                    }
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                  >
                    🏙️ Futuristic city at sunset
                  </button>
                  <button
                    onClick={() =>
                      handleSend('A cozy cabin in snowy mountains')
                    }
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                  >
                    🏔️ Cozy cabin in mountains
                  </button>
                  <button
                    onClick={() =>
                      handleSend('An astronaut cat floating in space')
                    }
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                  >
                    🐱 Astronaut cat in space
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onImageSelect={handleImageSelect}
                  />
                ))}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Image gallery panel */}
          {showGallery && (
            <div className="w-full md:w-1/2 border-l border-zinc-800 overflow-y-auto">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-medium">Image Gallery</h3>
                <p className="text-xs text-gray-500">
                  Click an image to select it for editing
                </p>
              </div>
              <ImageGallery
                images={conversationImages}
                onSelect={handleImageSelect}
                selectedId={selectedImage?.id}
              />
            </div>
          )}
        </div>

        {/* Chat input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          selectedImage={selectedImage}
          onClearSelectedImage={() => setSelectedImage(null)}
          uploadedImage={uploadedImage}
          uploadedImageInfo={uploadedImageInfo}
          onImageUpload={(base64, fileName, fileSize) => {
            setUploadedImage(base64);
            setUploadedImageInfo({ base64, fileName, fileSize });
          }}
          onClearUploadedImage={() => {
            setUploadedImage(null);
            setUploadedImageInfo(null);
          }}
        />
      </main>
    </div>
  );
}
