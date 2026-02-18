'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Partner, CreatePartnerInput, UpdatePartnerInput } from '@/types/partners';
import { createPartner, updatePartner } from '@/lib/partners-server';
import { AdditionalCostItem, AdditionalCostMode, normalizeAdditionalCostItems, normalizeTransportTiers } from '@/lib/price-calculator';
import { Building2, ArrowLeft, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface PartnerFormProps {
  partner?: Partner;
  mode: 'create' | 'edit';
}

const DEFAULT_TRANSPORT_TIERS = normalizeTransportTiers();

export function PartnerForm({ partner, mode }: PartnerFormProps) {
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    slug: partner?.slug || '',
    company_name: partner?.company_name || '',
    company_address: partner?.company_address || '',
    vat_number: partner?.vat_number || '',
    contact_person: partner?.contact_person || '',
    phone: partner?.phone || '',
    email: partner?.email || '',
    website: partner?.website || '',
    default_margin_percent: partner?.default_margin_percent || 0,
    show_net_prices: partner?.show_net_prices ?? false,
    show_secondary_currency: partner?.show_secondary_currency ?? false,
    financing_cost_percent: partner?.financing_cost_percent ?? 0,
    additional_cost_items: normalizeAdditionalCostItems(partner?.additional_cost_items)?.length
      ? normalizeAdditionalCostItems(partner?.additional_cost_items)
      : [{ description: '', mode: 'fixed_eur', valueEurNet: 0, percentValue: 0 } as AdditionalCostItem],
    transport_cost_tiers_eur: normalizeTransportTiers(partner?.transport_cost_tiers_eur || DEFAULT_TRANSPORT_TIERS),
    is_active: partner?.is_active ?? true,
    notes: partner?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if ([
      'default_margin_percent',
      'financing_cost_percent',
    ].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: Math.max(0, Number(value || 0)) }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTierChange = (tier: 1 | 2 | 4 | 8 | 9, value: string) => {
    setFormData(prev => ({
      ...prev,
      transport_cost_tiers_eur: {
        ...prev.transport_cost_tiers_eur,
        [tier]: Math.max(0, Number(value || 0)),
      },
    }));
  };

  const handleAdditionalCostChange = (index: number, field: keyof AdditionalCostItem, value: string) => {
    setFormData(prev => {
      const updated = [...prev.additional_cost_items];
      const current = updated[index];

      if (field === 'mode') {
        const mode = (value === 'percent_of_net_plus_financing' ? value : 'fixed_eur') as AdditionalCostMode;
        updated[index] = {
          ...current,
          mode,
          valueEurNet: mode === 'fixed_eur' ? Math.max(0, Number(current.valueEurNet || 0)) : 0,
          percentValue: mode === 'percent_of_net_plus_financing' ? Math.max(0, Number(current.percentValue || 0)) : 0,
        };
      } else if (field === 'valueEurNet' || field === 'percentValue') {
        updated[index] = {
          ...current,
          [field]: Math.max(0, Number(value || 0)),
        };
      } else {
        updated[index] = {
          ...current,
          [field]: value,
        };
      }

      return { ...prev, additional_cost_items: updated };
    });
  };

  const addAdditionalCost = () => {
    setFormData(prev => ({
      ...prev,
      additional_cost_items: [...prev.additional_cost_items, { description: '', mode: 'fixed_eur', valueEurNet: 0, percentValue: 0 }],
    }));
  };

  const removeAdditionalCost = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additional_cost_items: prev.additional_cost_items.filter((_, idx) => idx !== index),
    }));
  };

  const validateSlug = (slug: string): boolean => /^[a-z0-9-]+$/.test(slug);

  const getCleanAdditionalCosts = () => normalizeAdditionalCostItems(formData.additional_cost_items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.company_name.trim()) return setError('Nazwa firmy jest wymagana');
    if (!formData.slug.trim()) return setError('Slug jest wymagany');
    if (!validateSlug(formData.slug)) return setError('Slug może zawierać tylko małe litery, cyfry i myślniki');

    setLoading(true);

    const payloadBase = {
      company_name: formData.company_name,
      company_address: formData.company_address || undefined,
      vat_number: formData.vat_number || undefined,
      contact_person: formData.contact_person || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      website: formData.website || undefined,
      default_margin_percent: Math.max(0, formData.default_margin_percent),
      show_net_prices: formData.show_net_prices,
      show_secondary_currency: formData.show_secondary_currency,
      financing_cost_percent: Math.max(0, formData.financing_cost_percent),
      additional_cost_items: getCleanAdditionalCosts(),
      transport_cost_tiers_eur: normalizeTransportTiers(formData.transport_cost_tiers_eur),
      is_active: formData.is_active,
      notes: formData.notes || undefined,
    };

    try {
      if (mode === 'create') {
        const input: CreatePartnerInput = {
          slug: formData.slug.toLowerCase(),
          ...payloadBase,
        };

        await createPartner(input);
      } else if (mode === 'edit' && partner) {
        const input: UpdatePartnerInput = payloadBase;
        await updatePartner(partner.id, input);
      }

      router.push(`/${locale}/admin/partners`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/${locale}/admin/partners`} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{mode === 'create' ? 'Nowy partner' : 'Edytuj partnera'}</h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Building2 className="h-5 w-5" />Podstawowe informacje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="Nazwa firmy" required />
              <input type="text" name="slug" value={formData.slug} onChange={handleChange} disabled={mode === 'edit'} className="w-full px-3 py-2 border rounded-lg text-gray-900 disabled:bg-gray-100" placeholder="slug" required />
            </div>
            <textarea name="company_address" value={formData.company_address} onChange={handleChange} rows={2} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="Adres" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="vat_number" value={formData.vat_number} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="NIP / VAT" />
              <input type="text" name="contact_person" value={formData.contact_person} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="Osoba kontaktowa" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="E-mail" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="Telefon" />
            </div>
            <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="Strona www" />
          </div>

          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Koszty i kalkulator marży</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domyślna marża (%)</label>
                <input type="number" name="default_margin_percent" value={formData.default_margin_percent} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border rounded-lg text-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koszt finansowania (%)</label>
                <input type="number" name="financing_cost_percent" value={formData.financing_cost_percent} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border rounded-lg text-gray-900" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Koszty dodatkowe (na pojazd)</label>
                <button type="button" onClick={addAdditionalCost} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"><Plus className="h-4 w-4" />Dodaj</button>
              </div>
              <p className="text-xs text-gray-500 mb-2">Tryb kosztu: stała kwota EUR albo % od (net EUR + finansowanie EUR).</p>
              <div className="space-y-2">
                {formData.additional_cost_items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleAdditionalCostChange(index, 'description', e.target.value)}
                      placeholder="Opis kosztu"
                      className="col-span-4 px-3 py-2 border rounded-lg text-gray-900"
                    />
                    <select
                      value={item.mode || 'fixed_eur'}
                      onChange={(e) => handleAdditionalCostChange(index, 'mode', e.target.value)}
                      className="col-span-4 px-3 py-2 border rounded-lg text-gray-900 bg-white"
                    >
                      <option value="fixed_eur">Kwota stała EUR netto</option>
                      <option value="percent_of_net_plus_financing">% od (net EUR + finansowanie EUR)</option>
                    </select>
                    {(item.mode || 'fixed_eur') === 'percent_of_net_plus_financing' ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.percentValue || 0}
                        onChange={(e) => handleAdditionalCostChange(index, 'percentValue', e.target.value)}
                        placeholder="%"
                        className="col-span-3 px-3 py-2 border rounded-lg text-gray-900"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valueEurNet || 0}
                        onChange={(e) => handleAdditionalCostChange(index, 'valueEurNet', e.target.value)}
                        placeholder="EUR"
                        className="col-span-3 px-3 py-2 border rounded-lg text-gray-900"
                      />
                    )}
                    <button type="button" onClick={() => removeAdditionalCost(index)} className="col-span-1 p-2 text-gray-500 hover:text-red-600" disabled={formData.additional_cost_items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Koszty transportu wg liczby aut (EUR)</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[1, 2, 4, 8, 9].map((tier) => (
                  <div key={tier}>
                    <label className="text-xs text-gray-500">{tier === 9 ? '9+' : tier} auto{tier === 1 ? '' : 'a'}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.transport_cost_tiers_eur[tier as 1 | 2 | 4 | 8 | 9]}
                      onChange={(e) => handleTierChange(tier as 1 | 2 | 4 | 8 | 9, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-6 border-t border-gray-200">
            <label className="flex items-center gap-2"><input type="checkbox" name="show_net_prices" checked={formData.show_net_prices} onChange={handleChange} /> Ceny netto</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="show_secondary_currency" checked={formData.show_secondary_currency} onChange={handleChange} /> Druga waluta</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} /> Aktywny</label>
          </div>

          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg text-gray-900" placeholder="Notatki" />

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link href={`/${locale}/admin/partners`} className="px-6 py-2 text-gray-700">Anuluj</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {mode === 'create' ? 'Utwórz partnera' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
