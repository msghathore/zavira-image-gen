import { MentionableElement, ParsedMention } from '@/components/MentionInput';

/**
 * Extract element references from mentions and prepare them for API
 */
export function extractElementReferences(mentions: ParsedMention[]): {
  elementIds: string[];
  elementImages: string[];
  elementNames: string[];
} {
  const elementIds: string[] = [];
  const elementImages: string[] = [];
  const elementNames: string[] = [];

  mentions.forEach(mention => {
    elementIds.push(mention.element.id);
    elementNames.push(mention.element.name);

    if (mention.element.imageUrl) {
      elementImages.push(mention.element.imageUrl);
    }
  });

  return {
    elementIds,
    elementImages,
    elementNames,
  };
}

/**
 * Build an enhanced prompt that includes element context
 */
export function buildPromptWithMentions(
  originalPrompt: string,
  mentions: ParsedMention[]
): string {
  if (mentions.length === 0) {
    return originalPrompt;
  }

  // Add element context to the prompt
  const elementDescriptions = mentions.map(mention => {
    const element = mention.element;
    let desc = `"${element.name}"`;

    if (element.type) {
      desc += ` (${element.type})`;
    }

    return desc;
  }).join(', ');

  return `${originalPrompt}\n\nReferenced elements: ${elementDescriptions}`;
}

/**
 * Get unique elements from mentions (deduplicate)
 */
export function getUniqueElements(mentions: ParsedMention[]): MentionableElement[] {
  const seen = new Set<string>();
  const unique: MentionableElement[] = [];

  mentions.forEach(mention => {
    if (!seen.has(mention.element.id)) {
      seen.add(mention.element.id);
      unique.push(mention.element);
    }
  });

  return unique;
}

/**
 * Create mentionable elements from generated images
 * This allows users to reference previously generated images
 */
export function createMentionableFromImages(
  images: Array<{ id: string; url: string; prompt: string }>
): MentionableElement[] {
  return images.map((img, index) => ({
    id: img.id,
    name: generateElementName(img.prompt, index),
    imageUrl: img.url,
    type: 'image',
  }));
}

/**
 * Generate a short, mention-friendly name from a prompt
 */
function generateElementName(prompt: string, index: number): string {
  // Extract first meaningful word or use index
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (words.length > 0) {
    const name = words[0];
    return `${name}${index > 0 ? index + 1 : ''}`;
  }

  return `image${index + 1}`;
}

/**
 * Create mentionable elements from predefined characters/styles
 */
export function createPredefinedElements(): MentionableElement[] {
  // Example predefined elements - replace with actual data
  return [
    {
      id: 'char_mandeep',
      name: 'mandeep',
      imageUrl: '/elements/mandeep.jpg', // Replace with actual URL
      type: 'character',
    },
    {
      id: 'char_sarah',
      name: 'sarah',
      imageUrl: '/elements/sarah.jpg', // Replace with actual URL
      type: 'character',
    },
    {
      id: 'style_cyberpunk',
      name: 'cyberpunk',
      imageUrl: '/elements/cyberpunk-style.jpg', // Replace with actual URL
      type: 'style',
    },
    // Add more predefined elements as needed
  ];
}
