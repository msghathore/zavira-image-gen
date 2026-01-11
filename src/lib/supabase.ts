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
  const { data, error } = await supabase
    .from('image_conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      image_messages (
        id,
        conversation_id,
        role,
        content,
        created_at,
        generated_images (
          id,
          message_id,
          conversation_id,
          image_url,
          prompt,
          revised_prompt,
          model,
          created_at
        ),
        generated_videos (
          id,
          message_id,
          conversation_id,
          video_url,
          prompt,
          model,
          duration,
          aspect_ratio,
          camera_movement,
          created_at
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  // Sort messages by created_at and format with images/videos
  const sortedMessages = (data.image_messages || [])
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((msg: any) => ({
      ...msg,
      images: msg.generated_images || [],
      videos: msg.generated_videos || [],
    }));

  return { ...data, messages: sortedMessages };
}

// Load single image data on demand
export async function getImageData(imageId: string) {
  const { data, error } = await supabase
    .from('generated_images')
    .select('id, image_url')
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
  model: string = 'nano-banana-pro'
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
