'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Loader2
} from 'lucide-react';
import { Partner } from '@/types/partners';
import { getPartners, deletePartner } from '@/lib/partners-server';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default function PartnersAdminPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const data = await getPartners();
      setPartners(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      await deletePartner(id);
      setPartners(partners.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      alert('Failed to delete partner: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
              onClick={loadPartners}
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
    <div className="min-h-screen bg-gray-50 pb-8">
      <AdminHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partnerzy</h1>
            <p className="text-gray-600 mt-1">
              Zarządzaj partnerami i ich dostępem do ofert
            </p>
          </div>
          <Link
            href={`/${locale}/admin/partners/new`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nowy partner
          </Link>
        </div>

        {/* Partners List */}
        {partners.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Brak partnerów
            </h3>
            <p className="text-gray-500 mb-6">
              Dodaj pierwszego partnera, aby rozpocząć
            </p>
            <Link
              href={`/${locale}/admin/partners/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Dodaj partnera
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {partner.company_name}
                        </h3>
                        {!partner.is_active && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                            Nieaktywny
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {partner.slug}
                        </span>
                        <span className="flex items-center gap-1">
                          <Percent className="h-4 w-4" />
                          Marża: {partner.default_margin_percent}%
                        </span>
                        {partner.vat_number && (
                          <span>NIP: {partner.vat_number}</span>
                        )}
                      </div>

                      {partner.contact_person && (
                        <p className="text-sm text-gray-600 mb-1">
                          {partner.contact_person}
                        </p>
                      )}

                      {(partner.email || partner.phone) && (
                        <p className="text-sm text-gray-500">
                          {partner.email} {partner.phone && `• ${partner.phone}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        href={`/${locale}/${partner.slug}`}
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Zobacz stronę partnera"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </Link>

                      <Link
                        href={`/${locale}/admin/partners/${partner.id}/offers`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Zarządzaj ofertami"
                      >
                        <Car className="h-5 w-5" />
                      </Link>

                      <Link
                        href={`/${locale}/admin/partners/${partner.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edytuj"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>

                      <button
                        onClick={() => handleDelete(partner.id)}
                        className={`p-2 rounded-lg transition-colors ${deleteConfirm === partner.id
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        title={deleteConfirm === partner.id ? 'Potwierdź usunięcie' : 'Usuń'}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 flex items-center gap-4">
                    <Link
                      href={`/${locale}/admin/partners/${partner.id}/offers`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Zarządzaj ofertami i cenami
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
