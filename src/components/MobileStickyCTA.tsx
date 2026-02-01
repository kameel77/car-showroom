'use client';

import { useTranslations } from 'next-intl';
import { useAppSettings } from '@/hooks/useAppSettings';
import { MessageSquare, Phone } from 'lucide-react';
import { CarOffer } from '@/types/car';

interface MobileStickyCTAProps {
  offer: CarOffer;
}

export function MobileStickyCTA({ offer }: MobileStickyCTAProps) {
  const t = useTranslations();
  const { settings } = useAppSettings();

  if (!settings || !settings.show_contact_buttons) return null;

  const contactPhone = settings.contact_phone || '+48 123 456 789';
  const contactEmail = settings.contact_email || 'kontakt@example.com';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <div className="flex gap-3">
        <a
          href={`tel:${contactPhone.replace(/\s/g, '')}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium"
        >
          <Phone className="h-5 w-5" />
          {t('detail.call')}
        </a>
        
        {settings.enable_contact_form && (
          <a 
            href={`mailto:${contactEmail}?subject=Zapytanie o ${offer.brand} ${offer.model}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium"
          >
            <MessageSquare className="h-5 w-5" />
            {t('detail.sendInquiry')}
          </a>
        )}
      </div>
    </div>
  );
}
