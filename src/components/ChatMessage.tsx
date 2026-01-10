'use client';

import { Message, GeneratedImage } from '@/types';
import Image from 'next/image';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  onImageSelect?: (image: GeneratedImage) => void;
}

export default function ChatMessage({ message, onImageSelect }: ChatMessageProps) {
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const isUser = message.role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
            : 'bg-zinc-800 text-gray-100 rounded-2xl rounded-bl-md'
        } px-4 py-3`}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Generated images */}
        {message.images && message.images.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.images.map((image) => (
              <div key={image.id} className="relative group">
                {/* Loading skeleton */}
                {!imageLoaded[image.id] && (
                  <div className="w-full aspect-square rounded-lg skeleton" />
                )}

                {/* Image */}
                <div
                  className={`relative ${!imageLoaded[image.id] ? 'hidden' : ''}`}
                  onClick={() => setExpandedImage(image.image_url)}
                >
                  <Image
                    src={image.image_url}
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
                        if (onImageSelect) onImageSelect(image);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Edit this
                    </button>
                    <a
                      href={image.image_url}
                      download={`generated-${image.id}.png`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>

                {/* Prompt label */}
                {image.revised_prompt && (
                  <p className="mt-1 text-xs text-gray-400 italic truncate">
                    {image.revised_prompt}
                  </p>
                )}
              </div>
            ))}
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
