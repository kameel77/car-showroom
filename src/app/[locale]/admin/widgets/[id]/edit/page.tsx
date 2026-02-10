'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { WidgetForm } from '@/components/admin/WidgetForm';
import { getWidgetById, updateWidget } from '@/lib/widgets-server';
import { Widget } from '@/types/widgets';
import { Loader2, AlertCircle } from 'lucide-react';

export default function EditWidgetPage() {
    const params = useParams();
    const id = params.id as string;

    const [widget, setWidget] = useState<Widget | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadWidget() {
            try {
                setLoading(true);
                const data = await getWidgetById(id);
                if (data) {
                    setWidget(data);
                } else {
                    setError('Widget not found');
                }
            } catch (err) {
                setError('Failed to load widget');
            } finally {
                setLoading(false);
            }
        }
        loadWidget();
    }, [id]);

    const handleSubmit = async (data: any) => {
        await updateWidget(id, data);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !widget) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Błąd</h2>
                    <p className="text-gray-600">{error || 'Nie znaleziono widgetu'}</p>
                </div>
            </div>
        );
    }

    return <WidgetForm initialData={widget} onSubmit={handleSubmit} title="Edytuj widget" />;
}
