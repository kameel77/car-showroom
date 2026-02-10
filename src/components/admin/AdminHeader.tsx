'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Users, Filter, Layout } from 'lucide-react';

export function AdminHeader() {
    const locale = useLocale();
    const pathname = usePathname();

    const navItems = [
        {
            label: 'Partnerzy',
            href: `/${locale}/admin/partners`,
            icon: Users,
        },
        {
            label: 'Filtry',
            href: `/${locale}/admin/filters`,
            icon: Filter,
        },
        {
            label: 'Widgety',
            href: `/${locale}/admin/widgets`,
            icon: Layout,
        },
    ];

    return (
        <div className="bg-white border-b border-gray-200 mb-8 sticky top-0 z-10 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <Link
                        href={`/${locale}`}
                        className="text-xs text-gray-500 hover:text-blue-600 font-medium"
                    >
                        Powrót do serwisu
                    </Link>
                </div>
            </div>
        </div>
    );
}
