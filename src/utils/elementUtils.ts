import { v4 as uuidv4 } from 'uuid';
import { Element, ElementPhoto } from '@/types';

/**
 * Creates a new element with default values
 */
export function createNewElement(name: string = 'New Element', color: string = '#3b82f6'): Element {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    color,
    photos: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Renames an element
 */
export function renameElement(element: Element, newName: string): Element {
  return {
    ...element,
    name: newName,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Changes the color tag of an element
 */
export function changeElementColor(element: Element, newColor: string): Element {
  return {
    ...element,
    color: newColor,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds a photo to an element
 * Returns null if max photos (5) is reached
 */
export function addPhotoToElement(element: Element, photoUrl: string): Element | null {
  if (element.photos.length >= 5) {
    return null; // Max 5 photos per element
  }

  const newPhoto: ElementPhoto = {
    id: uuidv4(),
    url: photoUrl,
  };

  return {
    ...element,
    photos: [...element.photos, newPhoto],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adds multiple photos to an element
 * Returns the updated element or null if adding would exceed limit
 */
export function addPhotosToElement(element: Element, photoUrls: string[]): Element | null {
  const remainingSlots = 5 - element.photos.length;
  if (photoUrls.length > remainingSlots) {
    return null; // Would exceed max photos
  }

  const newPhotos: ElementPhoto[] = photoUrls.map(url => ({
    id: uuidv4(),
    url,
  }));

  return {
    ...element,
    photos: [...element.photos, ...newPhotos],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes a photo from an element by photo ID
 */
export function removePhotoFromElement(element: Element, photoId: string): Element {
  return {
    ...element,
    photos: element.photos.filter(photo => photo.id !== photoId),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes multiple photos from an element by photo IDs
 */
export function removePhotosFromElement(element: Element, photoIds: string[]): Element {
  const photoIdSet = new Set(photoIds);
  return {
    ...element,
    photos: element.photos.filter(photo => !photoIdSet.has(photo.id)),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates element name
 */
export function isValidElementName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 100;
}

/**
 * Validates hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Gets the number of available photo slots for an element
 */
export function getAvailablePhotoSlots(element: Element): number {
  return Math.max(0, 5 - element.photos.length);
}

/**
 * Checks if an element can accept more photos
 */
export function canAddPhotos(element: Element, count: number = 1): boolean {
  return element.photos.length + count <= 5;
}

/**
 * Sorts elements by various criteria
 */
export function sortElements(
  elements: Element[],
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'photoCount',
  order: 'asc' | 'desc' = 'asc'
): Element[] {
  const sorted = [...elements].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'photoCount':
        comparison = a.photos.length - b.photos.length;
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Filters elements by color
 */
export function filterElementsByColor(elements: Element[], color: string): Element[] {
  return elements.filter(element => element.color === color);
}

/**
 * Searches elements by name
 */
export function searchElements(elements: Element[], query: string): Element[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return elements;

  return elements.filter(element =>
    element.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Gets element statistics
 */
export function getElementStats(element: Element) {
  return {
    photoCount: element.photos.length,
    availableSlots: getAvailablePhotoSlots(element),
    isFull: element.photos.length >= 5,
    isEmpty: element.photos.length === 0,
    ageInDays: Math.floor(
      (new Date().getTime() - new Date(element.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    ),
    lastUpdatedInDays: Math.floor(
      (new Date().getTime() - new Date(element.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    ),
  };
}
