import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Header } from '@/components/Header';

export default async function NotFound() {
  const t = await getTranslations('detail');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-lg text-gray-600 mb-8">{t('notFound')}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('returnToSearch')}
          </Link>
        </div>
      </main>
    </div>
  );
}
