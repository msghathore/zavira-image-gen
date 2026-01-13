'use client';

import { useState, useEffect } from 'react';
import { Element, ColorTag } from '@/types/element';
import ElementCard from './ElementCard';
import CreateElementModal from './CreateElementModal';
import EditElementModal from './EditElementModal';

interface ElementsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ElementsPanel({ isOpen, onToggle }: ElementsPanelProps) {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<Element | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load elements from localStorage on mount
  useEffect(() => {
    loadElements();
  }, []);

  const loadElements = () => {
    try {
      const stored = localStorage.getItem('zavira-elements');
      if (stored) {
        const parsed = JSON.parse(stored);
        setElements(parsed);
      }
    } catch (error) {
      console.error('Failed to load elements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveElements = (newElements: Element[]) => {
    try {
      localStorage.setItem('zavira-elements', JSON.stringify(newElements));
      setElements(newElements);
    } catch (error) {
      console.error('Failed to save elements:', error);
    }
  };

  const handleCreateElement = async (
    name: string,
    color: ColorTag,
    photos: File[]
  ) => {
    // Convert files to data URLs
    const photoPromises = photos.map((file) => {
      return new Promise<{ id: string; url: string; added_at: string }>(
        (resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: `photo-${Date.now()}-${Math.random()}`,
              url: e.target?.result as string,
              added_at: new Date().toISOString(),
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
      );
    });

    const elementPhotos = await Promise.all(photoPromises);

    const newElement: Element = {
      id: `element-${Date.now()}`,
      name,
      color,
      photos: elementPhotos,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveElements([...elements, newElement]);
  };

  const handleDeleteElement = (elementId: string) => {
    if (confirm('Delete this element? This cannot be undone.')) {
      const updated = elements.filter((e) => e.id !== elementId);
      saveElements(updated);

      if (selectedElementId === elementId) {
        setSelectedElementId(null);
      }
    }
  };

  const handleUpdateElement = (updatedElement: Element) => {
    const updated = elements.map((e) =>
      e.id === updatedElement.id ? updatedElement : e
    );
    saveElements(updated);
  };


  return (
    <>
      {/* Collapsible sidebar section */}
      <div className="border-b border-zinc-800">
        {/* Section header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-lime-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="font-semibold text-sm">Elements</h3>
            <span className="text-xs text-gray-500">({elements.length})</span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Collapsible content */}
        {isOpen && (
          <div className="p-4 pt-0 space-y-3">
            {/* Create button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-lime-500 rounded-md transition-colors text-sm"
            >
              <svg
                className="w-4 h-4"
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
              Create Element
            </button>

            {/* Elements list */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Loading elements...
              </div>
            ) : elements.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No elements yet.
                <br />
                Create reusable image elements!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {elements.map((element) => (
                  <ElementCard
                    key={element.id}
                    element={element}
                    isActive={selectedElementId === element.id}
                    onClick={() => setSelectedElementId(element.id)}
                    onDelete={() => handleDeleteElement(element.id)}
                    onEdit={() => setEditingElement(element)}
                  />
                ))}
              </div>
            )}

            {/* Usage hint */}
            {elements.length > 0 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Click an element to use it in your generation
              </p>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <CreateElementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateElement}
      />

      {/* Edit modal */}
      <EditElementModal
        isOpen={!!editingElement}
        element={editingElement}
        onClose={() => setEditingElement(null)}
        onSave={handleUpdateElement}
      />
    </>
  );
}
