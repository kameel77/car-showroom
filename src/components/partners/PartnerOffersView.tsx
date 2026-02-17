'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { PartnerPublicOffer } from '@/types/partners';
import { PartnerListingCard } from './PartnerListingCard';

interface Props {
  offers: PartnerPublicOffer[];
  partnerSlug: string;
  locale: string;
}

export function PartnerOffersView({ offers, partnerSlug, locale }: Props) {
  const [view, setView] = useState<'spec' | 'arbitrage'>('spec');

  const rankedOffers = useMemo(() => {
    return [...offers]
      .map((offer) => {
        const marginValue = Number(offer.display_price || 0) - Number(offer.price || 0);
        const marginPercent = offer.price > 0 ? (marginValue / offer.price) * 100 : 0;
        return { offer, marginValue, marginPercent };
      })
      .sort((a, b) => b.marginPercent - a.marginPercent);
  }, [offers]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">Widok listy ofert</p>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setView('spec')} className={`px-4 py-2 text-sm font-medium ${view === 'spec' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            Specyfikacja
          </button>
          <button onClick={() => setView('arbitrage')} className={`px-4 py-2 text-sm font-medium border-l border-gray-200 ${view === 'arbitrage' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            Arbitraż
          </button>
        </div>
      </div>

      {view === 'spec' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {offers.map((offer, index) => (
            <PartnerListingCard key={offer.offer_id} offer={offer} partnerSlug={partnerSlug} locale={locale} index={index} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-700">
            Widok Arbitraż: ranking po marży i metryki biznesowe (bez parametrów technicznych).
          </div>
          <div className="divide-y divide-gray-200">
            {rankedOffers.map(({ offer, marginValue, marginPercent }, index) => (
              <div key={offer.offer_id} className="grid grid-cols-12 gap-2 p-4 items-center text-sm">
                <div className="col-span-1 font-semibold text-gray-500">#{index + 1}</div>
                <div className="col-span-4 font-medium text-gray-900">{offer.brand} {offer.model}</div>
                <div className="col-span-2 text-right text-gray-600">Zakup: {Math.round(offer.price).toLocaleString()} PLN</div>
                <div className="col-span-2 text-right text-gray-900">Cena: {Math.round(offer.display_price).toLocaleString()} PLN</div>
                <div className={`col-span-2 text-right font-semibold ${marginValue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {marginPercent.toFixed(2)}%
                </div>
                <Link href={`/${locale}/${partnerSlug}/offer/${offer.offer_id}`} className="col-span-1 text-right text-blue-600 hover:text-blue-800">Szczegóły</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
