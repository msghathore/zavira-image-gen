import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      *,
      generated_images (
        id,
        image_url,
        prompt,
        created_at
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Add latest image to each conversation
  return data?.map(conv => ({
    ...conv,
    latestImage: conv.generated_images?.[0] || null,
  }));
}

export async function getConversation(id: string) {
  const { data, error } = await supabase
    .from('image_conversations')
    .select(`
      *,
      image_messages (
        *,
        generated_images (*)
      )
    `)
    .eq('id', id)
    .order('created_at', { foreignTable: 'image_messages', ascending: true })
    .single();

  if (error) throw error;

  // Format messages with their images
  const messages = data.image_messages?.map((msg: any) => ({
    ...msg,
    images: msg.generated_images || [],
  }));

  return { ...data, messages };
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
