'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import {
    Plus,
    Trash2,
    Edit,
    Layout,
    Image as ImageIcon,
    Code,
    Globe,
    Users,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { Widget } from '@/types/widgets';
import { getWidgets, deleteWidget } from '@/lib/widgets-server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { localeNames } from '@/i18n/config';

export default function WidgetsAdminPage() {
    const t = useTranslations();
    const locale = useLocale();

    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        loadWidgets();
    }, []);

    const loadWidgets = async () => {
        try {
            setLoading(true);
            const data = await getWidgets();
            setWidgets(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load widgets');
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
            await deleteWidget(id);
            setWidgets(widgets.filter(w => w.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            alert('Failed to delete widget: ' + (err instanceof Error ? err.message : 'Unknown error'));
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

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <AdminHeader />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Widgety</h1>
                        <p className="text-gray-600 mt-1">
                            Zarządzaj dodatkowymi informacjami wyświetlanymi w ofertach
                        </p>
                    </div>
                    <Link
                        href={`/${locale}/admin/widgets/new`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nowy widget
                    </Link>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <p>{error}</p>
                        <button onClick={loadWidgets} className="ml-auto underline">Odśwież</button>
                    </div>
                )}

                {/* Widgets List */}
                {widgets.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Layout className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Brak widgetów
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Dodaj pierwszy widget, aby wyświetlić dodatkowe informacje w ofertach
                        </p>
                        <Link
                            href={`/${locale}/admin/widgets/new`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="h-5 w-5" />
                            Dodaj widget
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="divide-y divide-gray-200">
                            {widgets.map((widget) => (
                                <div
                                    key={widget.id}
                                    className="p-6 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {widget.name}
                                                </h3>
                                                {widget.is_active ? (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Aktywny
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                                        <XCircle className="h-3 w-3" />
                                                        Nieaktywny
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1.5">
                                                    {widget.type === 'sidebar' ? (
                                                        <Layout className="h-4 w-4 text-orange-500" />
                                                    ) : (
                                                        <div className="h-4 w-4 border-b-2 border-primary-500" />
                                                    )}
                                                    Położenie: {widget.type === 'sidebar' ? 'Sidebar' : 'Treść ogłoszenia'}
                                                </span>

                                                <span className="flex items-center gap-1.5">
                                                    {widget.content_type === 'image' ? (
                                                        <ImageIcon className="h-4 w-4 text-blue-500" />
                                                    ) : (
                                                        <Code className="h-4 w-4 text-purple-500" />
                                                    )}
                                                    Typ: {widget.content_type === 'image' ? 'Obraz' : 'Kod HTML'}
                                                </span>

                                                <span className="flex items-center gap-1.5">
                                                    <Globe className="h-4 w-4 text-gray-400" />
                                                    Język: {widget.language ? (localeNames[widget.language as keyof typeof localeNames] || widget.language) : 'Wszystkie'}
                                                </span>

                                                <span className="flex items-center gap-1.5">
                                                    {widget.is_global ? (
                                                        <Globe className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Users className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                    Zasięg: {widget.is_global ? 'Globalny' : `Partnerzy (${widget.partners?.length || 0})`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Link
                                                href={`/${locale}/admin/widgets/${widget.id}/edit`}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edytuj"
                                            >
                                                <Edit className="h-5 w-5" />
                                            </Link>

                                            <button
                                                onClick={() => handleDelete(widget.id)}
                                                className={`p-2 rounded-lg transition-colors ${deleteConfirm === widget.id
                                                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                title={deleteConfirm === widget.id ? 'Potwierdź usunięcie' : 'Usuń'}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
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
