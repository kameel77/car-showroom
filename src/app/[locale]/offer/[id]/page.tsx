import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ImageGallery } from '@/components/ImageGallery';
import { EquipmentDisplay } from '@/components/EquipmentDisplay';
import { SpecsGrid } from '@/components/SpecsGrid';
import { OfferSidebar } from '@/components/OfferSidebar';
import { MobileStickyCTA } from '@/components/MobileStickyCTA';
import { supabase } from '@/lib/supabase';
import { isOfferAllowed } from '@/lib/filters-server';
import { getGlobalWidgets } from '@/lib/widgets-server';
import { CarOffer } from '@/types/car';
import {
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface OfferPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

async function getOffer(id: string): Promise<CarOffer | null> {
  const { data, error } = await supabase
    .from('car_offers')
    .select('*')
    .eq('advert_id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function OfferPage({ params }: OfferPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();
  const offer = await getOffer(id);

  if (!offer) {
    notFound();
  }

  // Check if offer is allowed by filters
  const allowed = await isOfferAllowed(offer.brand, offer.model);
  if (!allowed) {
    notFound();
  }

  // Fetch global widgets
  const widgets = await getGlobalWidgets(locale);
  const sidebarWidgets = widgets.filter(w => w.type === 'sidebar');
  const contentWidgets = widgets.filter(w => w.type === 'content');

  const allPhotos = [
    offer.main_photo_url,
    ...(offer.additional_photos || [])
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 lg:pb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}`} className="hover:text-gray-900 transition-colors">
            {t('nav.home')}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">{offer.brand}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">{offer.model}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <ImageGallery
              images={allPhotos}
              title={`${offer.brand} ${offer.model}`}
            />

            {/* Title & Price - Mobile */}
            <OfferSidebar offer={offer} className="lg:hidden space-y-6" />

            {/* Key Parameters */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {t('detail.keyParameters')}
              </h2>
              <SpecsGrid
                year={offer.year}
                mileage={offer.mileage}
                fuelType={offer.fuel_type}
                transmission={offer.transmission}
                power={offer.engine_power}
                location={offer.seller_city}
                bodyType={offer.body_type}
                colourType={offer.colour_type}
              />
            </section>

            {/* Equipment */}
            {offer.features && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('detail.equipment')}
                </h2>
                <EquipmentDisplay equipment={offer.features} />
              </section>
            )}

            {/* Content Widgets */}
            {contentWidgets.length > 0 && (
              <div className="space-y-6">
                {contentWidgets.map(widget => (
                  <div key={widget.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {widget.content_type === 'image' ? (
                      <img src={widget.content} alt={widget.name} className="w-full h-auto" />
                    ) : (
                      <div className="p-6 prose prose-gray max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: widget.content }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Back Button */}
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('detail.back')}
            </Link>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block space-y-6">
            <OfferSidebar offer={offer} />

            {/* Sidebar Widgets */}
            {sidebarWidgets.map(widget => (
              <div key={widget.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {widget.content_type === 'image' ? (
                  <img src={widget.content} alt={widget.name} className="w-full h-auto" />
                ) : (
                  <div className="p-6 prose prose-sm prose-gray max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: widget.content }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA offer={offer} />
    </div>
  );
}
