'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Percent,
  Car,
  X,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { Partner, PartnerFilter, PartnerOfferWithDetails } from '@/types/partners';
import {
  getPartnerById,
  getPartnerFilters,
  getPartnerOffersWithDetails,
  createPartnerFilter,
  deletePartnerFilter,
  updatePartnerOffer,
} from '@/lib/partners-server';
import { getAllBrandsFromOffers } from '@/lib/filters-server';
import {
  formatPrice,
  formatPricePrecise,
  calculateMarginAmount,
  calculateMarginPercent,
  calculateNetPrice,
  calculateTransportCostPerCarEur,
  calculateTransportCostTotalEur,
  calculateVehicleMarginBreakdown,
  decomposeTransportBundles,
} from '@/lib/price-calculator';
import { useAppSettings } from '@/hooks/useAppSettings';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PartnerOffersPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const { settings } = useAppSettings();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<PartnerOfferWithDetails[]>([]);
  const [filters, setFilters] = useState<PartnerFilter[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [bulkMargin, setBulkMargin] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saleGrossValuesEur, setSaleGrossValuesEur] = useState<Record<string, number>>({});
  const [listView, setListView] = useState<'spec' | 'arbitrage'>('spec');
  const [arbitrageSort, setArbitrageSort] = useState<'margin_eur_desc' | 'margin_pct_desc'>('margin_pct_desc');

  const id = partnerId;
  const isInvalidId = !id || !uuidRegex.test(id);

  useEffect(() => {
    if (isInvalidId) return;
    loadData();
  }, [id, isInvalidId]);

  if (isInvalidId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Nieprawidłowy ID partnera</p>
          <Link
            href={`/${locale}/admin/partners`}
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Wróć do listy
          </Link>
        </div>
      </div>
    );
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [partnerData, offersData, filtersData, brandsData] = await Promise.all([
        getPartnerById(id),
        getPartnerOffersWithDetails(id),
        getPartnerFilters(id),
        getAllBrandsFromOffers(),
      ]);

      if (!partnerData) {
        router.push(`/${locale}/admin/partners`);
        return;
      }

      setPartner(partnerData);
      setOffers(offersData);
      setFilters(filtersData);
      setAvailableBrands(brandsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFilter = async () => {
    if (!selectedBrand) return;

    try {
      await createPartnerFilter({
        partner_id: id,
        brand_name: selectedBrand,
        model_name: selectedModel || undefined,
      });

      // Reload filters and offers
      const [filtersData, offersData] = await Promise.all([
        getPartnerFilters(id),
        getPartnerOffersWithDetails(id),
      ]);

      setFilters(filtersData);
      setOffers(offersData);
      setSelectedBrand('');
      setSelectedModel('');
    } catch (err) {
      alert('Failed to add filter: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteFilter = async (filterId: number) => {
    try {
      await deletePartnerFilter(filterId);

      // Reload filters and offers
      const [filtersData, offersData] = await Promise.all([
        getPartnerFilters(id),
        getPartnerOffersWithDetails(id),
      ]);

      setFilters(filtersData);
      setOffers(offersData);
    } catch (err) {
      alert('Failed to delete filter: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUpdatePrice = async (offerId: string, customPrice: number | undefined) => {
    try {
      setSaving(true);
      await updatePartnerOffer(id, offerId, { custom_price: customPrice ?? null });

      // Update local state with recalculated prices
      setOffers(offers.map(o => {
        if (o.offer_id !== offerId) return o;

        // Recalculate price when custom price is cleared
        let newCalculatedPrice = o.calculated_price;
        if (customPrice === undefined || customPrice === null) {
          // Reset to standard price with partner's default margin
          newCalculatedPrice = Math.round(o.offer.price * (1 + o.margin_percent / 100));
        } else {
          // Use custom price
          newCalculatedPrice = customPrice;
        }

        // Recalculate net price
        const newCalculatedPriceNet = calculateNetPrice(newCalculatedPrice);

        return {
          ...o,
          custom_price: customPrice,
          calculated_price: newCalculatedPrice,
          calculated_price_net: newCalculatedPriceNet
        };
      }));
    } catch (err) {
      alert('Failed to update price: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (offerId: string, isVisible: boolean) => {
    try {
      await updatePartnerOffer(id, offerId, { is_visible: !isVisible });

      // Update local state
      setOffers(offers.map(o =>
        o.offer_id === offerId
          ? { ...o, is_visible: !isVisible }
          : o
      ));
    } catch (err) {
      alert('Failed to update visibility: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleBulkSetMargin = async () => {
    if (selectedOffers.size === 0 || bulkMargin === '') return;

    try {
      setSaving(true);
      const marginPercent = Number(bulkMargin);

      // Update each selected offer
      for (const offerId of selectedOffers) {
        const offer = offers.find(o => o.offer_id === offerId);
        if (offer) {
          const newPrice = Math.round(offer.offer.price * (1 + marginPercent / 100));
          await updatePartnerOffer(id, offerId, { custom_price: newPrice });
        }
      }

      // Reload offers
      const offersData = await getPartnerOffersWithDetails(id);
      setOffers(offersData);
      setSelectedOffers(new Set());
      setBulkMargin('');
    } catch (err) {
      alert('Failed to update prices: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const toggleOfferSelection = (offerId: string) => {
    const newSelected = new Set(selectedOffers);
    if (newSelected.has(offerId)) {
      newSelected.delete(offerId);
    } else {
      newSelected.add(offerId);
    }
    setSelectedOffers(newSelected);
  };

  const selectAllOffers = () => {
    if (selectedOffers.size === filteredOffers.length) {
      setSelectedOffers(new Set());
    } else {
      setSelectedOffers(new Set(filteredOffers.map(o => o.offer_id)));
    }
  };

  // Filter offers based on search
  const filteredOffers = offers.filter(offer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      offer.offer.brand.toLowerCase().includes(query) ||
      offer.offer.model.toLowerCase().includes(query) ||
      offer.offer.model_version?.toLowerCase().includes(query)
    );
  });

  const arbitrageOffers = [...filteredOffers].sort((a, b) => {
    const marginPlnA = calculateMarginAmount(a.offer.price, a.calculated_price);
    const marginPlnB = calculateMarginAmount(b.offer.price, b.calculated_price);
    const marginPctA = calculateMarginPercent(a.offer.price, a.calculated_price);
    const marginPctB = calculateMarginPercent(b.offer.price, b.calculated_price);

    if (arbitrageSort === 'margin_eur_desc') {
      return marginPlnB - marginPlnA;
    }

    return marginPctB - marginPctA;
  });

  const selectedOfferRows = offers.filter((offer) => selectedOffers.has(offer.offer_id));
  const selectedCarsCount = selectedOfferRows.length;
  const exchangeRate = settings?.exchange_rate_eur || 0;
  const transportCostPerCarEur = calculateTransportCostPerCarEur(selectedCarsCount, partner?.transport_cost_tiers_eur);
  const transportCostTotalEur = calculateTransportCostTotalEur(selectedCarsCount, partner?.transport_cost_tiers_eur);
  const transportBundles = decomposeTransportBundles(selectedCarsCount, partner?.transport_cost_tiers_eur);

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
          <Link
            href={`/${locale}/admin/partners`}
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Wróć do listy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/${locale}/admin/partners`}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              Oferty partnera: {partner.company_name}
            </h1>
            <p className="text-gray-600 mt-1">
              Zarządzaj widocznością i cenami ofert • Domyślna marża: {partner.default_margin_percent}%
              {partner.show_net_prices && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Ceny netto (VAT 23%)
                </span>
              )}
            </p>
          </div>
          <Link
            href={`/${locale}/${partner.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <ExternalLink className="h-5 w-5" />
            Zobacz stronę
          </Link>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Filtry marek i modeli</h2>
              <span className="text-sm text-gray-500">
                ({filters.length} filtrów)
              </span>
            </div>
            {showFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {showFilters && (
            <div className="mt-4 space-y-4">
              {/* Existing Filters */}
              {filters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      <span className="font-medium">{filter.brand_name}</span>
                      {filter.model_name && <span>/ {filter.model_name}</span>}
                      <button
                        onClick={() => handleDeleteFilter(filter.id)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Filter */}
              <div className="flex items-end gap-4 pt-4 border-t border-gray-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marka
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">Wybierz markę</option>
                    {availableBrands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand.charAt(0).toUpperCase() + brand.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model (opcjonalnie)
                  </label>
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="np. X5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <button
                  onClick={handleAddFilter}
                  disabled={!selectedBrand}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Dodaj filtr
                </button>
              </div>

              {filters.length === 0 && (
                <p className="text-sm text-gray-500">
                  Brak filtrów - partner widzi wszystkie oferty. Dodaj filtry, aby ograniczyć widoczność.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search and Bulk Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po marce, modelu..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {selectedOffers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Wybrano: {selectedOffers.size}
                </span>
                <input
                  type="number"
                  value={bulkMargin}
                  onChange={(e) => setBulkMargin(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Marża %"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <button
                  onClick={handleBulkSetMargin}
                  disabled={saving || bulkMargin === ''}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Percent className="h-4 w-4" />
                  Ustaw
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Widok ofert</h3>
            <p className="text-sm text-gray-600">Przełącz między pełną specyfikacją a widokiem biznesowym (arbitraż).</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setListView('spec')}
              className={`px-4 py-2 text-sm font-medium ${listView === 'spec' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Specyfikacja
            </button>
            <button
              onClick={() => setListView('arbitrage')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-200 ${listView === 'arbitrage' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Arbitraż
            </button>
          </div>
        </div>

        {selectedCarsCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Kalkulator marży (zaznaczone auta: {selectedCarsCount})</h3>
            <p className="text-sm text-gray-600 mb-4">
              Transport: {formatPricePrecise(transportCostTotalEur, 'EUR')} łącznie ({transportBundles.join(' + ') || '-'}),
              {' '}na auto: {formatPricePrecise(transportCostPerCarEur, 'EUR')}. 
              VAT zakupu PL jest stały i liczony jako 23%. 
              Sprzedaż NL wprowadzaj brutto (VAT 21%) — netto liczy się automatycznie.
            </p>

            {exchangeRate <= 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Brak kursu EUR w ustawieniach — kalkulator wymaga dodatniej wartości exchange_rate_eur.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 text-gray-600">
                      <th className="py-2 pr-4">Pojazd</th>
                      <th className="py-2 pr-4">Koszt zakupu netto PLN</th>
                      <th className="py-2 pr-4">VAT PLN (23%)</th>
                      <th className="py-2 pr-4">Koszt netto EUR</th>
                      <th className="py-2 pr-4">Koszt finansowania EUR</th>
                      <th className="py-2 pr-4">Koszty inne EUR</th>
                      <th className="py-2 pr-4">Koszt transportu EUR</th>
                      <th className="py-2 pr-4">Koszt total EUR</th>
                      <th className="py-2 pr-4">Sprzedaż NL brutto EUR (input)</th>
                      <th className="py-2 pr-4">Sprzedaż NL netto EUR</th>
                      <th className="py-2 pr-4">Marża EUR (netto)</th>
                      <th className="py-2 pr-0">Marża % (od kosztu netto)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOfferRows.map((offer) => {
                      const saleGrossEur = saleGrossValuesEur[offer.offer_id] ?? 0;
                      const margin = calculateVehicleMarginBreakdown({
                        purchaseGrossPln: offer.offer.price,
                        exchangeRatePlnPerEur: exchangeRate,
                        financingCostPercent: partner.financing_cost_percent || 0,
                        additionalCostItems: partner.additional_cost_items || [],
                        transportCostEur: transportCostPerCarEur,
                        saleGrossEur,
                      });

                      return (
                        <tr key={`calc-${offer.offer_id}`} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-2 pr-4 font-medium text-gray-800">{offer.offer.brand} {offer.offer.model}</td>
                          <td className="py-2 pr-4">{formatPricePrecise(margin.purchaseNetPln, 'PLN')}</td>
                          <td className="py-2 pr-4">{formatPricePrecise(margin.vatPln, 'PLN')}</td>
                          <td className="py-2 pr-4">{formatPricePrecise(margin.purchaseNetEur, 'EUR')}</td>
                          <td className="py-2 pr-4">{formatPricePrecise(margin.financingCostEur, 'EUR')}</td>
                          <td className="py-2 pr-4">{formatPricePrecise(margin.additionalCostsEur, 'EUR')}</td>
                          <td className="py-2 pr-4">{formatPricePrecise(margin.transportCostEur, 'EUR')}</td>
                          <td className="py-2 pr-4 font-semibold">{formatPricePrecise(margin.totalCostEur, 'EUR')}</td>
                          <td className="py-2 pr-4">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={saleGrossEur}
                              onChange={(e) => setSaleGrossValuesEur((prev) => ({ ...prev, [offer.offer_id]: Math.max(0, Number(e.target.value || 0)) }))}
                              className="w-32 px-2 py-1 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="py-2 pr-4 font-medium text-gray-800">
                            {formatPricePrecise(margin.saleNetEur, 'EUR')}
                          </td>
                          <td className={`py-2 pr-4 font-semibold ${margin.marginEur >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatPricePrecise(margin.marginEur, 'EUR')}
                          </td>
                          <td className={`py-2 pr-0 font-semibold ${margin.marginPercent >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {margin.marginPercent.toFixed(2)}%
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

        {listView === 'spec' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedOffers.size === filteredOffers.length && filteredOffers.length > 0}
                  onChange={selectAllOffers}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </div>
              <div className={`${settings?.show_eur_prices && settings?.exchange_rate_eur ? 'col-span-3' : 'col-span-4'} flex items-center`}>Pojazd</div>
              <div className="col-span-1 flex items-center justify-end text-right">Cena oryg.</div>
              <div className="col-span-1 flex items-center justify-end text-right">Netto PLN</div>
              {settings?.show_eur_prices && settings?.exchange_rate_eur && (
                <div className="col-span-1 flex items-center justify-end text-right">Netto EUR</div>
              )}
              <div className="col-span-2 flex items-center justify-end text-right">Własna cena</div>
              <div className="col-span-1 flex items-center justify-end text-right">Cena partnera</div>
              <div className="col-span-1 flex items-center justify-center text-center">Widoczność</div>
              <div className="col-span-1 flex items-center justify-center text-center">Akcje</div>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredOffers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Brak ofert dla tego partnera</p>
                </div>
              ) : (
                filteredOffers.map((offer) => (
                  <div key={offer.offer_id} className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 ${!offer.is_visible ? 'opacity-60' : ''}`}>
                    <div className="col-span-1 flex items-center">
                      <input type="checkbox" checked={selectedOffers.has(offer.offer_id)} onChange={() => toggleOfferSelection(offer.offer_id)} className="h-4 w-4 text-blue-600 rounded" />
                    </div>
                    <div className={`${settings?.show_eur_prices && settings?.exchange_rate_eur ? 'col-span-3' : 'col-span-4'} flex items-center gap-3`}>
                      {offer.offer.main_photo_url && <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0"><Image src={offer.offer.main_photo_url} alt={`${offer.offer.brand} ${offer.offer.model}`} fill className="object-cover" /></div>}
                      <div>
                        <p className="font-medium text-gray-900">{offer.offer.brand} {offer.offer.model}</p>
                        <p className="text-sm text-gray-500">{offer.offer.year} • {offer.offer.mileage?.toLocaleString()} km</p>
                      </div>
                    </div>
                    <div className="col-span-1 text-right"><p className="font-medium text-gray-900">{formatPrice(offer.offer.price)}</p></div>
                    <div className="col-span-1 text-right"><p className="font-medium text-gray-700">{formatPrice(offer.calculated_price_net)}</p></div>
                    {settings?.show_eur_prices && settings?.exchange_rate_eur && <div className="col-span-1 text-right"><p className="font-medium text-gray-700">≈ {Math.round(offer.calculated_price_net / settings.exchange_rate_eur).toLocaleString()} €</p></div>}
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input key={offer.custom_price || 'empty'} type="number" defaultValue={offer.custom_price || ''} onBlur={(e) => {
                          const value = e.target.value === '' ? undefined : Number(e.target.value);
                          if (value !== offer.custom_price) handleUpdatePrice(offer.offer_id, value);
                        }} placeholder={offer.show_net_prices ? 'Cena netto' : 'Własna cena'} className="w-full px-2 py-1 text-sm font-medium text-gray-900 border border-gray-400 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder:font-normal placeholder:text-gray-400" />
                        {offer.custom_price && <button onClick={() => handleUpdatePrice(offer.offer_id, undefined)} className="text-gray-500 hover:text-red-600 flex-shrink-0" title="Usuń własną cenę"><X className="h-4 w-4" /></button>}
                      </div>
                    </div>
                    <div className="col-span-1 text-right"><p className="font-bold text-gray-900 leading-tight">{offer.show_net_prices ? formatPrice(offer.calculated_price_net) : formatPrice(offer.calculated_price)}</p></div>
                    <div className="col-span-1 flex items-center justify-center"><button onClick={() => handleToggleVisibility(offer.offer_id, offer.is_visible)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${offer.is_visible ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{offer.is_visible ? <><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Widoczna</span></> : <><EyeOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ukryta</span></>}</button></div>
                    <div className="col-span-1 flex items-center justify-center"><Link href={`/${locale}/${partner.slug}/offer/${offer.offer_id}`} target="_blank" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Pokaż ofertę"><ExternalLink className="h-5 w-5" /></Link></div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-700">Widok Arbitraż: tylko metryki biznesowe (bez specyfikacji technicznej).</p>
              <select value={arbitrageSort} onChange={(e) => setArbitrageSort(e.target.value as 'margin_eur_desc' | 'margin_pct_desc')} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white">
                <option value="margin_pct_desc">Sortuj: marża % malejąco</option>
                <option value="margin_eur_desc">Sortuj: marża PLN malejąco</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-600">
                    <th className="py-2 px-4">#</th>
                    <th className="py-2 px-4">Pojazd</th>
                    <th className="py-2 px-4 text-right">Zakup brutto PLN</th>
                    <th className="py-2 px-4 text-right">Cena partnera PLN</th>
                    <th className="py-2 px-4 text-right">Marża PLN</th>
                    <th className="py-2 px-4 text-right">Marża %</th>
                    <th className="py-2 px-4 text-center">Widoczność</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrageOffers.map((offer, index) => {
                    const marginPln = calculateMarginAmount(offer.offer.price, offer.calculated_price);
                    const marginPct = calculateMarginPercent(offer.offer.price, offer.calculated_price);
                    return (
                      <tr key={`arb-${offer.offer_id}`} className="border-b border-gray-100 last:border-b-0">
                        <td className="py-2 px-4 font-semibold text-gray-500">{index + 1}</td>
                        <td className="py-2 px-4 font-medium text-gray-900">{offer.offer.brand} {offer.offer.model}</td>
                        <td className="py-2 px-4 text-right">{formatPrice(offer.offer.price)}</td>
                        <td className="py-2 px-4 text-right">{formatPrice(offer.calculated_price)}</td>
                        <td className={`py-2 px-4 text-right font-semibold ${marginPln >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatPricePrecise(marginPln, 'PLN')}</td>
                        <td className={`py-2 px-4 text-right font-semibold ${marginPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>{marginPct.toFixed(2)}%</td>
                        <td className="py-2 px-4 text-center">
                          <button onClick={() => handleToggleVisibility(offer.offer_id, offer.is_visible)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${offer.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {offer.is_visible ? 'Widoczna' : 'Ukryta'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <p>
            Widoczne oferty: {offers.filter(o => o.is_visible).length} / {offers.length}
          </p>
          <p>
            Z własną ceną: {offers.filter(o => o.custom_price).length}
          </p>
        </div>
      </div>
    </div>
  );
}
