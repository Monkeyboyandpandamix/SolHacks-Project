export const SUPPORTED_LANGUAGES = [
  { id: 'en', label: 'English', aliases: ['english'] },
  { id: 'es', label: 'Español', aliases: ['spanish', 'espanol', 'español'] },
  { id: 'zh-CN', label: '中文', aliases: ['chinese', 'mandarin', 'simplified chinese', 'zh-cn'] },
  { id: 'my', label: 'မြန်မာ', aliases: ['myanmar', 'burmese'] },
  { id: 'tl', label: 'Tagalog', aliases: ['tagalog', 'filipino'] },
  { id: 'vi', label: 'Tiếng Việt', aliases: ['vietnamese', 'tieng viet', 'tiếng việt'] },
  { id: 'ar', label: 'العربية', aliases: ['arabic', 'العربية'] },
  { id: 'fr', label: 'Français', aliases: ['french', 'francais', 'français'] },
  { id: 'ko', label: '한국어', aliases: ['korean', '한국어'] },
  { id: 'ru', label: 'Русский', aliases: ['russian', 'русский'] },
  { id: 'fa', label: 'فارسی', aliases: ['farsi', 'persian', 'فارسی'] },
  { id: 'pl', label: 'Polski', aliases: ['polish', 'polski'] },
  { id: 'uk', label: 'Українська', aliases: ['ukrainian', 'українська'] },
  { id: 'am', label: 'አማርኛ', aliases: ['amharic', 'አማርኛ'] },
  { id: 'ja', label: '日本語', aliases: ['japanese', '日本語'] },
  { id: 'tr', label: 'Türkçe', aliases: ['turkish', 'türkçe', 'turkce'] },
  { id: 'de', label: 'Deutsch', aliases: ['german', 'deutsch'] },
] as const;

const LANGUAGE_BY_CODE = new Map(SUPPORTED_LANGUAGES.map((language) => [language.id.toLowerCase(), language]));
const LANGUAGE_BY_ALIAS = new Map(
  SUPPORTED_LANGUAGES.flatMap((language) => [
    [language.label.toLowerCase(), language],
    ...language.aliases.map((alias) => [alias.toLowerCase(), language] as const),
  ]),
);

export function normalizeLanguageCode(value?: string | null): string {
  if (!value) {
    return 'en';
  }

  const normalized = value.trim().toLowerCase();
  return LANGUAGE_BY_CODE.get(normalized)?.id || LANGUAGE_BY_ALIAS.get(normalized)?.id || 'en';
}

export function getLanguageLabel(value?: string | null): string {
  const code = normalizeLanguageCode(value);
  return LANGUAGE_BY_CODE.get(code)?.label || 'English';
}
