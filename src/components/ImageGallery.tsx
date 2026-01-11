'use client';

import { GeneratedImage } from '@/types';
import Image from 'next/image';

interface ImageGalleryProps {
  images: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
  selectedId?: string;
}

export default function ImageGallery({ images, onSelect, selectedId }: ImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 mx-auto mb-3 opacity-50"
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
        <p className="text-sm">No images in this conversation yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
      {images.map((image) => (
        <div
          key={image.id}
          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group transition-all ${
            selectedId === image.id
              ? 'ring-2 ring-lime-500 ring-offset-2 ring-offset-zinc-900'
              : 'hover:opacity-90'
          }`}
          onClick={() => onSelect(image)}
        >
          <Image
            src={image.image_url}
            alt={image.prompt || ''}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-xs text-white truncate">{image.prompt}</p>
            </div>
          </div>
          {selectedId === image.id && (
            <div className="absolute top-2 right-2 bg-lime-500 rounded-full p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
