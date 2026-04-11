import { supabase } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadReportPhoto(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('File type not supported. Use JPEG, PNG, or WebP.');
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('report-photos')
    .upload(fileName, file, { contentType: file.type });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage
    .from('report-photos')
    .getPublicUrl(fileName);

  return data.publicUrl;
}
