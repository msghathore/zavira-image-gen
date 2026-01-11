'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { GeneratedImage } from '@/types';

// Supported image formats including HEIC for iOS
const ACCEPTED_FORMATS = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadedImageData {
  base64: string;
  fileName: string;
  fileSize: number;
}

interface ChatInputProps {
  onSend: (message: string, referenceImageId?: string, uploadedImage?: string, styleReference?: string) => void;
  isLoading: boolean;
  selectedImage: GeneratedImage | null;
  onClearSelectedImage: () => void;
  // Main image (to edit/transform)
  uploadedImage: string | null;
  uploadedImageInfo: UploadedImageData | null;
  onImageUpload: (base64: string, fileName: string, fileSize: number) => void;
  onClearUploadedImage: () => void;
  // Style reference image
  styleReference: string | null;
  styleReferenceInfo: UploadedImageData | null;
  onStyleUpload: (base64: string, fileName: string, fileSize: number) => void;
  onClearStyleReference: () => void;
}

export default function ChatInput({
  onSend,
  isLoading,
  selectedImage,
  onClearSelectedImage,
  uploadedImage,
  uploadedImageInfo,
  onImageUpload,
  onClearUploadedImage,
  styleReference,
  styleReferenceInfo,
  onStyleUpload,
  onClearStyleReference,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim(), selectedImage?.id, uploadedImage || undefined, styleReference || undefined);
    setInput('');
    onClearSelectedImage();
    onClearUploadedImage();
    onClearStyleReference();
    setUploadError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const processFile = useCallback((file: File, isStyleReference: boolean = false) => {
    // Validate file type - support HEIC for iOS
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isValidType = validTypes.includes(file.type) ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');

    if (!isValidType) {
      setUploadError('Please upload a JPEG, PNG, WebP, or HEIC image');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Image must be less than 10MB');
      return;
    }

    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isStyleReference) {
        onStyleUpload(base64, file.name, file.size);
      } else {
        onImageUpload(base64, file.name, file.size);
        // Clear selected image when uploading a new main image
        onClearSelectedImage();
      }
    };
    reader.readAsDataURL(file);
  }, [onImageUpload, onStyleUpload, onClearSelectedImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, isStyleReference: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file, isStyleReference);

    // Reset file input so the same file can be selected again
    if (isStyleReference && styleInputRef.current) {
      styleInputRef.current.value = '';
    } else if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Default to main image for drag & drop
      processFile(file, false);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

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

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasAnyImage = uploadedImage || styleReference;

  return (
    <div
      className={`relative border-t border-zinc-800 bg-zinc-900/50 p-4 transition-colors ${
        isDragging ? 'bg-lime-900/20 border-lime-500' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        capture="environment"
        onChange={(e) => handleFileSelect(e, false)}
        className="hidden"
        disabled={isLoading}
      />
      <input
        ref={styleInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={(e) => handleFileSelect(e, true)}
        className="hidden"
        disabled={isLoading}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-lime-900/40 backdrop-blur-sm z-10 pointer-events-none rounded-t-lg">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-lime-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-lime-300 font-medium">Drop image here</p>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-3 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg flex items-center justify-between">
          <p className="text-xs text-red-300">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="p-1 hover:bg-red-800/50 rounded"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-red-300"
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

      {/* Image previews - side by side when both are present */}
      {hasAnyImage && (
        <div className="mb-3 flex gap-2">
          {/* Main/Edit image preview */}
          {uploadedImage && (
            <div className="flex-1 flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
              <img
                src={uploadedImage}
                alt="Edit"
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {uploadedImageInfo?.fileName || 'Image'}
                </p>
                {uploadedImageInfo && (
                  <p className="text-xs text-gray-500">
                    {formatFileSize(uploadedImageInfo.fileSize)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  onClearUploadedImage();
                  setUploadError(null);
                }}
                className="p-1 hover:bg-zinc-700 rounded"
                title="Remove image"
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

          {/* Style reference preview */}
          {styleReference && (
            <div className="flex-1 flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
              <img
                src={styleReference}
                alt="Style"
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-lime-300 font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Style
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {styleReferenceInfo?.fileName || 'Reference'}
                </p>
                {styleReferenceInfo && (
                  <p className="text-xs text-gray-500">
                    {formatFileSize(styleReferenceInfo.fileSize)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  onClearStyleReference();
                  setUploadError(null);
                }}
                className="p-1 hover:bg-zinc-700 rounded"
                title="Remove style reference"
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
        </div>
      )}

      {/* Selected image preview (when no uploaded image) */}
      {selectedImage && !uploadedImage && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
          <img
            src={selectedImage.image_url}
            alt=""
            className="w-12 h-12 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-lime-400 font-medium">Editing image:</p>
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

      <div className="flex items-end gap-2">
        {/* Main image upload button (camera icon) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`
            flex-shrink-0 p-3 rounded-xl transition-all border
            ${uploadedImage
              ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700'
              : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title="Upload image to edit"
        >
          {uploadedImage ? (
            // Checkmark when image is uploaded
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            // Camera icon for main image upload
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>

        {/* Style reference upload button (palette icon) */}
        <button
          onClick={() => styleInputRef.current?.click()}
          disabled={isLoading}
          className={`
            flex-shrink-0 p-3 rounded-xl transition-all border
            ${styleReference
              ? 'bg-lime-600 border-lime-500 hover:bg-lime-700'
              : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title="Upload style reference"
        >
          {styleReference ? (
            // Checkmark when style reference is uploaded
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            // Palette/brush icon for style reference
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              uploadedImage && styleReference
                ? "Describe how to transform this image with this style..."
                : uploadedImage
                ? "Describe what to do with this image..."
                : styleReference
                ? "Describe what to generate in this style..."
                : selectedImage
                ? "Describe how to edit this image..."
                : "Describe the image you want to generate..."
            }
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 p-3 bg-lime-500 hover:bg-lime-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl transition-colors"
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
        {uploadedImage && styleReference
          ? 'Edit image with style reference attached.'
          : uploadedImage
          ? 'Image to edit attached.'
          : styleReference
          ? 'Style reference attached.'
          : selectedImage
          ? 'Selected image will be used as reference.'
          : 'Upload an image to edit or a style reference.'}
      </p>
    </div>
  );
}

// Export the interface for use in page.tsx
export type { UploadedImageData };
