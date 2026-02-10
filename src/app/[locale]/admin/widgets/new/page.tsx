'use client';

import React from 'react';
import { WidgetForm } from '@/components/admin/WidgetForm';
import { createWidget } from '@/lib/widgets-server';

export default function NewWidgetPage() {
    const handleSubmit = async (data: any) => {
        await createWidget(data);
    };

    return <WidgetForm onSubmit={handleSubmit} title="Nowy widget" />;
}
