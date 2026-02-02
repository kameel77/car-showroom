'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Partner, CreatePartnerInput, UpdatePartnerInput } from '@/types/partners';
import { createPartner, updatePartner } from '@/lib/partners-server';
import { Building2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface PartnerFormProps {
  partner?: Partner;
  mode: 'create' | 'edit';
}

export function PartnerForm({ partner, mode }: PartnerFormProps) {
  const t = useTranslations();
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
    is_active: partner?.is_active ?? true,
    notes: partner?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'default_margin_percent') {
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateSlug = (slug: string): boolean => {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.company_name.trim()) {
      setError('Nazwa firmy jest wymagana');
      return;
    }

    if (!formData.slug.trim()) {
      setError('Slug jest wymagany');
      return;
    }

    if (!validateSlug(formData.slug)) {
      setError('Slug może zawierać tylko małe litery, cyfry i myślniki');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const input: CreatePartnerInput = {
          slug: formData.slug.toLowerCase(),
          company_name: formData.company_name,
          company_address: formData.company_address || undefined,
          vat_number: formData.vat_number || undefined,
          contact_person: formData.contact_person || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          website: formData.website || undefined,
          default_margin_percent: formData.default_margin_percent,
          is_active: formData.is_active,
          notes: formData.notes || undefined,
        };
        
        await createPartner(input);
        router.push(`/${locale}/admin/partners`);
      } else if (mode === 'edit' && partner) {
        const input: UpdatePartnerInput = {
          company_name: formData.company_name,
          company_address: formData.company_address || undefined,
          vat_number: formData.vat_number || undefined,
          contact_person: formData.contact_person || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          website: formData.website || undefined,
          default_margin_percent: formData.default_margin_percent,
          is_active: formData.is_active,
          notes: formData.notes || undefined,
        };
        
        await updatePartner(partner.id, input);
        router.push(`/${locale}/admin/partners`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/${locale}/admin/partners`}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === 'create' ? 'Nowy partner' : 'Edytuj partnera'}
            </h1>
            <p className="text-gray-600 mt-1">
              {mode === 'create' 
                ? 'Dodaj nowego partnera do systemu' 
                : 'Zaktualizuj dane partnera'}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Podstawowe informacje
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa firmy *
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="np. Firma XYZ Sp. z o.o."
                  required
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  disabled={mode === 'edit'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="np. firma-xyz"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tylko małe litery, cyfry i myślniki. Będzie częścią URL: domena.com/pl/{formData.slug || 'slug'}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="company_address" className="block text-sm font-medium text-gray-700 mb-1">
                Adres firmy
              </label>
              <textarea
                id="company_address"
                name="company_address"
                value={formData.company_address}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ul. Przykładowa 123, 00-001 Warszawa"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vat_number" className="block text-sm font-medium text-gray-700 mb-1">
                  NIP / VAT
                </label>
                <input
                  type="text"
                  id="vat_number"
                  name="vat_number"
                  value={formData.vat_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="np. 1234567890"
                />
              </div>

              <div>
                <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                  Osoba kontaktowa
                </label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="np. Jan Kowalski"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Dane kontaktowe</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="kontakt@firma.pl"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+48 123 456 789"
                />
              </div>
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Strona www
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://www.firma.pl"
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ustawienia</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="default_margin_percent" className="block text-sm font-medium text-gray-700 mb-1">
                  Domyślna marża (%)
                </label>
                <input
                  type="number"
                  id="default_margin_percent"
                  name="default_margin_percent"
                  value={formData.default_margin_percent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Procent dodawany do ceny bazowej. Można nadpisać dla poszczególnych ofert.
                </p>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Aktywny</span>
                    <span className="block text-xs text-gray-500">Partner widzi swoje oferty</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notatki (widoczne tylko dla admina)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Wewnętrzne notatki o partnerze..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link
              href={`/${locale}/admin/partners`}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Anuluj
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {mode === 'create' ? 'Utwórz partnera' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
