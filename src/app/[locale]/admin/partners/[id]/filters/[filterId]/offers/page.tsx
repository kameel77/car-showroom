'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
  Image as ImageIcon,
  Download,
  Trash2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import {
  Partner,
  ClientFilter,
  PartnerOfferWithDetails,
  ImportCarScoutResult,
} from '@/types/partners';
import {
  getClientFilters,
  getFilterOffersWithDetails,
  updateFilterOffer,
  bulkUpdateFilterOffers,
  removeOffersFromFilter,
  importCarScoutOffersToFilter,
  updateCarPhotos,
} from '@/lib/partners-server';
import { parseCarScoutCSV } from '@/lib/carscout-import';
import { PhotoManagerModal } from '@/components/cars/PhotoManagerModal';
import {
  formatPrice,
  formatPricePrecise,
  calculateNetPrice,
  calculateTransportCostPerCarEur,
  calculateTransportCostTotalEur,
  calculateVehicleMarginBreakdown,
  decomposeTransportBundles,
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

export default function FilterOffersAdminPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const partnerId = params.id as string;
  const filterId = params.filterId as string;
  const { settings } = useAppSettings();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [filter, setFilter] = useState<ClientFilter | null>(null);
  const [clientFilters, setClientFilters] = useState<ClientFilter[]>([]);
  const [offers, setOffers] = useState<PartnerOfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [bulkMargin, setBulkMargin] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saleGrossValuesEur, setSaleGrossValuesEur] = useState<Record<string, number>>({});
  const [listView, setListView] = useState<'spec' | 'arbitrage'>('spec');
  const [arbitrageSort, setArbitrageSort] = useState<'margin_eur_desc' | 'margin_pct_desc'>('margin_pct_desc');
  const [transportBatchSize, setTransportBatchSize] = useState<number>(1);
  const [photoModalOfferId, setPhotoModalOfferId] = useState<string | null>(null);

  // CSV Import Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert');
  const [skipPlaceholders, setSkipPlaceholders] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportCarScoutResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId || !filterId) return;
    loadData();
  }, [partnerId, filterId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [details, allFilters] = await Promise.all([
        getFilterOffersWithDetails(filterId),
        getClientFilters(partnerId),
      ]);

      setPartner(details.partner);
      setFilter(details.filter);
      setOffers(details.offers);
      setClientFilters(allFilters);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować ofert filtra');
    } finally {
      setLoading(false);
    }
  };

  // Live CSV preview computed whenever csvRawText or skipPlaceholders changes
  const csvPreview = useMemo(() => {
    if (!csvRawText.trim()) return null;
    try {
      const parsed = parseCarScoutCSV(csvRawText);
      const activeItems = skipPlaceholders
        ? parsed.items.filter(item => !item.hasPlaceholderImages)
        : parsed.items;

      const brandCounts: Record<string, number> = {};
      for (const item of activeItems) {
        const key = `${item.payload.brand || ''} ${item.payload.model || ''}`.trim();
        brandCounts[key] = (brandCounts[key] || 0) + 1;
      }

      return {
        totalRows: parsed.totalRows,
        offersToImport: activeItems.length,
        placeholderRowsCount: parsed.placeholderCount,
        skippedPlaceholders: skipPlaceholders ? parsed.placeholderCount : 0,
        errors: parsed.errors,
        brandCounts,
      };
    } catch (e) {
      return {
        totalRows: 0,
        offersToImport: 0,
        placeholderRowsCount: 0,
        skippedPlaceholders: 0,
        errors: [e instanceof Error ? e.message : 'Błąd parsowania pliku CSV'],
        brandCounts: {},
      };
    }
  }, [csvRawText, skipPlaceholders]);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setCsvFileName(file.name);
    setImportResult(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setCsvRawText(content);
      }
    };
    reader.onerror = () => {
      setImportError('Nie udało się odczytać pliku CSV');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleRunImport = async () => {
    if (!csvRawText.trim()) return;
    try {
      setImporting(true);
      setImportError(null);
      const res = await importCarScoutOffersToFilter(filterId, csvRawText, {
        mode: importMode,
        skipPlaceholders,
        filename: csvFileName || undefined,
      });
      setImportResult(res);
      await loadData();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Błąd podczas importu CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleUpdatePrice = async (offerId: string, customPricePln: number | undefined) => {
    try {
      setSaving(true);
      await updateFilterOffer(filterId, offerId, { custom_price: customPricePln ?? null });

      setOffers(offers.map(o => {
        if (o.offer_id !== offerId) return o;

        let newCalculatedPrice: number;
        if (customPricePln === undefined || customPricePln === null) {
          newCalculatedPrice = Math.round(o.offer.price * (1 + o.margin_percent / 100));
        } else {
          newCalculatedPrice = customPricePln;
        }

        const newCalculatedPriceNet = calculateNetPrice(newCalculatedPrice);

        return {
          ...o,
          custom_price: customPricePln ?? null,
          calculated_price: newCalculatedPrice,
          calculated_price_net: newCalculatedPriceNet,
        };
      }));
    } catch (err) {
      alert('Błąd aktualizacji ceny: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (offerId: string, isVisible: boolean) => {
    try {
      await updateFilterOffer(filterId, offerId, { is_visible: !isVisible });
      setOffers(offers.map(o =>
        o.offer_id === offerId ? { ...o, is_visible: !isVisible } : o
      ));
    } catch (err) {
      alert('Błąd zmiany widoczności: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten pojazd z tego filtra?')) return;

    try {
      setSaving(true);
      await removeOffersFromFilter(filterId, [offerId]);
      setOffers(offers.filter(o => o.offer_id !== offerId));

      const newSelected = new Set(selectedOffers);
      newSelected.delete(offerId);
      setSelectedOffers(newSelected);
    } catch (err) {
      alert('Błąd podczas usuwania: ' + (err instanceof Error ? err.message : 'Nieznany błąd'));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSetMargin = async () => {
    if (selectedOffers.size === 0 || bulkMargin === '') return;

    try {
      setSaving(true);
      const marginPercent = Number(bulkMargin);

      for (const offerId of selectedOffers) {
        const offer = offers.find(o => o.offer_id === offerId);
        if (offer) {
          const newPrice = Math.round(offer.offer.price * (1 + marginPercent / 100));
          await updateFilterOffer(filterId, offerId, { custom_price: newPrice });
        }
      }

      await loadData();
      setSelectedOffers(new Set());
      setBulkMargin('');
    } catch (err) {
      alert('Błąd aktualizacji cen: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSetVisibility = async (isVisible: boolean) => {
    if (selectedOffers.size === 0) return;

    try {
      setSaving(true);
      await bulkUpdateFilterOffers(filterId, Array.from(selectedOffers), { is_visible: isVisible });
      await loadData();
      setSelectedOffers(new Set());
    } catch (err) {
      alert('Błąd zmiany widoczności: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOffers.size === 0) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć wybrane pojazdy (${selectedOffers.size}) z tego filtra?`)) return;

    try {
      setSaving(true);
      const offerIds = Array.from(selectedOffers);
      await removeOffersFromFilter(filterId, offerIds);
      setOffers(offers.filter(o => !selectedOffers.has(o.offer_id)));
      setSelectedOffers(new Set());
    } catch (err) {
      alert('Błąd podczas usuwania: ' + (err instanceof Error ? err.message : 'Nieznany błąd'));
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

  const handleSavePhotos = async (offerId: string, mainPhoto: string | null, additionalPhotos: string[]) => {
    await updateCarPhotos(offerId, mainPhoto, additionalPhotos);
    setOffers(offers.map(o => {
      if (o.offer_id === offerId) {
        return {
          ...o,
          offer: {
            ...o.offer,
            main_photo_url: mainPhoto || undefined,
            additional_photos: additionalPhotos,
          },
        };
      }
      return o;
    }));
  };

  const filteredOffers = offers.filter(offer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      offer.offer.brand.toLowerCase().includes(query) ||
      offer.offer.model.toLowerCase().includes(query) ||
      offer.offer.model_version?.toLowerCase().includes(query) ||
      offer.offer.advert_id?.toLowerCase().includes(query)
    );
  });

  const selectAllOffers = () => {
    if (selectedOffers.size === filteredOffers.length) {
      setSelectedOffers(new Set());
    } else {
      setSelectedOffers(new Set(filteredOffers.map(o => o.offer_id)));
    }
  };

  const selectedOfferRows = offers.filter((offer) => selectedOffers.has(offer.offer_id));

  // Lossless 43-column Car-Scout CSV Export
  const handleExportCSV = () => {
    if (selectedOfferRows.length === 0) return;

    const headers = [
      'listing_id', 'listing_url', 'scraped_at', 'make', 'model', 'version', 'vin',
      'price_pln', 'price_display', 'omnibus_lowest_30d_pln', 'omnibus_text',
      'production_year', 'mileage_km', 'fuel_type', 'transmission', 'engine_power_hp',
      'registration_number', 'first_registration_date', 'engine_capacity_cm3', 'drive',
      'body_type', 'doors', 'seats', 'color', 'paint_type', 'dealer_name',
      'dealer_address_line1', 'dealer_address_line2', 'dealer_address_line3',
      'dealer_google_rating', 'dealer_review_count', 'dealer_google_link',
      'contact_phone', 'primary_image_url', 'image_count', 'image_urls',
      'equipment_audio_multimedia', 'equipment_safety', 'equipment_comfort_extras',
      'equipment_other', 'additional_info_header', 'additional_info_content', 'specs_json',
    ];

    const rows: string[] = [headers.join(',')];

    const escapeCSV = (value: string | number | undefined | null) => {
      if (value == null) return '""';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    selectedOfferRows.forEach((po) => {
      const o = po.offer;
      const calculatedPrice = po.calculated_price || o.price || 0;
      const priceDisplay = calculatedPrice ? `${calculatedPrice.toLocaleString('pl-PL')} PLN` : '';
      const technical_spec = o.technical_spec || {};
      const features = o.features || {};

      const primaryImage = o.main_photo_url || '';
      const additionalPhotos = o.additional_photos || [];
      const allPhotos = [primaryImage, ...additionalPhotos].filter(Boolean);
      const imageCount = allPhotos.length;
      const imageUrls = allPhotos.join(' | ');

      const getFeatures = (keys: string[], defaultFallback: unknown) => {
        const result: string[] = [];
        keys.forEach(k => {
          if (Array.isArray(features[k])) result.push(...features[k]);
        });
        if (result.length === 0 && Array.isArray(defaultFallback)) return defaultFallback;
        return result;
      };

      const audio = getFeatures(['Audio i multimedia'], features.technologia || features.equipment_audio_multimedia || []);
      const safety = getFeatures(['Bezpieczeństwo', 'Systemy wspomagania kierowcy'], features.bezpieczenstwo || features.equipment_safety || []);
      const comfort = getFeatures(['Komfort i dodatki', 'Komfort'], features.komfort || features.equipment_comfort_extras || []);
      const other = getFeatures(['Inne', 'Osiągi i tuning', 'Wygląd'], features.wyglad || features.equipment_other || []);

      const rawSpecsJson =
        technical_spec.raw_specs && typeof technical_spec.raw_specs === 'object'
          ? JSON.stringify(technical_spec.raw_specs)
          : JSON.stringify(technical_spec);

      const row = [
        o.advert_id || o.id, // listing_id
        o.advert_url || '', // listing_url
        technical_spec.scraped_at || po.created_at || '', // scraped_at
        o.brand || '', // make
        o.model || '', // model
        o.model_version || '', // version
        technical_spec.vin || '', // vin
        calculatedPrice || '', // price_pln
        priceDisplay, // price_display
        technical_spec.omnibus_lowest_30d_pln ?? '', // omnibus_lowest_30d_pln
        technical_spec.omnibus_text || '', // omnibus_text
        o.year || '', // production_year
        o.mileage || '', // mileage_km
        o.fuel_type || '', // fuel_type
        o.transmission || '', // transmission
        o.engine_power ? String(o.engine_power).replace(/\s*KM$/i, '') : '', // engine_power_hp
        technical_spec.registration_number || '', // registration_number
        technical_spec.first_registration_date || '', // first_registration_date
        technical_spec.engine_capacity_cm3 || technical_spec.engine_capacity || '', // engine_capacity_cm3
        technical_spec.drive || technical_spec.drivetrain || '', // drive
        o.body_type || '', // body_type
        technical_spec.doors ?? '', // doors
        technical_spec.seats ?? '', // seats
        o.color || technical_spec.color || '', // color
        o.colour_type || technical_spec.paint_type || '', // paint_type
        o.seller_name || partner?.company_name || '', // dealer_name
        technical_spec.dealer_address_line1 || o.seller_address || partner?.company_address || '', // dealer_address_line1
        technical_spec.dealer_address_line2 || o.seller_city || '', // dealer_address_line2
        technical_spec.dealer_address_line3 || o.seller_region || '', // dealer_address_line3
        technical_spec.dealer_google_rating || '', // dealer_google_rating
        technical_spec.dealer_review_count || '', // dealer_review_count
        technical_spec.dealer_google_link || '', // dealer_google_link
        technical_spec.contact_phone || partner?.phone || '', // contact_phone
        primaryImage, // primary_image_url
        imageCount || '', // image_count
        imageUrls, // image_urls
        Array.isArray(audio) ? audio.join(' | ') : String(audio), // equipment_audio_multimedia
        Array.isArray(safety) ? safety.join(' | ') : String(safety), // equipment_safety
        Array.isArray(comfort) ? comfort.join(' | ') : String(comfort), // equipment_comfort_extras
        Array.isArray(other) ? other.join(' | ') : String(other), // equipment_other
        technical_spec.additional_info_header || '', // additional_info_header
        o.description || '', // additional_info_content
        rawSpecsJson, // specs_json
      ];

      rows.push(row.map(escapeCSV).join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `car-scout-${partner?.slug || 'partner'}_${filter?.slug || 'filter'}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const effectiveMargin = filter?.margin_percent != null ? Number(filter.margin_percent) : (partner?.default_margin_percent ?? 0);
  const effectiveFinancing = filter?.financing_cost_percent != null ? Number(filter.financing_cost_percent) : (partner?.financing_cost_percent ?? 0);
  const effectiveAdditionalCosts = filter?.additional_cost_items ?? partner?.additional_cost_items ?? [];
  const effectiveTransportTiers = filter?.transport_cost_tiers_eur ?? partner?.transport_cost_tiers_eur;

  const selectedCarsCount = selectedOfferRows.length;
  const exchangeRate = settings?.exchange_rate_eur || 0;
  const transportCostPerCarEur = calculateTransportCostPerCarEur(selectedCarsCount, effectiveTransportTiers);
  const transportCostTotalEur = calculateTransportCostTotalEur(selectedCarsCount, effectiveTransportTiers);
  const transportBundles = decomposeTransportBundles(selectedCarsCount, effectiveTransportTiers);

  const arbitrageOffers = [...filteredOffers].sort((a, b) => {
    const rateLocal = exchangeRate > 0 ? exchangeRate : 4.3;
    const arbTransportCost = calculateTransportCostPerCarEur(transportBatchSize, effectiveTransportTiers);
    const salePlnA = a.custom_price != null ? a.custom_price : a.calculated_price;
    const salePlnB = b.custom_price != null ? b.custom_price : b.calculated_price;

    const costA = calculateVehicleMarginBreakdown({
      purchaseGrossPln: a.offer.price,
      exchangeRatePlnPerEur: rateLocal,
      plVatRate: settings?.pl_vat ?? 23,
      exportVatRate: partner?.export_vat ?? 0,
      financingCostPercent: effectiveFinancing,
      additionalCostItems: effectiveAdditionalCosts,
      transportCostEur: arbTransportCost,
      saleGrossEur: salePlnA / rateLocal,
    });
    const costB = calculateVehicleMarginBreakdown({
      purchaseGrossPln: b.offer.price,
      exchangeRatePlnPerEur: rateLocal,
      plVatRate: settings?.pl_vat ?? 23,
      exportVatRate: partner?.export_vat ?? 0,
      financingCostPercent: effectiveFinancing,
      additionalCostItems: effectiveAdditionalCosts,
      transportCostEur: arbTransportCost,
      saleGrossEur: salePlnB / rateLocal,
    });

    if (arbitrageSort === 'margin_eur_desc') {
      return costB.marginEur - costA.marginEur;
    }
    return costB.marginPercent - costA.marginPercent;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !partner || !filter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Nie znaleziono filtra klienta'}</p>
          <Link
            href={`/${locale}/admin/partners`}
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Wróć do listy klientów
          </Link>
        </div>
      </div>
    );
  }

  const publicShowroomUrl = `/${locale}/${partner.slug}/${filter.slug}`;
  const padminUrl = `/${locale}/${partner.slug}/${filter.slug}/padmin`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Link
              href={`/${locale}/admin/partners`}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-1">
                <span>Klient: <strong className="text-gray-800">{partner.company_name}</strong></span>
                <span>•</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                  /{locale}/{partner.slug}/{filter.slug}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
                <Filter className="h-6 w-6 text-blue-600" />
                Filtr: {filter.name}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Marża dla tego filtra: <strong>{effectiveMargin}%</strong>
                {filter.margin_percent != null && filter.margin_percent !== partner.default_margin_percent && (
                  <span className="ml-1 text-xs text-gray-500">
                    (domyślna klienta: {partner.default_margin_percent}%)
                  </span>
                )}
                {partner.show_net_prices && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Ceny netto (VAT 23%)
                  </span>
                )}
                {filter.last_imported_at && (
                  <span className="ml-3 text-xs text-gray-500">
                    • Ostatni import CSV: {new Date(filter.last_imported_at).toLocaleString('pl-PL')}
                    {filter.last_import_filename ? ` (${filter.last_import_filename})` : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setImportResult(null);
                setImportError(null);
                setImportModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importuj CSV (Car-Scout)
            </button>

            <Link
              href={publicShowroomUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <ExternalLink className="h-4 w-4" />
              Salon filtra
            </Link>

            <Link
              href={padminUrl}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Shield className="h-4 w-4" />
              padmin
            </Link>
          </div>
        </div>

        {/* Client Filters Switcher Bar */}
        {clientFilters.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-6 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2 whitespace-nowrap">
              Filtry klienta:
            </span>
            {clientFilters.map((cf) => {
              const isCurrent = cf.id === filter.id;
              return (
                <Link
                  key={cf.id}
                  href={`/${locale}/admin/partners/${partner.id}/filters/${cf.id}/offers`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cf.name}</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'
                    }`}
                  >
                    {cf.offers_count ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Search and Bulk Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po marce, modelu, wersji lub ID ogłoszenia..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {selectedOffers.size > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Wybrano: {selectedOffers.size}
                </span>

                <div className="flex items-center gap-1 border-r border-gray-300 pr-3 mr-1">
                  <button
                    onClick={() => handleBulkSetVisibility(true)}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50 text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    Pokaż
                  </button>
                  <button
                    onClick={() => handleBulkSetVisibility(false)}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50 text-sm font-medium"
                  >
                    <EyeOff className="h-4 w-4" />
                    Ukryj
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-3 py-1.5 ml-1 bg-white text-gray-700 border border-gray-300 shadow-sm rounded-md hover:bg-gray-50 text-sm font-medium"
                  >
                    <Download className="h-4 w-4" />
                    Eksport CSV
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 ml-1 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Usuń z filtra
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bulkMargin}
                    onChange={(e) => setBulkMargin(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Marża %"
                    className="w-24 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                  />
                  <button
                    onClick={handleBulkSetMargin}
                    disabled={saving || bulkMargin === ''}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                    <Percent className="h-3 w-3" />
                    Ustaw
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Widok ofert ({offers.length})</h3>
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
              VAT zakupu PL liczony wg stawki {settings?.pl_vat ?? 23}%.
              Sprzedaż wprowadzaj brutto (VAT eksportowy wynosi {partner.export_vat ?? 0}%) — netto liczy się automatycznie.
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
                      <th className="py-2 pr-4">Sprzedaż brutto EUR (input)</th>
                      <th className="py-2 pr-4">Sprzedaż netto EUR</th>
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
                        plVatRate: settings?.pl_vat ?? 23,
                        exportVatRate: partner.export_vat ?? 0,
                        financingCostPercent: effectiveFinancing,
                        additionalCostItems: effectiveAdditionalCosts,
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
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
            <div className={`grid ${settings?.show_eur_prices && settings?.exchange_rate_eur ? 'grid-cols-[40px_minmax(180px,5fr)_100px_100px_100px_230px_110px_60px_70px]' : 'grid-cols-[40px_minmax(180px,5fr)_100px_100px_230px_110px_60px_70px]'} gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide items-center`}>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedOffers.size === filteredOffers.length && filteredOffers.length > 0}
                  onChange={selectAllOffers}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </div>
              <div className="flex items-center">Pojazd</div>
              <div className="flex items-center justify-end text-right">Cena oryg.</div>
              <div className="flex items-center justify-end text-right">Netto PLN</div>
              {settings?.show_eur_prices && settings?.exchange_rate_eur && (
                <div className="flex items-center justify-end text-right">Netto EUR</div>
              )}
              <div className="flex items-center justify-end text-right leading-tight">EUR Brutto /<br />Własna PLN</div>
              <div className="flex items-center justify-end text-right leading-tight">Cena partnera<br />PLN</div>
              <div className="flex items-center justify-center text-center" title="Widoczność"><Eye className="h-4 w-4" /></div>
              <div className="flex items-center justify-center text-center">Akcje</div>
            </div>
            <div className="divide-y divide-gray-200 max-h-[650px] overflow-y-auto">
              {filteredOffers.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Car className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base font-medium text-gray-800 mb-1">Brak ofert w tym filtrze</p>
                  <p className="text-sm text-gray-500 mb-5">
                    Zaimportuj plik CSV w formacie Car-Scout, aby dodać samochody do filtra <strong>{filter.name}</strong>.
                  </p>
                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4" />
                    Importuj CSV (Car-Scout)
                  </button>
                </div>
              ) : (
                filteredOffers.map((offer) => (
                  <div key={offer.offer_id} className={`grid ${settings?.show_eur_prices && settings?.exchange_rate_eur ? 'grid-cols-[40px_minmax(180px,5fr)_100px_100px_100px_230px_110px_60px_70px]' : 'grid-cols-[40px_minmax(180px,5fr)_100px_100px_230px_110px_60px_70px]'} gap-2 px-4 py-3 items-center hover:bg-gray-50 transition-colors ${!offer.is_visible ? 'opacity-60 bg-gray-50' : ''}`}>
                    <div className="flex items-center">
                      <input type="checkbox" checked={selectedOffers.has(offer.offer_id)} onChange={() => toggleOfferSelection(offer.offer_id)} className="h-4 w-4 text-blue-600 rounded" />
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      {offer.offer.main_photo_url ? (
                        <div className="relative w-14 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image src={offer.offer.main_photo_url} alt={`${offer.offer.brand} ${offer.offer.model}`} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 text-[10px] text-gray-400">
                          Brak
                        </div>
                      )}
                      <div className="min-w-0 truncate">
                        <p className="font-medium text-gray-900 truncate" title={`${offer.offer.brand} ${offer.offer.model} ${offer.offer.model_version || ''}`}>
                          {offer.offer.brand} {offer.offer.model}
                          {offer.offer.model_version && <span className="ml-1 text-xs font-normal text-gray-500">{offer.offer.model_version}</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {offer.offer.year} • {offer.offer.mileage?.toLocaleString()} km
                          {offer.offer.advert_id && <span className="ml-1.5 font-mono text-[11px] text-gray-400">#{offer.offer.advert_id}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right"><p className="text-sm font-medium text-gray-900 whitespace-nowrap">{formatPrice(offer.offer.price)}</p></div>
                    <div className="text-right"><p className="text-sm font-medium text-gray-700 whitespace-nowrap">{formatPrice(offer.calculated_price_net)}</p></div>
                    {settings?.show_eur_prices && settings?.exchange_rate_eur && <div className="text-right"><p className="text-sm font-medium text-gray-700 whitespace-nowrap">≈ {Math.round(offer.calculated_price_net / settings.exchange_rate_eur).toLocaleString()} €</p></div>}
                    <div className="text-right flex justify-end">
                      <PriceInputs
                        initialCustomPricePln={offer.custom_price ?? null}
                        exchangeRate={settings?.exchange_rate_eur || 0}
                        onSave={(pln) => handleUpdatePrice(offer.offer_id, pln)}
                      />
                    </div>
                    <div className="text-right"><p className="font-bold text-gray-900 leading-tight whitespace-nowrap">{offer.show_net_prices ? formatPrice(offer.calculated_price_net) : formatPrice(offer.calculated_price)}</p></div>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleToggleVisibility(offer.offer_id, offer.is_visible)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors ${offer.is_visible ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}
                        title={offer.is_visible ? 'Ukryj ofertę' : 'Pokaż ofertę'}
                      >
                        {offer.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-1">
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
                        href={`/${locale}/${partner.slug}/${filter.slug}/offer/${offer.offer_id}`}
                        target="_blank"
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Pokaż ofertę w salonie filtra"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteOffer(offer.offer_id)}
                        disabled={saving}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Usuń z filtra"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Kalkulacja kosztów i marży</p>
                <p className="text-xs text-gray-500 mt-1">
                  Kurs EUR: {settings?.exchange_rate_eur ? settings.exchange_rate_eur.toFixed(4) : '-'} •
                  Transport dla: <input
                    type="number"
                    min="1"
                    max="20"
                    value={transportBatchSize}
                    onChange={(e) => setTransportBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="inline-block w-16 px-1 py-0.5 border border-gray-300 rounded text-xs mx-1 text-gray-900 bg-white"
                  /> aut
                </p>
              </div>
              <select
                value={arbitrageSort}
                onChange={(e) => setArbitrageSort(e.target.value as 'margin_eur_desc' | 'margin_pct_desc')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
              >
                <option value="margin_pct_desc">Sortuj: marża % malejąco</option>
                <option value="margin_eur_desc">Sortuj: marża EUR malejąco</option>
              </select>
            </div>

            {!settings?.exchange_rate_eur ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p>Brak skonfigurowanego kursu EUR w ustawieniach systemu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 text-gray-600 bg-gray-50/50">
                      <th className="py-2 px-4 whitespace-nowrap">#</th>
                      <th className="py-2 px-4 whitespace-nowrap">Pojazd</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">Zakup Netto EUR</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">Finansowanie</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">Dodatkowe</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">Transport</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-medium text-gray-900">Koszt Całkowity</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap">Cena Partnera (Net EUR)</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-bold">Marża EUR</th>
                      <th className="py-2 px-4 text-right whitespace-nowrap font-bold">Marża %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arbitrageOffers.map((offer, index) => {
                      const exchangeRateVal = settings.exchange_rate_eur || 0;
                      const saleCustomPln = offer.custom_price != null
                        ? offer.custom_price
                        : offer.calculated_price;
                      const saleGrossEur = exchangeRateVal > 0 ? saleCustomPln / exchangeRateVal : 0;
                      const transportCost = calculateTransportCostPerCarEur(transportBatchSize, effectiveTransportTiers);

                      const breakdown = calculateVehicleMarginBreakdown({
                        purchaseGrossPln: offer.offer.price,
                        exchangeRatePlnPerEur: exchangeRateVal,
                        plVatRate: settings?.pl_vat ?? 23,
                        exportVatRate: partner.export_vat ?? 0,
                        financingCostPercent: effectiveFinancing,
                        additionalCostItems: effectiveAdditionalCosts,
                        transportCostEur: transportCost,
                        saleGrossEur,
                      });

                      return (
                        <tr key={`arb-${offer.offer_id}`} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                          <td className="py-2 px-4 text-gray-500">{index + 1}</td>
                          <td className="py-2 px-4 font-medium text-gray-900">
                            <div className="flex flex-col">
                              <span>{offer.offer.brand} {offer.offer.model}</span>
                              <span className="text-xs text-gray-500">{offer.offer.model_version}</span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.purchaseNetEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.financingCostEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.additionalCostsEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-gray-800">{formatPricePrecise(breakdown.transportCostEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right font-medium text-gray-900">{formatPricePrecise(breakdown.totalCostEur, 'EUR')}</td>
                          <td className="py-2 px-4 text-right text-blue-700">{formatPricePrecise(breakdown.saleNetEur, 'EUR')}</td>
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
        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <p>
            Widoczne oferty w filtrze: {offers.filter(o => o.is_visible).length} / {offers.length}
          </p>
          <p>
            Z własną ceną: {offers.filter(o => o.custom_price).length}
          </p>
        </div>

        {photoModalOfferId && (
          <PhotoManagerModal
            isOpen={true}
            onClose={() => setPhotoModalOfferId(null)}
            offerId={photoModalOfferId}
            initialMainPhoto={offers.find(o => o.offer_id === photoModalOfferId)?.offer.main_photo_url || null}
            initialPhotos={offers.find(o => o.offer_id === photoModalOfferId)?.offer.additional_photos || []}
            onSave={handleSavePhotos}
          />
        )}
      </div>

      {/* Modal: Car-Scout CSV Import */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-2xl w-full overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Import ofert z pliku CSV (Car-Scout)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Docelowy filtr: <strong>{filter.name}</strong> ({partner.company_name} • /{partner.slug}/{filter.slug})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* File Dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wybierz plik CSV wygenerowany przez auto-scraper (format Car-Scout)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-blue-50/40 hover:bg-blue-50 transition-colors px-4 text-center">
                  <Upload className="h-7 w-7 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-800">
                    {csvFileName ? csvFileName : 'Kliknij, aby wybrać plik .csv z dysku'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Obsługuje 43-kolumnowy format car-scout-automarket_*.csv
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    importMode === 'upsert'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="upsert"
                    checked={importMode === 'upsert'}
                    onChange={() => setImportMode('upsert')}
                    className="mt-1 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Dodaj / zaktualizuj (Upsert)
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Dodaje nowe auta do filtra i aktualizuje istniejące, zachowując ręczne ceny i widoczność.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    importMode === 'replace'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-1 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Zastąp zawartość filtra
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Odłącza od tego filtra oferty, których nie ma w nowym pliku CSV.
                    </div>
                  </div>
                </label>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipPlaceholders}
                  onChange={(e) => setSkipPlaceholders(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-800">
                  Pomiń oferty ze zdjęciami zastępczymi (placeholder „Przykładowe zdjęcie”)
                </span>
              </label>

              {/* Live Preview */}
              {csvPreview && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Podgląd pliku CSV przed importem
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md font-medium text-gray-700">
                        Wierszy w CSV: <strong>{csvPreview.totalRows}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md font-medium text-blue-800">
                        Do zaimportowania: <strong>{csvPreview.offersToImport}</strong>
                      </span>
                      {csvPreview.placeholderRowsCount > 0 && (
                        <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md font-medium text-amber-800">
                          Zdjęcia zastępcze: <strong>{csvPreview.placeholderRowsCount}</strong>
                          {skipPlaceholders ? ' (pominięte)' : ' (zostaną ukryte jako brak zdjęcia)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {Object.keys(csvPreview.brandCounts).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(csvPreview.brandCounts).map(([modelKey, cnt]) => (
                        <span
                          key={modelKey}
                          className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-800 rounded-full"
                        >
                          {modelKey}: <strong>{cnt}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  {csvPreview.errors.length > 0 && (
                    <div className="text-xs text-red-600 space-y-1 max-h-24 overflow-y-auto">
                      {csvPreview.errors.map((errMsg, idx) => (
                        <div key={idx}>• {errMsg}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span>Import zakończony pomyślnie!</span>
                  </div>
                  <p className="text-xs text-green-800">
                    Zaimportowano / zaktualizowano: <strong>{importResult.importedCount}</strong> ofert z{' '}
                    <strong>{importResult.totalParsed}</strong> wierszy.
                    {importResult.skippedPlaceholdersCount > 0 && (
                      <> Pominięto ofert ze zdjęciem zastępczym: <strong>{importResult.skippedPlaceholdersCount}</strong>.</>
                    )}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="text-xs text-red-700 pt-2">
                      Błędy ({importResult.errorsCount}): {importResult.errors.join('; ')}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Zamknij
                </button>
                <button
                  type="button"
                  disabled={!csvRawText.trim() || importing || (csvPreview?.offersToImport ?? 0) === 0}
                  onClick={handleRunImport}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Importuj {csvPreview ? `(${csvPreview.offersToImport} aut)` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
