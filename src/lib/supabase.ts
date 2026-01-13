import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available (prevents build errors)
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Dummy client for build time - will be replaced at runtime
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };

// Storage operations - upload image and return public URL
export async function uploadImageToStorage(
  base64Data: string,
  conversationId: string,
  imageId: string
): Promise<string> {
  // Extract base64 data and mime type
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid base64 data URL');
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.split('/')[1] || 'png';
  const fileName = `${conversationId}/${imageId}.${extension}`;

  // Convert base64 to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to Supabase Storage with CDN cache headers
  const { data, error } = await supabase.storage
    .from('generated-images')
    .upload(fileName, bytes, {
      contentType: mimeType,
      upsert: true,
      cacheControl: '31536000', // 1 year cache (immutable content)
    });

  if (error) {
    console.error('Storage upload error:', error);
    // Fall back to base64 if storage fails
    return base64Data;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generated-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// Upload video to storage
export async function uploadVideoToStorage(
  base64Data: string,
  conversationId: string,
  videoId: string
): Promise<string> {
  // Extract base64 data and mime type
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    // Not base64, might be a URL already
    return base64Data;
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.split('/')[1] || 'mp4';
  const fileName = `${conversationId}/${videoId}.${extension}`;

  // Convert base64 to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to Supabase Storage with CDN cache headers
  const { data, error } = await supabase.storage
    .from('generated-videos')
    .upload(fileName, bytes, {
      contentType: mimeType,
      upsert: true,
      cacheControl: '31536000', // 1 year cache (immutable content)
    });

  if (error) {
    console.error('Video storage upload error:', error);
    // Fall back to original data if storage fails
    return base64Data;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generated-videos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// Database operations
export async function createConversation(title?: string) {
  const { data, error } = await supabase
    .from('image_conversations')
    .insert({ title: title || 'New Conversation' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversations() {
  const { data, error } = await supabase
    .from('image_conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data || [];
}

export async function getConversation(id: string) {
  // Fetch conversation details
  const { data: conversation, error: convError } = await supabase
    .from('image_conversations')
    .select('id, title, created_at, updated_at')
    .eq('id', id)
    .single();

  if (convError) throw convError;

  // Fetch images metadata only (NO image_url - that's loaded on demand, but include blurhash for placeholders)
  const { data: images, error: imgError } = await supabase
    .from('generated_images')
    .select('id, message_id, conversation_id, prompt, revised_prompt, model, created_at, blurhash')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (imgError) throw imgError;

  // Fetch videos metadata only (NO video_url - that's loaded on demand)
  const { data: videos, error: vidError } = await supabase
    .from('generated_videos')
    .select('id, message_id, conversation_id, prompt, model, duration, aspect_ratio, camera_movement, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (vidError) throw vidError;

  // Create pseudo-messages from images and videos for the UI
  const messages = [
    ...(images || []).map((img: any) => ({
      id: img.message_id || img.id,
      images: [img],
      videos: [],
    })),
    ...(videos || []).map((vid: any) => ({
      id: vid.message_id || vid.id,
      images: [],
      videos: [vid],
    })),
  ];

  return { ...conversation, messages };
}

// Load single image data on demand
export async function getImageData(imageId: string) {
  const { data, error } = await supabase
    .from('generated_images')
    .select('id, image_url, blurhash')
    .eq('id', imageId)
    .single();

  if (error) throw error;
  return data;
}

export async function addMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const { data, error } = await supabase
    .from('image_messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single();

  if (error) throw error;

  // Update conversation timestamp
  await supabase
    .from('image_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function saveGeneratedImage(
  messageId: string,
  conversationId: string,
  imageUrl: string,
  prompt: string,
  revisedPrompt?: string,
  model: string = 'nano-banana-pro',
  blurhash?: string
) {
  const { data, error } = await supabase
    .from('generated_images')
    .insert({
      message_id: messageId,
      conversation_id: conversationId,
      image_url: imageUrl,
      prompt,
      revised_prompt: revisedPrompt,
      model,
      blurhash: blurhash || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationImages(conversationId: string) {
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from('image_conversations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateConversationTitle(id: string, title: string) {
  const { error } = await supabase
    .from('image_conversations')
    .update({ title })
    .eq('id', id);

  if (error) throw error;
}

// Video generation database operations
export async function saveGeneratedVideo(
  messageId: string,
  conversationId: string,
  videoUrl: string,
  prompt: string,
  model: string,
  duration: string,
  aspectRatio: string,
  cameraMovement?: string,
  startFrameUrl?: string,
  endFrameUrl?: string
) {
  const { data, error } = await supabase
    .from('generated_videos')
    .insert({
      message_id: messageId,
      conversation_id: conversationId,
      video_url: videoUrl,
      prompt,
      model,
      duration,
      aspect_ratio: aspectRatio,
      camera_movement: cameraMovement,
      start_frame_url: startFrameUrl,
      end_frame_url: endFrameUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getVideoData(videoId: string) {
  const { data, error } = await supabase
    .from('generated_videos')
    .select('id, video_url, prompt, model, duration, aspect_ratio, camera_movement, start_frame_url, end_frame_url')
    .eq('id', videoId)
    .single();

  if (error) throw error;
  return data;
}

export async function getConversationVideos(conversationId: string) {
  const { data, error } = await supabase
    .from('generated_videos')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
// Force rebuild Sat, Jan 10, 2026  8:30:38 PM

// ============================================================================
// Elements API - Organize images by color/theme
// ============================================================================

export interface Element {
  id: string;
  name: string;
  color: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ElementPhoto {
  id: string;
  element_id: string;
  photo_url: string;
  position: number;
  created_at: string;
}

/**
 * Create a new element
 * @param name - Element name
 * @param color - Hex color code (e.g., #FF5733)
 * @param userId - Optional user ID
 * @returns Created element
 */
export async function createElement(
  name: string,
  color: string,
  userId?: string
): Promise<Element> {
  const { data, error } = await supabase
    .from('elements')
    .insert({
      name,
      color,
      user_id: userId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all elements
 * @param userId - Optional user ID filter
 * @returns Array of elements
 */
export async function getElements(userId?: string): Promise<Element[]> {
  let query = supabase
    .from('elements')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a single element by ID
 * @param id - Element ID
 * @returns Element data
 */
export async function getElement(id: string): Promise<Element> {
  const { data, error } = await supabase
    .from('elements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an element
 * @param id - Element ID
 * @param updates - Fields to update
 * @returns Updated element
 */
export async function updateElement(
  id: string,
  updates: Partial<Pick<Element, 'name' | 'color'>>
): Promise<Element> {
  const { data, error } = await supabase
    .from('elements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an element (cascades to photos)
 * @param id - Element ID
 */
export async function deleteElement(id: string): Promise<void> {
  const { error } = await supabase
    .from('elements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Add a photo to an element
 * @param elementId - Element ID
 * @param photoUrl - Photo URL
 * @param position - Optional position (defaults to end)
 * @returns Created element photo
 */
export async function addPhotoToElement(
  elementId: string,
  photoUrl: string,
  position?: number
): Promise<ElementPhoto> {
  // If position not provided, get max position + 1
  let finalPosition = position;
  if (finalPosition === undefined) {
    const { data: photos } = await supabase
      .from('element_photos')
      .select('position')
      .eq('element_id', elementId)
      .order('position', { ascending: false })
      .limit(1);

    finalPosition = photos && photos.length > 0 ? photos[0].position + 1 : 0;
  }

  const { data, error } = await supabase
    .from('element_photos')
    .insert({
      element_id: elementId,
      photo_url: photoUrl,
      position: finalPosition,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all photos for an element
 * @param elementId - Element ID
 * @returns Array of element photos
 */
export async function getElementPhotos(elementId: string): Promise<ElementPhoto[]> {
  const { data, error } = await supabase
    .from('element_photos')
    .select('*')
    .eq('element_id', elementId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Remove a photo from an element
 * @param photoId - Element photo ID
 */
export async function removePhotoFromElement(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('element_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
}

/**
 * Update photo position within an element
 * @param photoId - Element photo ID
 * @param newPosition - New position
 * @returns Updated element photo
 */
export async function updatePhotoPosition(
  photoId: string,
  newPosition: number
): Promise<ElementPhoto> {
  const { data, error } = await supabase
    .from('element_photos')
    .update({ position: newPosition })
    .eq('id', photoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
