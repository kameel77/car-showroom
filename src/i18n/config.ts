export type Locale = 'pl' | 'en' | 'de';

export const locales: Locale[] = ['pl', 'en', 'de'];
export const defaultLocale: Locale = 'pl';

export const localeNames: Record<Locale, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
};
