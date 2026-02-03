'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MapPin, Calendar, Gauge, Fuel, Settings2, Zap, ArrowRight } from 'lucide-react';
import { PartnerPublicOffer } from '@/types/partners';
import { useAppSettings } from '@/hooks/useAppSettings';
import { formatPrice, calculateNetPrice, formatPriceWithVat } from '@/lib/price-calculator';
import Image from 'next/image';

interface PartnerListingCardProps {
  offer: PartnerPublicOffer;
  partnerSlug: string;
  locale: string;
  index?: number;
}

export function PartnerListingCard({ offer, partnerSlug, locale, index = 0 }: PartnerListingCardProps) {
  const t = useTranslations('listing');
  const { settings } = useAppSettings();

  const formatMileage = (mileage: number | null | undefined) => {
    if (!mileage) return '-';
    return mileage.toLocaleString(locale);
  };

  return (
    <div
      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <Link href={`/${locale}/${partnerSlug}/offer/${offer.offer_id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          {offer.main_photo_url ? (
            <Image
              src={offer.main_photo_url}
              alt={`${offer.brand} ${offer.model}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400">No image</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Price Badge - Shows partner price (net or gross based on setting) */}
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-md">
            <span className="text-lg font-bold text-blue-600">
              {offer.show_net_prices && offer.display_price_net 
                ? formatPrice(offer.display_price_net)
                : formatPrice(offer.display_price)}
            </span>
            {offer.show_net_prices && (
              <div className="text-xs text-gray-500">netto</div>
            )}
            {settings?.show_eur_prices && settings?.exchange_rate_eur && (
              <div className="text-xs text-gray-500">
                ≈ {Math.round((offer.show_net_prices && offer.display_price_net ? offer.display_price_net : offer.display_price) / settings.exchange_rate_eur).toLocaleString()} €
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {offer.brand} {offer.model}
            </h3>
            {offer.model_version && offer.model_version !== 'Brak' && (
              <p className="text-sm text-gray-500 line-clamp-1">
                {offer.model_version}
              </p>
            )}
          </div>

          {/* Specs Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>{offer.year || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Gauge className="h-3.5 w-3.5" />
              <span>{formatMileage(offer.mileage)} {t('km')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Fuel className="h-3.5 w-3.5" />
              <span className="capitalize">{offer.fuel_type || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="capitalize">{offer.transmission || '-'}</span>
            </div>
          </div>

          {/* Power */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              <span>{offer.engine_power || '-'}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* CTA */}
      <div className="px-4 pb-4">
        <Link
          href={`/${locale}/${partnerSlug}/offer/${offer.offer_id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-600 hover:text-white transition-colors group/btn"
        >
          {t('viewOffer')}
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

export function PartnerListingCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex justify-between pt-2">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
