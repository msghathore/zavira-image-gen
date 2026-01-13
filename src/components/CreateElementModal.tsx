'use client';

import { useState, useRef } from 'react';
import { ColorTag } from '@/types/element';
import Image from 'next/image';

interface CreateElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: ColorTag, photos: File[]) => Promise<void>;
}

const colorOptions: { value: ColorTag; label: string; class: string }[] = [
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
];

export default function CreateElementModal({
  isOpen,
  onClose,
  onCreate,
}: CreateElementModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<ColorTag>('blue');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 5 photos total
    const remainingSlots = 5 - selectedFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      setSelectedFiles((prev) => [...prev, ...filesToAdd]);

      // Create preview URLs
      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrls((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the element');
      return;
    }

    if (selectedFiles.length === 0) {
      alert('Please add at least one photo');
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(name.trim(), selectedColor, selectedFiles);

      // Reset form
      setName('');
      setSelectedColor('blue');
      setSelectedFiles([]);
      setPreviewUrls([]);
      onClose();
    } catch (error) {
      console.error('Failed to create element:', error);
      alert('Failed to create element. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Create New Element</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
            disabled={isCreating}
          >
            <svg
              className="w-5 h-5"
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

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Element name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Element Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Character, Product Shot, Logo..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:border-lime-500"
              maxLength={50}
              disabled={isCreating}
            />
          </div>

          {/* Color tag */}
          <div>
            <label className="block text-sm font-medium mb-2">Color Tag</label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedColor(option.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${
                    selectedColor === option.value
                      ? 'border-lime-500 bg-zinc-800'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  disabled={isCreating}
                >
                  <div className={`w-4 h-4 rounded-full ${option.class}`} />
                  <span className="text-xs">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Photos (up to 5)
            </label>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {previewUrls.map((url, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-md bg-zinc-800 overflow-hidden relative group"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isCreating}
                  >
                    <svg
                      className="w-3 h-3"
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
              ))}

              {/* Add photo button */}
              {selectedFiles.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-md border-2 border-dashed border-zinc-700 hover:border-lime-500 flex flex-col items-center justify-center gap-1 transition-colors"
                  disabled={isCreating}
                >
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-xs text-gray-500">Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-xs text-gray-500">
              {selectedFiles.length} / 5 photos added
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-zinc-800 rounded-md transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium bg-lime-500 hover:bg-lime-600 text-zinc-900 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isCreating || !name.trim() || selectedFiles.length === 0}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              'Create Element'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
