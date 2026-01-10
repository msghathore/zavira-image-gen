'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { GeneratedImage } from '@/types';

interface ChatInputProps {
  onSend: (message: string, referenceImageId?: string) => void;
  isLoading: boolean;
  selectedImage: GeneratedImage | null;
  onClearSelectedImage: () => void;
}

export default function ChatInput({
  onSend,
  isLoading,
  selectedImage,
  onClearSelectedImage,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), selectedImage?.id);
    setInput('');
    onClearSelectedImage();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
      {/* Selected image preview */}
      {selectedImage && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
          <img
            src={selectedImage.image_url}
            alt=""
            className="w-12 h-12 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-400 font-medium">Editing image:</p>
            <p className="text-xs text-gray-400 truncate">{selectedImage.prompt}</p>
          </div>
          <button
            onClick={onClearSelectedImage}
            className="p-1 hover:bg-zinc-700 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
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
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedImage
                ? "Describe how to edit this image..."
                : "Describe the image you want to generate..."
            }
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl transition-colors"
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Hint text */}
      <p className="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line.{' '}
        {selectedImage ? 'Selected image will be used as reference.' : 'Click an image to edit it.'}
      </p>
    </div>
  );
}
