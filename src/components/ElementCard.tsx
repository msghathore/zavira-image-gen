'use client';

import { Element } from '@/types/element';
import Image from 'next/image';

interface ElementCardProps {
  element: Element;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

const colorClasses: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  gray: 'bg-gray-500',
};

export default function ElementCard({
  element,
  isActive = false,
  onClick,
  onDelete,
  onEdit,
}: ElementCardProps) {
  const displayPhotos = element.photos.slice(0, 4);
  const remainingCount = element.photos.length - 4;

  return (
    <div
      className={`group relative rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'border-lime-500 bg-zinc-800/50'
          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900'
      }`}
      onClick={onClick}
    >
      {/* Color tag */}
      <div className="absolute top-2 left-2 z-10">
        <div
          className={`w-3 h-3 rounded-full ${
            colorClasses[element.color] || 'bg-gray-500'
          }`}
          title={element.color}
        />
      </div>

      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute top-2 right-8 z-10 opacity-0 group-hover:opacity-100 p-1 bg-black/70 hover:bg-lime-500 hover:text-black rounded-md transition-all"
          title="Edit element"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      )}

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 p-1 bg-black/70 hover:bg-red-500 rounded-md transition-all"
          title="Delete element"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 gap-1 p-2">
        {displayPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="aspect-square rounded-md bg-zinc-800 overflow-hidden relative"
          >
            <Image
              src={photo.thumbnail_url || photo.url}
              alt=""
              fill
              className="object-cover"
              sizes="100px"
            />
          </div>
        ))}

        {/* Show remaining count if more than 4 photos */}
        {remainingCount > 0 && (
          <div className="aspect-square rounded-md bg-zinc-800 flex items-center justify-center">
            <span className="text-xs text-gray-400 font-medium">
              +{remainingCount}
            </span>
          </div>
        )}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 4 - displayPhotos.length) }).map(
          (_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-square rounded-md bg-zinc-800/50 border border-dashed border-zinc-700"
            />
          )
        )}
      </div>

      {/* Element name */}
      <div className="px-2 pb-2">
        <h3 className="text-sm font-medium truncate">{element.name}</h3>
        <p className="text-xs text-gray-500">
          {element.photos.length} photo{element.photos.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
