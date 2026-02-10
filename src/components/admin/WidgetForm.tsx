'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
    Save,
    ArrowLeft,
    Loader2,
    Globe,
    Users,
    Layout,
    Image as ImageIcon,
    Code,
    CheckCircle2
} from 'lucide-react';
import { CreateWidgetInput, UpdateWidgetInput, Widget } from '@/types/widgets';
import { Partner } from '@/types/partners';
import { getPartners } from '@/lib/partners-server';

interface WidgetFormProps {
    initialData?: Widget;
    onSubmit: (data: any) => Promise<void>;
    title: string;
}

export function WidgetForm({ initialData, onSubmit, title }: WidgetFormProps) {
    const router = useRouter();
    const locale = useLocale();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [partners, setPartners] = useState<Partner[]>([]);

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: initialData?.type || 'sidebar',
        content_type: initialData?.content_type || 'image',
        content: initialData?.content || '',
        is_global: initialData?.is_global ?? true,
        is_active: initialData?.is_active ?? true,
        partner_ids: initialData?.partners || [],
    });

    useEffect(() => {
        async function loadPartners() {
            try {
                setLoading(true);
                const data = await getPartners();
                setPartners(data.filter(p => p.is_active));
            } catch (err) {
                console.error('Failed to load partners:', err);
            } finally {
                setLoading(false);
            }
        }
        loadPartners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await onSubmit(formData);
            router.push(`/${locale}/admin/widgets`);
            router.refresh();
        } catch (err) {
            alert('Error saving widget: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const togglePartner = (partnerId: string) => {
        setFormData(prev => ({
            ...prev,
            partner_ids: prev.partner_ids.includes(partnerId)
                ? prev.partner_ids.filter(id => id !== partnerId)
                : [...prev.partner_ids, partnerId]
        }));
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Nazwa (wewnętrzna)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="np. Baner Letni, Kontakt Sidebar"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <div className="flex items-center gap-4 py-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Aktywny</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Widget Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-gray-700 font-bold">Położenie</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'sidebar' })}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.type === 'sidebar'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <Layout className="h-6 w-6" />
                                        <span className="text-xs font-medium">Sidebar</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'content' })}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.type === 'content'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="h-6 w-6 border-b-2 border-current" />
                                        <span className="text-xs font-medium">Treść ogłoszenia</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium text-gray-700 font-bold">Typ zawartości</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, content_type: 'image' })}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.content_type === 'image'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <ImageIcon className="h-6 w-6" />
                                        <span className="text-xs font-medium">Obraz</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, content_type: 'html' })}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.content_type === 'html'
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <Code className="h-6 w-6" />
                                        <span className="text-xs font-medium">Kod HTML</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                {formData.content_type === 'image' ? 'Link do obrazu (URL)' : 'Kod HTML'}
                            </label>
                            {formData.content_type === 'image' ? (
                                <input
                                    type="url"
                                    required
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            ) : (
                                <textarea
                                    required
                                    rows={8}
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="<div>...</div>"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                />
                            )}
                        </div>

                        <hr className="border-gray-100" />

                        {/* Visibility Settings */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-blue-500" />
                                        Wyświetlanie globalne
                                    </label>
                                    <p className="text-xs text-gray-500">Pokaż ten widget wszystkim partnerom</p>
                                </div>
                                <div className="flex items-center h-6">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_global}
                                        onChange={e => setFormData({ ...formData, is_global: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {!formData.is_global && (
                                <div className="space-y-4 pt-4 border-t border-gray-50">
                                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-yellow-500" />
                                        Przypisani partnerzy
                                    </label>
                                    {loading ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Ładowanie partnerów...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                                            {partners.map(partner => (
                                                <button
                                                    key={partner.id}
                                                    type="button"
                                                    onClick={() => togglePartner(partner.id)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${formData.partner_ids.includes(partner.id)
                                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium">{partner.company_name}</span>
                                                    {formData.partner_ids.includes(partner.id) && (
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {formData.partner_ids.length === 0 && !loading && (
                                        <p className="text-xs text-red-500">Wybierz przynajmniej jednego partnera lub włącz wyświetlanie globalne.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex items-center justify-end border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={saving || (!formData.is_global && formData.partner_ids.length === 0)}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                        >
                            {saving ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                            {saving ? 'Zapisywanie...' : 'Zapisz widget'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
