'use client';

import { useState, useRef, useEffect } from 'react';
import { Element, ElementPhoto, ColorTag } from '@/types/element';
import Image from 'next/image';

interface EditElementModalProps {
  isOpen: boolean;
  element: Element | null;
  onClose: () => void;
  onSave: (updatedElement: Element) => void;
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

export default function EditElementModal({
  isOpen,
  element,
  onClose,
  onSave,
}: EditElementModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<ColorTag>('blue');
  const [photos, setPhotos] = useState<ElementPhoto[]>([]);
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when element changes
  useEffect(() => {
    if (element) {
      setName(element.name);
      setSelectedColor(element.color as ColorTag);
      setPhotos([...element.photos]);
      setNewPhotoUrls([]);
      setNewPhotoFiles([]);
    }
  }, [element]);

  if (!isOpen || !element) return null;

  const totalPhotos = photos.length + newPhotoFiles.length;
  const canAddMorePhotos = totalPhotos < 5;
  const canRemovePhotos = photos.length + newPhotoFiles.length > 1;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 5 - totalPhotos;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      setNewPhotoFiles((prev) => [...prev, ...filesToAdd]);

      // Create preview URLs
      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewPhotoUrls((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingPhoto = (photoId: string) => {
    if (!canRemovePhotos) {
      alert('Element must have at least 1 photo');
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleRemoveNewPhoto = (index: number) => {
    if (!canRemovePhotos) {
      alert('Element must have at least 1 photo');
      return;
    }
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the element');
      return;
    }

    if (photos.length === 0 && newPhotoFiles.length === 0) {
      alert('Element must have at least one photo');
      return;
    }

    setIsSaving(true);
    try {
      // Convert new files to ElementPhoto objects
      const newPhotoPromises = newPhotoFiles.map((file, index) => {
        return new Promise<ElementPhoto>((resolve) => {
          // Use already created preview URL if available
          if (newPhotoUrls[index]) {
            resolve({
              id: `photo-${Date.now()}-${Math.random()}`,
              url: newPhotoUrls[index],
              added_at: new Date().toISOString(),
            });
          } else {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                id: `photo-${Date.now()}-${Math.random()}`,
                url: e.target?.result as string,
                added_at: new Date().toISOString(),
              });
            };
            reader.readAsDataURL(file);
          }
        });
      });

      const newPhotos = await Promise.all(newPhotoPromises);

      const updatedElement: Element = {
        ...element,
        name: name.trim(),
        color: selectedColor,
        photos: [...photos, ...newPhotos],
        updated_at: new Date().toISOString(),
      };

      onSave(updatedElement);
      onClose();
    } catch (error) {
      console.error('Failed to save element:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Edit Element</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
            disabled={isSaving}
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
              disabled={isSaving}
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
                  disabled={isSaving}
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
              Photos ({totalPhotos} / 5)
            </label>

            {/* Photo grid */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Existing photos */}
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-md bg-zinc-800 overflow-hidden relative group"
                >
                  <Image
                    src={photo.thumbnail_url || photo.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  {canRemovePhotos && (
                    <button
                      onClick={() => handleRemoveExistingPhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isSaving}
                      title="Remove photo"
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
                  )}
                </div>
              ))}

              {/* New photos (pending upload) */}
              {newPhotoUrls.map((url, index) => (
                <div
                  key={`new-${index}`}
                  className="aspect-square rounded-md bg-zinc-800 overflow-hidden relative group"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-lime-500 text-zinc-900 text-[10px] font-medium rounded">
                    NEW
                  </div>
                  {canRemovePhotos && (
                    <button
                      onClick={() => handleRemoveNewPhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={isSaving}
                      title="Remove photo"
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
                  )}
                </div>
              ))}

              {/* Add photo button */}
              {canAddMorePhotos && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-md border-2 border-dashed border-zinc-700 hover:border-lime-500 flex flex-col items-center justify-center gap-1 transition-colors"
                  disabled={isSaving}
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
              {!canRemovePhotos && 'Must have at least 1 photo. '}
              {!canAddMorePhotos && 'Maximum 5 photos reached.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-zinc-800 rounded-md transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-lime-500 hover:bg-lime-600 text-zinc-900 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSaving || !name.trim() || totalPhotos === 0}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
