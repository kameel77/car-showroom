'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useAppSettings } from '@/hooks/useAppSettings';
import { MessageSquare, Phone, MapPin } from 'lucide-react';
import { CarOffer } from '@/types/car';

interface OfferSidebarProps {
  offer: CarOffer;
}

export function OfferSidebar({ offer }: OfferSidebarProps) {
  const t = useTranslations();
  const locale = useLocale();
  const { settings, formatPrice, getDualPrice } = useAppSettings();

  if (!settings) return null;

  const prices = getDualPrice(offer.price);
  const contactPhone = settings.contact_phone || '+48 123 456 789';
  const contactEmail = settings.contact_email || 'kontakt@example.com';

  const handleContactClick = () => {
    if (settings.enable_contact_form && contactEmail) {
      window.location.href = `mailto:${contactEmail}?subject=Zapytanie o ${offer.brand} ${offer.model}`;
    }
  };

  const handlePhoneClick = () => {
    window.location.href = `tel:${contactPhone.replace(/\s/g, '')}`;
  };

  const showDealerInfo = settings.show_dealer_info && (offer.seller_name || offer.seller_city);

  return (
    <div className="sticky top-24 space-y-6">
      {/* Price Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">
          {offer.brand} {offer.model} {offer.model_version}
        </h1>
        
        {/* Price Display */}
        <div className="space-y-1">
          <div className="text-3xl font-bold text-blue-600">
            {prices.pln}
          </div>
          {prices.eur && settings.show_eur_prices && (
            <div className="text-lg text-gray-500">
              ≈ {prices.eur}
            </div>
          )}
        </div>

        {/* Contact Buttons */}
        {settings.show_contact_buttons && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            {settings.enable_contact_form && (
              <a 
                href={`mailto:${contactEmail}?subject=Zapytanie o ${offer.brand} ${offer.model}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                {t('detail.askAbout')}
              </a>
            )}
            
            <a
              href={`tel:${contactPhone.replace(/\s/g, '')}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <Phone className="h-5 w-5" />
              {t('detail.call')}
            </a>
          </div>
        )}
      </div>

      {/* Dealer Card */}
      {showDealerInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {t('detail.dealerInfo')}
          </h3>
          <div>
            {settings.show_dealer_name && offer.seller_name && (
              <p className="font-medium text-gray-900">{offer.seller_name}</p>
            )}
            {settings.show_dealer_address && (offer.seller_city || offer.seller_address) && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="h-4 w-4" />
                <span>
                  {offer.seller_address && `${offer.seller_address}, `}
                  {offer.seller_city}
                  {offer.seller_postal_code && ` ${offer.seller_postal_code}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
