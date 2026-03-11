'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  Car,
  X,
  Search,
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  Image as ImageIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Partner, PartnerOfferWithDetails } from '@/types/partners';
import {
  getPartnerOffersBySlug,
  updatePartnerOffer,
  updateCarPhotos,
} from '@/lib/partners-server';
import { PhotoManagerModal } from '@/components/cars/PhotoManagerModal';
import {
  formatPrice,
  formatPricePrecise,
  calculateNetPrice,
  calculateTransportCostPerCarEur,
  calculateTransportCostTotalEur,
  calculateVehicleMarginBreakdown,
  decomposeTransportBundles,
  NL_SALE_VAT_RATE,
} from '@/lib/price-calculator';
import { useAppSettings } from '@/hooks/useAppSettings';

function PriceInputs({
  initialCustomPricePln,
  exchangeRate,
  onSave,
}: {
  initialCustomPricePln: number | null;
  exchangeRate: number;
  onSave: (pln: number | undefined) => void;
}) {
  const [eur, setEur] = useState<string>(
    initialCustomPricePln && exchangeRate > 0
      ? String(Math.round(initialCustomPricePln / exchangeRate))
      : ''
  );
  const [pln, setPln] = useState<string>(
    initialCustomPricePln != null ? String(initialCustomPricePln) : ''
  );

  useEffect(() => {
    setPln(initialCustomPricePln != null ? String(initialCustomPricePln) : '');
    setEur(
      initialCustomPricePln != null && exchangeRate > 0
        ? String(Math.round(initialCustomPricePln / exchangeRate))
        : ''
    );
  }, [initialCustomPricePln, exchangeRate]);

  const handleEurBlur = () => {
    const parsedEur = Number(eur);
    if (!eur || isNaN(parsedEur) || parsedEur <= 0) {
      if (initialCustomPricePln != null) onSave(undefined);
      setPln('');
      return;
    }
    const newPln = Math.round(parsedEur * exchangeRate);
    setPln(String(newPln));
    if (newPln !== initialCustomPricePln) {
      onSave(newPln);
    }
  };

  const handlePlnBlur = () => {
    const parsedPln = Number(pln);
    if (!pln || isNaN(parsedPln) || parsedPln <= 0) {
      if (initialCustomPricePln != null) onSave(undefined);
      setEur('');
      return;
    }
    if (exchangeRate > 0) {
      setEur(String(Math.round(parsedPln / exchangeRate)));
    }
    if (parsedPln !== initialCustomPricePln) {
      onSave(parsedPln);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="flex flex-col items-end">
        <span className="text-[10px] text-gray-500 uppercase">Cena EUR Brutto</span>
        <input
          type="number"
          value={eur}
          onChange={(e) => setEur(e.target.value)}
          onBlur={handleEurBlur}
          placeholder="EUR"
          className="w-24 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 bg-white text-right font-medium"
        />
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] text-gray-500 uppercase">Cena PLN Brutto</span>
        <input
          type="number"
          value={pln}
          onChange={(e) => setPln(e.target.value)}
          onBlur={handlePlnBlur}
          placeholder="PLN"
          className="w-24 px-2 py-1 text-sm text-gray-900 border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 bg-white text-right font-bold text-blue-700"
        />
      </div>
      {initialCustomPricePln != null && (
        <button
          onClick={() => {
            setEur('');
            setPln('');
            onSave(undefined);
          }}
          className="text-gray-400 hover:text-red-500 flex-shrink-0 mt-4"
          title="Usuń własną cenę"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function PartnerSelfAdminPage() {
  const locale = useLocale();
  const t = useTranslations('adminSelf');
  const params = useParams();
  const partnerSlug = params.partner as string;
  const { settings } = useAppSettings();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<PartnerOfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [listView, setListView] = useState<'spec' | 'arbitrage'>('spec');
  const [arbitrageSort, setArbitrageSort] = useState<'margin_eur_desc' | 'margin_pct_desc'>('margin_pct_desc');
  const [transportBatchSize, setTransportBatchSize] = useState<number>(1);
  const [photoModalOfferId, setPhotoModalOfferId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [partnerSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { partner: partnerData, offers: offersData } = await getPartnerOffersBySlug(partnerSlug);
      setPartner(partnerData);
      setOffers(offersData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (offerId: string, customPricePln: number | undefined) => {
    if (!partner) return;
    try {
      setSaving(true);
      await updatePartnerOffer(partner.id, offerId, { custom_price: customPricePln ?? null });

      setOffers(prev => prev.map(o => {
        if (o.offer_id !== offerId) return o;

        let newCalculatedPrice: number;
        if (customPricePln === undefined || customPricePln === null) {
          newCalculatedPrice = Math.round(o.offer.price * (1 + o.margin_percent / 100));
        } else {
          newCalculatedPrice = customPricePln;
        }

        return {
          ...o,
          custom_price: customPricePln ?? null,
          calculated_price: newCalculatedPrice,
          calculated_price_net: calculateNetPrice(newCalculatedPrice),
        };
      }));
    } catch (err) {
      alert('Błąd zapisu: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhotos = async (offerId: string, additionalPhotos: string[]) => {
    await updateCarPhotos(offerId, additionalPhotos);
    // update local state
    setOffers(offers.map(o => {
      if (o.offer_id === offerId) {
        return {
          ...o,
          offer: {
            ...o.offer,
            additional_photos: additionalPhotos,
          }
        };
      }
      return o;
    }));
  };

  const filteredOffers = offers.filter(offer => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      offer.offer.brand.toLowerCase().includes(q) ||
      offer.offer.model.toLowerCase().includes(q) ||
      offer.offer.model_version?.toLowerCase().includes(q)
    );
  });

  const arbitrageOffers = [...filteredOffers].sort((a, b) => {
    const rateLocal = settings?.exchange_rate_eur || 1;
    const saleA = a.custom_price != null ? a.custom_price : a.calculated_price / rateLocal;
    const saleB = b.custom_price != null ? b.custom_price : b.calculated_price / rateLocal;
    const costA = calculateVehicleMarginBreakdown({
      purchaseGrossPln: a.offer.price,
      exchangeRatePlnPerEur: rateLocal,
      financingCostPercent: partner?.financing_cost_percent || 0,
      additionalCostItems: partner?.additional_cost_items || [],
      transportCostEur: calculateTransportCostPerCarEur(transportBatchSize, partner?.transport_cost_tiers_eur),
      saleGrossEur: saleA,
    });
    const costB = calculateVehicleMarginBreakdown({
      purchaseGrossPln: b.offer.price,
      exchangeRatePlnPerEur: rateLocal,
      financingCostPercent: partner?.financing_cost_percent || 0,
      additionalCostItems: partner?.additional_cost_items || [],
      transportCostEur: calculateTransportCostPerCarEur(transportBatchSize, partner?.transport_cost_tiers_eur),
      saleGrossEur: saleB,
    });
    if (arbitrageSort === 'margin_eur_desc') return costB.marginEur - costA.marginEur;
    return costB.marginPercent - costA.marginPercent;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Partner not found'}</p>
        </div>
      </div>
    );
  }

  const exchangeRate = settings?.exchange_rate_eur || 0;
  const transportCostPerCarEur = calculateTransportCostPerCarEur(transportBatchSize, partner.transport_cost_tiers_eur);
  const transportCostTotalEur = calculateTransportCostTotalEur(transportBatchSize, partner.transport_cost_tiers_eur);
  const transportBundles = decomposeTransportBundles(transportBatchSize, partner.transport_cost_tiers_eur);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{partner.company_name} — {t('title')}</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href={`/${locale}/${partnerSlug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            {t('previewShowroom')}
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('viewToggle.title')}</h3>
            <p className="text-sm text-gray-500">{t('viewToggle.subtitle')}</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setListView('spec')}
              className={`px-4 py-2 text-sm font-medium ${listView === 'spec' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {t('viewToggle.spec')}
            </button>
            <button
              onClick={() => setListView('arbitrage')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-200 ${listView === 'arbitrage' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {t('viewToggle.arbitrage')}
            </button>
          </div>
        </div>

        {/* SPEC VIEW */}
        {listView === 'spec' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-4 flex items-center">{t('table.vehicle')}</div>
              <div className="col-span-1 flex items-center justify-end text-right">{t('table.plnGross')}</div>
              <div className="col-span-1 flex items-center justify-end text-right">{t('table.plnNet')}</div>
              <div className="col-span-1 flex items-center justify-end text-right">{t('table.eurNet')}</div>
              <div className="col-span-3 flex items-center justify-end text-right">{t('table.eurGrossInput')} / WŁASNA CENA PLN</div>
              <div className="col-span-1 flex items-center justify-end text-right font-bold text-gray-700">{t('table.eurGrossResult')}</div>
              <div className="col-span-1 flex items-center justify-center text-center"></div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredOffers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('table.noOffers')}</p>
                </div>
              ) : (
                filteredOffers.map((offer) => {
                  const netPln = calculateNetPrice(offer.offer.price);
                  const netEur = exchangeRate > 0 ? netPln / exchangeRate : 0;
                  const grossEur = exchangeRate > 0 ? (offer.custom_price || offer.calculated_price) / exchangeRate : 0;

                  return (
                    <div key={offer.offer_id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50">
                      {/* Pojazd */}
                      <div className="col-span-4 flex items-center gap-3">
                        {offer.offer.main_photo_url && (
                          <div className="relative w-14 h-10 rounded-md overflow-hidden flex-shrink-0">
                            <Image src={offer.offer.main_photo_url} alt={`${offer.offer.brand} ${offer.offer.model}`} fill className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{offer.offer.brand} {offer.offer.model}</p>
                          <p className="text-xs text-gray-500">
                            {offer.offer.year} • {offer.offer.mileage?.toLocaleString()} km
                            {offer.offer.fuel_type && <> • {offer.offer.fuel_type}</>}
                            {offer.offer.transmission && <> • {offer.offer.transmission}</>}
                          </p>
                        </div>
                      </div>

                      {/* PLN brutto (cena oryginalna) */}
                      <div className="col-span-1 text-right">
                        <p className="text-sm text-gray-700">{formatPrice(offer.offer.price)}</p>
                      </div>

                      {/* Netto PLN */}
                      <div className="col-span-1 text-right">
                        <p className="text-sm text-gray-700">{formatPrice(netPln)}</p>
                      </div>

                      {/* Netto EUR */}
                      <div className="col-span-1 text-right">
                        <p className="text-sm text-gray-700">
                          {exchangeRate > 0 ? `${netEur.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} €` : '—'}
                        </p>
                      </div>

                      {/* Inputs: EUR & PLN */}
                      <div className="col-span-3">
                        <PriceInputs
                          initialCustomPricePln={offer.custom_price ?? null}
                          exchangeRate={exchangeRate}
                          onSave={(pln) => handleUpdatePrice(offer.offer_id, pln)}
                        />
                      </div>

                      {/* EUR brutto wynikowe */}
                      <div className="col-span-1 text-right">
                        <p className="font-bold text-gray-900 text-sm">
                          {grossEur > 0 ? `${grossEur.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} €` : '—'}
                        </p>
                        {partner.show_net_prices && grossEur > 0 && (
                          <p className="text-xs text-gray-500">
                            netto: {(grossEur / (1 + NL_SALE_VAT_RATE / 100)).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} €
                          </p>
                        )}
                      </div>

                      {/* Link & Photos */}
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPhotoModalOfferId(offer.offer_id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                          title="Zarządzaj zdjęciami"
                        >
                          <ImageIcon className="h-4 w-4" />
                          {offer.offer.additional_photos && offer.offer.additional_photos.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>
                          )}
                        </button>
                        <Link
                          href={`/${locale}/${partner.slug}/offer/${offer.offer_id}`}
                          target="_blank"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('table.showOffer')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ARBITRAGE VIEW */}
        {listView === 'arbitrage' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{t('arbitrageHeader.title')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('arbitrageHeader.exchangeRate')}: {exchangeRate ? exchangeRate.toFixed(4) : '-'} •
                  {t('arbitrageHeader.transportFor')}:{' '}
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={transportBatchSize}
                    onChange={(e) => setTransportBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="inline-block w-16 px-1 py-0.5 border border-gray-300 rounded text-xs mx-1 text-gray-900 bg-white"
                  /> {t('arbitrageHeader.cars')}
                  {transportCostTotalEur > 0 && (
                    <span className="ml-2">
                      ({formatPricePrecise(transportCostTotalEur, 'EUR')} {t('arbitrageHeader.total')},
                      {' '}{formatPricePrecise(transportCostPerCarEur, 'EUR')}/{t('arbitrageHeader.perCar')},
                      {' '}{t('arbitrageHeader.bundle')}: {transportBundles.join(' + ')})
                    </span>
                  )}
                </p>
              </div>
              <select
                value={arbitrageSort}
                onChange={(e) => setArbitrageSort(e.target.value as 'margin_eur_desc' | 'margin_pct_desc')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
              >
                <option value="margin_pct_desc">{t('arbitrageHeader.sort.marginPctDesc')}</option>
                <option value="margin_eur_desc">{t('arbitrageHeader.sort.marginEurDesc')}</option>
              </select>
            </div>

            {!exchangeRate ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p>Brak skonfigurowanego kursu EUR.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 text-gray-600 bg-gray-50/50">
                      <th className="py-2 px-4 whitespace-nowrap">#</th>
                      <th className="py-2 px-4 whitespace-nowrap">{t('table.vehicle')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">{t('table.purchaseNetEur')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">{t('table.financing')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">{t('table.additional')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">{t('table.transport')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-medium text-gray-900">{t('table.totalCost')}</th>
                      <th className="py-2 px-4 text-center whitespace-nowrap text-blue-600">{t('table.eurGrossInput')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-bold text-gray-700">{t('table.eurGrossResult')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">{t('table.saleNetEur')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-bold">{t('table.marginEur')}</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-bold">{t('table.marginPct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arbitrageOffers.map((offer, index) => {
                      const hasCustom = offer.custom_price != null && offer.custom_price > 0;

                      // Calculate initial breakdown to get totalCostEur
                      const baseBreakdown = calculateVehicleMarginBreakdown({
                        purchaseGrossPln: offer.offer.price,
                        exchangeRatePlnPerEur: exchangeRate || 4.3,
                        financingCostPercent: partner.financing_cost_percent || 0,
                        additionalCostItems: partner.additional_cost_items || [],
                        transportCostEur: transportCostPerCarEur,
                        saleGrossEur: 0 // placeholder
                      });

                      const saleCustomPln = offer.custom_price != null
                        ? offer.custom_price
                        : baseBreakdown.totalCostEur * 1.18 * exchangeRate; // fallback logic
                      const saleGrossEur = exchangeRate > 0 ? saleCustomPln / exchangeRate : 0;

                      const breakdown = calculateVehicleMarginBreakdown({
                        purchaseGrossPln: offer.offer.price,
                        exchangeRatePlnPerEur: exchangeRate || 4.3,
                        financingCostPercent: partner.financing_cost_percent || 0,
                        additionalCostItems: partner.additional_cost_items || [],
                        transportCostEur: transportCostPerCarEur,
                        saleGrossEur: saleGrossEur
                      });

                      return (
                        <tr key={offer.offer_id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors text-sm">
                          <td className="py-2 px-4 text-gray-400 font-medium">{index + 1}</td>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-3">
                              {offer.offer.main_photo_url && (
                                <div className="relative w-12 h-8 rounded overflow-hidden flex-shrink-0">
                                  <Image src={offer.offer.main_photo_url} alt="" fill className="object-cover" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate leading-tight">{offer.offer.brand} {offer.offer.model}</p>
                                <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                  {offer.offer.year} • {offer.offer.mileage?.toLocaleString()} km • {offer.offer.fuel_type}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right text-gray-600">{formatPricePrecise(breakdown.purchaseNetEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-gray-600">{formatPricePrecise(breakdown.financingCostEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.additionalCostsEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.transportCostEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right font-medium text-gray-900">{formatPricePrecise(breakdown.totalCostEur, 'EUR')}</td>

                          {/* Input column */}
                          <td className="py-2 px-4">
                            <PriceInputs
                              initialCustomPricePln={offer.custom_price ?? null}
                              exchangeRate={exchangeRate}
                              onSave={(pln) => handleUpdatePrice(offer.offer_id, pln)}
                            />
                          </td>

                          {/* Resulting Sale Price column */}
                          <td className="py-2 px-4 text-right">
                            <span className={`font-bold ${hasCustom ? 'text-blue-700' : 'text-gray-900'}`}>
                              {formatPricePrecise(saleGrossEur, 'EUR')}
                            </span>
                          </td>

                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.saleNetEur, 'EUR')}</td>
                          <td className={`py-2 px-4 text-right font-bold ${breakdown.marginEur >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPricePrecise(breakdown.marginEur, 'EUR')}
                          </td>
                          <td className={`py-2 px-4 text-right font-bold ${breakdown.marginPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {breakdown.marginPercent.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <p>{t('summary.offers')}: {filteredOffers.length} / {offers.length}</p>
          <p>{t('summary.withCustomPrice')}: {offers.filter(o => o.custom_price != null).length}</p>
          {saving && <span className="flex items-center gap-1 text-blue-600"><Loader2 className="h-4 w-4 animate-spin" /> {t('summary.saving')}</span>}
        </div>

        {photoModalOfferId && (
          <PhotoManagerModal
            isOpen={true}
            onClose={() => setPhotoModalOfferId(null)}
            offerId={photoModalOfferId}
            initialPhotos={offers.find(o => o.offer_id === photoModalOfferId)?.offer.additional_photos || []}
            onSave={handleSavePhotos}
          />
        )}
      </div>
    </div>
  );
}
