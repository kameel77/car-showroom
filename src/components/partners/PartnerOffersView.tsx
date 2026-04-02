import React from 'react';
import { PartnerPublicOffer } from '@/types/partners';
import { PartnerListingCard } from './PartnerListingCard';

interface Props {
  offers: PartnerPublicOffer[];
  partnerSlug: string;
  locale: string;
}

export function PartnerOffersView({ offers, partnerSlug, locale }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {offers.map((offer, index) => (
        <PartnerListingCard key={offer.offer_id} offer={offer} partnerSlug={partnerSlug} locale={locale} index={index} />
      ))}
    </div>
  );
}
