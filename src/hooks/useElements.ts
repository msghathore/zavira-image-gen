import { useState, useCallback, useEffect } from 'react';
import { Element } from '@/types';
import {
  createNewElement,
  renameElement,
  changeElementColor,
  addPhotoToElement,
  addPhotosToElement,
  removePhotoFromElement,
  removePhotosFromElement,
  isValidElementName,
  isValidHexColor,
  sortElements,
  filterElementsByColor,
  searchElements,
} from '@/utils/elementUtils';

interface UseElementsOptions {
  storageKey?: string;
  autoSave?: boolean;
}

export function useElements(options: UseElementsOptions = {}) {
  const {
    storageKey = 'elements',
    autoSave = true,
  } = options;

  // Load initial elements from localStorage
  const [elements, setElements] = useState<Element[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load elements from storage:', error);
      return [];
    }
  });

  // Auto-save to localStorage whenever elements change
  useEffect(() => {
    if (!autoSave || typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(elements));
    } catch (error) {
      console.error('Failed to save elements to storage:', error);
    }
  }, [elements, storageKey, autoSave]);

  /**
   * Creates a new element
   */
  const createElement = useCallback((name?: string, color?: string) => {
    const newElement = createNewElement(name, color);
    setElements(prev => [...prev, newElement]);
    return newElement;
  }, []);

  /**
   * Updates an element's name
   */
  const updateElementName = useCallback((elementId: string, newName: string): boolean => {
    if (!isValidElementName(newName)) {
      return false;
    }

    setElements(prev =>
      prev.map(el =>
        el.id === elementId ? renameElement(el, newName) : el
      )
    );
    return true;
  }, []);

  /**
   * Updates an element's color
   */
  const updateElementColor = useCallback((elementId: string, newColor: string): boolean => {
    if (!isValidHexColor(newColor)) {
      return false;
    }

    setElements(prev =>
      prev.map(el =>
        el.id === elementId ? changeElementColor(el, newColor) : el
      )
    );
    return true;
  }, []);

  /**
   * Adds a photo to an element
   */
  const addPhoto = useCallback((elementId: string, photoUrl: string): boolean => {
    let success = false;

    setElements(prev =>
      prev.map(el => {
        if (el.id === elementId) {
          const updated = addPhotoToElement(el, photoUrl);
          if (updated) {
            success = true;
            return updated;
          }
        }
        return el;
      })
    );

    return success;
  }, []);

  /**
   * Adds multiple photos to an element
   */
  const addPhotos = useCallback((elementId: string, photoUrls: string[]): boolean => {
    let success = false;

    setElements(prev =>
      prev.map(el => {
        if (el.id === elementId) {
          const updated = addPhotosToElement(el, photoUrls);
          if (updated) {
            success = true;
            return updated;
          }
        }
        return el;
      })
    );

    return success;
  }, []);

  /**
   * Removes a photo from an element
   */
  const removePhoto = useCallback((elementId: string, photoId: string) => {
    setElements(prev =>
      prev.map(el =>
        el.id === elementId ? removePhotoFromElement(el, photoId) : el
      )
    );
  }, []);

  /**
   * Removes multiple photos from an element
   */
  const removePhotos = useCallback((elementId: string, photoIds: string[]) => {
    setElements(prev =>
      prev.map(el =>
        el.id === elementId ? removePhotosFromElement(el, photoIds) : el
      )
    );
  }, []);

  /**
   * Deletes an element completely
   */
  const deleteElement = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
  }, []);

  /**
   * Deletes multiple elements
   */
  const deleteElements = useCallback((elementIds: string[]) => {
    const idSet = new Set(elementIds);
    setElements(prev => prev.filter(el => !idSet.has(el.id)));
  }, []);

  /**
   * Gets a single element by ID
   */
  const getElement = useCallback((elementId: string): Element | undefined => {
    return elements.find(el => el.id === elementId);
  }, [elements]);

  /**
   * Sorts elements
   */
  const sortElementsBy = useCallback(
    (sortBy: 'name' | 'createdAt' | 'updatedAt' | 'photoCount', order: 'asc' | 'desc' = 'asc') => {
      setElements(prev => sortElements(prev, sortBy, order));
    },
    []
  );

  /**
   * Filters elements by color
   */
  const getElementsByColor = useCallback(
    (color: string): Element[] => {
      return filterElementsByColor(elements, color);
    },
    [elements]
  );

  /**
   * Searches elements by name
   */
  const searchElementsByName = useCallback(
    (query: string): Element[] => {
      return searchElements(elements, query);
    },
    [elements]
  );

  /**
   * Clears all elements
   */
  const clearAllElements = useCallback(() => {
    setElements([]);
  }, []);

  /**
   * Exports elements to JSON
   */
  const exportElements = useCallback((): string => {
    return JSON.stringify(elements, null, 2);
  }, [elements]);

  /**
   * Imports elements from JSON
   */
  const importElements = useCallback((jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        setElements(imported);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import elements:', error);
      return false;
    }
  }, []);

  /**
   * Gets all unique colors used in elements
   */
  const getUniqueColors = useCallback((): string[] => {
    return Array.from(new Set(elements.map(el => el.color)));
  }, [elements]);

  return {
    elements,
    createElement,
    updateElementName,
    updateElementColor,
    addPhoto,
    addPhotos,
    removePhoto,
    removePhotos,
    deleteElement,
    deleteElements,
    getElement,
    sortElementsBy,
    getElementsByColor,
    searchElementsByName,
    clearAllElements,
    exportElements,
    importElements,
    getUniqueColors,
  };
}
