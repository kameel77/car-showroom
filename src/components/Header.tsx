'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Car, Menu, X, Globe } from 'lucide-react';
import { locales, type Locale } from '@/i18n/config';
import { useAppSettings } from '@/hooks/useAppSettings';
import Image from 'next/image';

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { settings, loading } = useAppSettings();

  const getPathWithNewLocale = (newLocale: Locale): string => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
    return `/${newLocale}${pathWithoutLocale}`;
  };

  const siteName = settings?.site_name || 'CarShowroom';
  const logoUrl = settings?.logo_url;

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            {logoUrl ? (
              <Image 
                src={logoUrl} 
                alt={siteName}
                width={32}
                height={32}
                className="h-8 w-auto"
              />
            ) : (
              <Car className="h-8 w-8 text-blue-600" />
            )}
            <span className="text-xl font-bold text-gray-900">{siteName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Language Switcher - Styled like the image */}
            <div className="flex items-center gap-1">
              <Globe className="h-5 w-5 text-gray-400 mr-2" />
              {locales.map((loc) => (
                <a
                  key={loc}
                  href={getPathWithNewLocale(loc)}
                  className={`px-3 py-1.5 text-base font-medium rounded-lg transition-colors ${
                    locale === loc
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {loc.toUpperCase()}
                </a>
              ))}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <nav className="flex flex-col gap-4">
                {/* Mobile Language Switcher */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Globe className="h-5 w-5 text-gray-400" />
                {locales.map((loc) => (
                  <a
                    key={loc}
                    href={getPathWithNewLocale(loc)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-1.5 text-base font-medium rounded-lg transition-colors ${
                      locale === loc
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {loc.toUpperCase()}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
