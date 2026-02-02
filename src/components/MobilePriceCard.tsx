'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useAppSettings } from '@/hooks/useAppSettings';
import { CarOffer } from '@/types/car';

interface MobilePriceCardProps {
  offer: CarOffer;
}

export function MobilePriceCard({ offer }: MobilePriceCardProps) {
  const t = useTranslations();
  const { settings, getDualPrice } = useAppSettings();

  if (!settings) return null;

  const prices = getDualPrice(offer.price);

  return (
    <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {offer.brand} {offer.model} {offer.model_version && offer.model_version !== 'Brak' ? offer.model_version : ''}
      </h1>
      <div className="mt-2 space-y-1">
        <span className="text-3xl font-bold text-blue-600">
          {prices.pln}
        </span>
        {prices.eur && settings.show_eur_prices && (
          <div className="text-lg text-gray-500">
            ≈ {prices.eur}
          </div>
        )}
      </div>
    </div>
  );
}
