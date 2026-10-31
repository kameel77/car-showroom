'use client';

import React, { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Car,
  Percent,
  Building2,
  ChevronRight,
  AlertCircle,
  Loader2,
  Filter,
  Upload,
  X,
  Check,
  FileSpreadsheet,
  Shield,
} from 'lucide-react';
import { Partner, ClientFilter } from '@/types/partners';
import {
  getPartners,
  deletePartner,
  getAllClientFiltersByPartner,
  createClientFilter,
  updateClientFilter,
  deleteClientFilter,
} from '@/lib/partners-server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { GlobalPricingSettings } from '@/components/admin/GlobalPricingSettings';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PartnersAdminPage() {
  const locale = useLocale();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [filtersByPartner, setFiltersByPartner] = useState<Record<string, ClientFilter[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteFilterConfirm, setDeleteFilterConfirm] = useState<string | null>(null);

  // Filter Modal State (create / edit)
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterModalMode, setFilterModalMode] = useState<'create' | 'edit'>('create');
  const [activePartnerForFilter, setActivePartnerForFilter] = useState<Partner | null>(null);
  const [editingFilter, setEditingFilter] = useState<ClientFilter | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterSlug, setFilterSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [filterDescription, setFilterDescription] = useState('');
  const [filterSourceQuery, setFilterSourceQuery] = useState('');
  const [filterMarginPercent, setFilterMarginPercent] = useState<string>('');
  const [filterIsActive, setFilterIsActive] = useState(true);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterModalError, setFilterModalError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [partnersData, filtersData] = await Promise.all([
        getPartners(),
        getAllClientFiltersByPartner(),
      ]);
      setPartners(partnersData);
      setFiltersByPartner(filtersData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować klientów');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      await deletePartner(id);
      setPartners(partners.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert('Błąd usuwania klienta: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const openCreateFilterModal = (partner: Partner) => {
    setFilterModalMode('create');
    setActivePartnerForFilter(partner);
    setEditingFilter(null);
    setFilterName('');
    setFilterSlug('');
    setSlugManuallyEdited(false);
    setFilterDescription('');
    setFilterSourceQuery('');
    setFilterMarginPercent('');
    setFilterIsActive(true);
    setFilterModalError(null);
    setFilterModalOpen(true);
  };

  const openEditFilterModal = (partner: Partner, filter: ClientFilter) => {
    setFilterModalMode('edit');
    setActivePartnerForFilter(partner);
    setEditingFilter(filter);
    setFilterName(filter.name);
    setFilterSlug(filter.slug);
    setSlugManuallyEdited(true);
    setFilterDescription(filter.description || '');
    setFilterSourceQuery(filter.source_query || '');
    setFilterMarginPercent(filter.margin_percent != null ? String(filter.margin_percent) : '');
    setFilterIsActive(filter.is_active);
    setFilterModalError(null);
    setFilterModalOpen(true);
  };

  const handleFilterNameChange = (val: string) => {
    setFilterName(val);
    if (!slugManuallyEdited) {
      setFilterSlug(slugify(val));
    }
  };

  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnerForFilter) return;

    try {
      setSavingFilter(true);
      setFilterModalError(null);

      const parsedMargin =
        filterMarginPercent.trim() !== '' && !Number.isNaN(Number(filterMarginPercent))
          ? Math.max(0, Number(filterMarginPercent))
          : null;

      if (filterModalMode === 'create') {
        const created = await createClientFilter({
          partner_id: activePartnerForFilter.id,
          name: filterName,
          slug: filterSlug,
          description: filterDescription || undefined,
          source_query: filterSourceQuery || undefined,
          margin_percent: parsedMargin,
          is_active: filterIsActive,
        });
        setFiltersByPartner(prev => ({
          ...prev,
          [activePartnerForFilter.id]: [...(prev[activePartnerForFilter.id] || []), created],
        }));
      } else if (editingFilter) {
        const updated = await updateClientFilter(editingFilter.id, {
          name: filterName,
          slug: filterSlug,
          description: filterDescription,
          source_query: filterSourceQuery,
          margin_percent: parsedMargin,
          is_active: filterIsActive,
        });
        setFiltersByPartner(prev => ({
          ...prev,
          [activePartnerForFilter.id]: (prev[activePartnerForFilter.id] || []).map(f =>
            f.id === editingFilter.id ? { ...f, ...updated } : f
          ),
        }));
      }

      setFilterModalOpen(false);
    } catch (err) {
      setFilterModalError(err instanceof Error ? err.message : 'Nie udało się zapisać filtra');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleDeleteFilter = async (partnerId: string, filterId: string) => {
    if (deleteFilterConfirm !== filterId) {
      setDeleteFilterConfirm(filterId);
      return;
    }

    try {
      await deleteClientFilter(filterId);
      setFiltersByPartner(prev => ({
        ...prev,
        [partnerId]: (prev[partnerId] || []).filter(f => f.id !== filterId),
      }));
      setDeleteFilterConfirm(null);
    } catch (err) {
      alert('Błąd usuwania filtra: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <AdminHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Klienci i Filtry</h1>
            <p className="text-gray-600 mt-1">
              Zarządzaj klientami, ich dedykowanymi filtrami oraz importem ofert z Car-Scout CSV
            </p>
          </div>
          <Link
            href={`/${locale}/admin/partners/new`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nowy klient
          </Link>
        </div>

        <GlobalPricingSettings />

        {/* Partners List */}
        {partners.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Brak klientów
            </h3>
            <p className="text-gray-500 mb-6">
              Dodaj pierwszego klienta, aby rozpocząć tworzenie filtrów i import ofert
            </p>
            <Link
              href={`/${locale}/admin/partners/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Dodaj klienta
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {partners.map((partner) => {
              const partnerFilters = filtersByPartner[partner.id] || [];
              return (
                <div
                  key={partner.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Partner Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {partner.company_name}
                          </h3>
                          <span className="px-2.5 py-0.5 text-xs font-mono bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                            /{partner.slug}
                          </span>
                          {!partner.is_active && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Nieaktywny
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Percent className="h-4 w-4 text-gray-400" />
                            Marża domyślna: <strong>{partner.default_margin_percent}%</strong>
                          </span>
                          {partner.financing_cost_percent > 0 && (
                            <span>Finansowanie: {partner.financing_cost_percent}%</span>
                          )}
                          {partner.vat_number && (
                            <span>NIP/VAT: {partner.vat_number}</span>
                          )}
                          {partner.contact_person && (
                            <span>Kontakt: {partner.contact_person}</span>
                          )}
                          {(partner.email || partner.phone) && (
                            <span className="text-gray-500">
                              {partner.email} {partner.phone && `• ${partner.phone}`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openCreateFilterModal(partner)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Dodaj filtr
                        </button>

                        <Link
                          href={`/${locale}/admin/partners/${partner.id}/edit`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edytuj ustawienia klienta"
                        >
                          <Edit className="h-5 w-5" />
                        </Link>

                        <button
                          onClick={() => handleDeletePartner(partner.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            deleteConfirm === partner.id
                              ? 'text-red-600 bg-red-50 hover:bg-red-100'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={deleteConfirm === partner.id ? 'Kliknij ponownie, aby potwierdzić usunięcie klienta' : 'Usuń klienta'}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Client Filters List */}
                  <div className="bg-gray-50/60 px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Filtry klienta ({partnerFilters.length})
                      </h4>
                    </div>

                    {partnerFilters.length === 0 ? (
                      <div className="bg-white rounded-lg border border-dashed border-gray-300 p-6 text-center">
                        <p className="text-sm text-gray-500 mb-3">
                          Ten klient nie ma jeszcze żadnych filtrów. Utwórz filtr, aby zaimportować dla niego pojazdy z pliku CSV.
                        </p>
                        <button
                          onClick={() => openCreateFilterModal(partner)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          Utwórz pierwszy filtr
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {partnerFilters.map((filter) => {
                          const publicUrl = `/${locale}/${partner.slug}/${filter.slug}`;
                          const padminUrl = `/${locale}/${partner.slug}/${filter.slug}/padmin`;
                          const adminOffersUrl = `/${locale}/admin/partners/${partner.id}/filters/${filter.id}/offers`;

                          return (
                            <div
                              key={filter.id}
                              className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <span className="font-semibold text-gray-900">
                                    {filter.name}
                                  </span>
                                  <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                                    /{partner.slug}/{filter.slug}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                    <Car className="h-3 w-3" />
                                    {filter.offers_count ?? 0} ofert
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                    <Percent className="h-3 w-3" />
                                    Marża: {filter.margin_percent != null ? `${filter.margin_percent}%` : `${partner.default_margin_percent}% (domyślna)`}
                                  </span>
                                  {!filter.is_active && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                      Ukryty
                                    </span>
                                  )}
                                </div>

                                {filter.description && (
                                  <p className="text-xs text-gray-500">{filter.description}</p>
                                )}

                                {filter.last_imported_at && (
                                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                    <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                                    Ostatni import CSV: {new Date(filter.last_imported_at).toLocaleString('pl-PL')}
                                    {filter.last_import_filename && (
                                      <span className="font-mono text-gray-500">({filter.last_import_filename})</span>
                                    )}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={adminOffersUrl}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                                >
                                  <Upload className="h-4 w-4" />
                                  Oferty i Import CSV
                                  <ChevronRight className="h-4 w-4" />
                                </Link>

                                <Link
                                  href={publicUrl}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                  title="Otwórz publiczny salon filtra"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Salon
                                </Link>

                                <Link
                                  href={padminUrl}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                  title="Panel klienta (padmin)"
                                >
                                  <Shield className="h-3.5 w-3.5" />
                                  padmin
                                </Link>

                                <button
                                  onClick={() => openEditFilterModal(partner, filter)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edytuj filtr"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteFilter(partner.id, filter.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    deleteFilterConfirm === filter.id
                                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                  }`}
                                  title={
                                    deleteFilterConfirm === filter.id
                                      ? 'Kliknij ponownie, aby potwierdzić usunięcie filtra'
                                      : 'Usuń filtr'
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Client Filter */}
      {filterModalOpen && activePartnerForFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {filterModalMode === 'create' ? 'Nowy filtr klienta' : 'Edytuj filtr klienta'}
                </h3>
                <p className="text-xs text-gray-500">
                  Klient: <strong>{activePartnerForFilter.company_name}</strong> (/{activePartnerForFilter.slug})
                </p>
              </div>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} className="p-6 space-y-4">
              {filterModalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{filterModalError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa filtra *
                </label>
                <input
                  type="text"
                  required
                  value={filterName}
                  onChange={e => handleFilterNameChange(e.target.value)}
                  placeholder="np. Opel Corsa / Škoda Fabia & Scala PB 2021+"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug w adresie URL *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500 font-mono">
                    /{locale}/{activePartnerForFilter.slug}/
                  </span>
                  <input
                    type="text"
                    required
                    value={filterSlug}
                    onChange={e => {
                      setSlugManuallyEdited(true);
                      setFilterSlug(e.target.value.toLowerCase());
                    }}
                    placeholder="corsa-fabia-scala"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-gray-900 font-mono text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opis / notatka (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={filterDescription}
                  onChange={e => setFilterDescription(e.target.value)}
                  placeholder="np. Automarket PKO do 80 000 km"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zapytanie źródłowe auto-scraper (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={filterSourceQuery}
                  onChange={e => setFilterSourceQuery(e.target.value)}
                  placeholder="np. opel-corsa-skoda-fabia-scala-pb-2021-do-80-000-km-pko"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marża filtra % (opcjonalnie — puste używa domyślnej marży klienta: {activePartnerForFilter.default_margin_percent}%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filterMarginPercent}
                  onChange={e => setFilterMarginPercent(e.target.value)}
                  placeholder={`Domyślnie: ${activePartnerForFilter.default_margin_percent}%`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={filterIsActive}
                  onChange={e => setFilterIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Filtr aktywny (publiczny salon dostępny)</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingFilter}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {savingFilter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {filterModalMode === 'create' ? 'Utwórz filtr' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
