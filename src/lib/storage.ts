import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export type UploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 1024 * 1024; // 1 MB — лого должен быть лёгким

/**
 * Загружает изображение в Supabase Storage.
 * Возвращает public URL или ошибку.
 *
 * Bucket-ы (создать через Supabase Dashboard → Storage):
 *   - team-logos (public)
 *   - user-avatars (public)
 */
export async function uploadImage(
  bucket: "team-logos" | "user-avatars",
  ownerId: string,
  file: File
): Promise<UploadResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "Supabase Storage не настроен (SUPABASE_URL/SERVICE_ROLE_KEY)" };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Только PNG / JPEG / WebP / GIF" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `Файл слишком большой (${(file.size / 1024).toFixed(0)} КБ). Максимум 1 МБ` };
  }

  // Уникальное имя: ownerId + timestamp + расширение
  const ext = file.type.split("/")[1] || "png";
  const path = `${ownerId}/${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "31536000", // 1 год
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: publicData } = client.storage.from(bucket).getPublicUrl(path);
  return { ok: true, publicUrl: publicData.publicUrl };
}

/**
 * Удаляет изображение из bucket по public URL.
 */
export async function deleteImage(
  bucket: "team-logos" | "user-avatars",
  publicUrl: string
) {
  const client = getClient();
  if (!client) return;
  // Извлекаем path из публичного URL
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await client.storage.from(bucket).remove([path]);
}
