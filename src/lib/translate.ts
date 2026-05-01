/**
 * Машинный перевод текста для мировых новостей.
 *
 * Приоритет провайдеров (по конфигурации env):
 * 1. DEEPL_API_KEY — DeepL (лучшее качество, 500k символов бесплатно/мес)
 * 2. OPENAI_API_KEY — Anthropic / OpenAI (платный, гибкий)
 * 3. Fallback — возвращаем оригинал.
 */

type Lang = "ru" | "kk" | "en";

const DEEPL_LANG: Record<Lang, string> = {
  ru: "RU",
  kk: "KK", // DeepL поддерживает казахский (но не во всех тарифах)
  en: "EN",
};

export async function translateText(
  text: string,
  targetLang: Lang,
  sourceLang: Lang | "auto" = "auto"
): Promise<string> {
  if (!text || !text.trim()) return text;
  if (sourceLang === targetLang) return text;

  const deeplKey = process.env.DEEPL_API_KEY;
  if (deeplKey) {
    try {
      const params = new URLSearchParams({
        text,
        target_lang: DEEPL_LANG[targetLang],
        ...(sourceLang !== "auto" && { source_lang: DEEPL_LANG[sourceLang] }),
      });
      const isFree = deeplKey.endsWith(":fx");
      const host = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
      const res = await fetch(`${host}/v2/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${deeplKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          translations: Array<{ text: string }>;
        };
        return data.translations[0]?.text ?? text;
      }
    } catch (e) {
      console.warn("DeepL translation failed:", (e as Error).message);
    }
  }

  // Fallback — возвращаем оригинал. На сайте отобразится как есть.
  return text;
}

export async function translateAll(
  source: { title: string; excerpt?: string | null; body: string },
  sourceLang: Lang
): Promise<Record<Lang, { title: string; excerpt: string | null; body: string }>> {
  const targets: Lang[] = ["ru", "kk", "en"];
  const result = {} as Record<Lang, { title: string; excerpt: string | null; body: string }>;

  await Promise.all(
    targets.map(async (lang) => {
      if (lang === sourceLang) {
        result[lang] = {
          title: source.title,
          excerpt: source.excerpt ?? null,
          body: source.body,
        };
        return;
      }
      const [title, excerpt, body] = await Promise.all([
        translateText(source.title, lang, sourceLang),
        source.excerpt ? translateText(source.excerpt, lang, sourceLang) : Promise.resolve(null),
        translateText(source.body, lang, sourceLang),
      ]);
      result[lang] = { title, excerpt, body };
    })
  );

  return result;
}
