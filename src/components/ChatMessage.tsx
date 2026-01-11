'use client';

import { Message, GeneratedImage, GeneratedVideo } from '@/types';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface ChatMessageProps {
  message: Message;
  onImageSelect?: (image: GeneratedImage) => void;
  onCreateVideoFromImage?: (imageUrl: string) => void;
}

// Cache for loaded image URLs
const imageUrlCache: Record<string, string> = {};

export default function ChatMessage({ message, onImageSelect, onCreateVideoFromImage }: ChatMessageProps) {
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const isUser = message.role === 'user';

  // Lazy load image URLs
  useEffect(() => {
    if (!message.images || message.images.length === 0) return;

    message.images.forEach(async (image) => {
      // Skip if already loaded or has URL
      if (imageUrls[image.id] || imageUrlCache[image.id]) {
        if (imageUrlCache[image.id] && !imageUrls[image.id]) {
          setImageUrls(prev => ({ ...prev, [image.id]: imageUrlCache[image.id] }));
        }
        return;
      }

      // If image already has URL (from new generation), use it
      if (image.image_url) {
        imageUrlCache[image.id] = image.image_url;
        setImageUrls(prev => ({ ...prev, [image.id]: image.image_url }));
        return;
      }

      // Fetch from API
      try {
        const res = await fetch(`/api/images/${image.id}`);
        const data = await res.json();
        if (data.image?.image_url) {
          imageUrlCache[image.id] = data.image.image_url;
          setImageUrls(prev => ({ ...prev, [image.id]: data.image.image_url }));
        }
      } catch (error) {
        console.error('Failed to load image:', error);
      }
    });
  }, [message.images]);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-lime-500 text-zinc-900 rounded-2xl rounded-br-md'
            : 'bg-zinc-800 text-gray-100 rounded-2xl rounded-bl-md'
        } px-4 py-3`}
      >
        {/* Uploaded image (for user messages) */}
        {message.uploadedImage && (
          <div className="mb-2">
            <div className="relative inline-block">
              <img
                src={message.uploadedImage}
                alt="Uploaded reference"
                className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setExpandedImage(message.uploadedImage!)}
              />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-emerald-400 font-medium">
                Reference
              </div>
            </div>
          </div>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Generated images */}
        {message.images && message.images.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.images.map((image) => {
              const imageUrl = imageUrls[image.id] || image.image_url;
              return (
                <div key={image.id} className="relative group">
                  {/* Loading skeleton */}
                  {(!imageUrl || !imageLoaded[image.id]) && (
                    <div className="w-full aspect-square rounded-lg skeleton" />
                  )}

                  {/* Image */}
                  {imageUrl && (
                    <div
                      className={`relative ${!imageLoaded[image.id] ? 'hidden' : ''}`}
                      onClick={() => setExpandedImage(imageUrl)}
                    >
                      <Image
                        src={imageUrl}
                        alt={image.prompt || 'Generated image'}
                        width={512}
                        height={512}
                        className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity image-glow"
                        onLoad={() =>
                          setImageLoaded((prev) => ({ ...prev, [image.id]: true }))
                        }
                      />

                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onImageSelect) onImageSelect({ ...image, image_url: imageUrl });
                          }}
                          className="px-3 py-1.5 bg-lime-500 hover:bg-lime-600 rounded-lg text-xs font-medium text-zinc-900 transition-colors"
                        >
                          Edit this
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCreateVideoFromImage) onCreateVideoFromImage(imageUrl);
                          }}
                          className="px-3 py-1.5 bg-lime-500 hover:bg-lime-600 text-zinc-900 rounded-lg text-xs font-medium transition-colors"
                        >
                          Create Video
                        </button>
                        <a
                          href={imageUrl}
                          download={`generated-${image.id}.png`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Prompt label */}
                  {image.revised_prompt && (
                    <p className="mt-1 text-xs text-gray-400 italic truncate">
                      {image.revised_prompt}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-[10px] opacity-50">
          {new Date(message.created_at).toLocaleTimeString()}
        </p>
      </div>

      {/* Expanded image modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={expandedImage}
              alt="Expanded image"
              width={1024}
              height={1024}
              className="rounded-lg object-contain max-h-[90vh]"
            />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
