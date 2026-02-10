import React from 'react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { ImageGallery } from '@/components/ImageGallery';
import { EquipmentDisplay } from '@/components/EquipmentDisplay';
import { SpecsGrid } from '@/components/SpecsGrid';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { getPartnerBySlug, getPartnerPublicOffer } from '@/lib/partners-server';
import { getWidgetsByPartner } from '@/lib/widgets-server';
import { formatPrice, calculateNetPrice } from '@/lib/price-calculator';
import { supabase } from '@/lib/supabase';
import { getAppSettings } from '@/lib/settings-server';

interface PartnerOfferPageProps {
  params: Promise<{
    locale: string;
    partner: string;
    id: string;
  }>;
}

async function getOffer(id: string) {
  const { data, error } = await supabase
    .from('car_offers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function generateMetadata({ params }: PartnerOfferPageProps): Promise<Metadata> {
  const { partner: partnerSlug, id } = await params;
  const t = await getTranslations();
  const [partner, offerData] = await Promise.all([
    getPartnerBySlug(partnerSlug),
    getOffer(id),
  ]);

  if (!partner || !offerData) {
    return {
      title: t('detail.notFound'),
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${offerData.brand} ${offerData.model} - ${partner.company_name}`,
    description: `${t('detail.specifications')} ${offerData.brand} ${offerData.model} - ${partner.company_name}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PartnerOfferPage({ params }: PartnerOfferPageProps) {
  const { locale, partner: partnerSlug, id } = await params;
  const t = await getTranslations();

  // Get partner and offer data
  const [partner, partnerOffer, offerData, settings] = await Promise.all([
    getPartnerBySlug(partnerSlug),
    getPartnerPublicOffer(partnerSlug, id),
    getOffer(id),
    getAppSettings(),
  ]);

  if (!partner || !partnerOffer || !offerData) {
    notFound();
  }

  // Fetch widgets
  const widgets = await getWidgetsByPartner(partner.id, locale);
  const sidebarWidgets = widgets.filter(w => w.type === 'sidebar');
  const contentWidgets = widgets.filter(w => w.type === 'content');

  const allPhotos = [
    offerData.main_photo_url,
    ...(offerData.additional_photos || [])
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 lg:pb-6">
        {/* Back to Partner Listing */}
        <div className="mb-6">
          <Link
            href={`/${locale}/${partnerSlug}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('partner.backToOffers')} {partner.company_name}
          </Link>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/${partnerSlug}`} className="hover:text-gray-900 transition-colors">
            {partner.company_name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">{offerData.brand}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900">{offerData.model}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <ImageGallery
              images={allPhotos}
              title={`${offerData.brand} ${offerData.model}`}
            />

            {/* Contact & Price Info - Mobile */}
            <div className="lg:hidden space-y-6">
              {/* Price Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {offerData.brand} {offerData.model}
                  {offerData.model_version && offerData.model_version !== 'Brak' && (
                    <span className="ml-2 text-gray-500 font-normal">{offerData.model_version}</span>
                  )}
                </h1>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    {t('partner.priceFor')} {partner.company_name} {partner.show_net_prices && `(${t('listing.net')})`}
                  </p>
                  {locale === 'pl' ? (
                    <>
                      <p className="text-3xl font-bold text-blue-600">
                        {partner.show_net_prices && partnerOffer.display_price_net
                          ? formatPrice(partnerOffer.display_price_net)
                          : formatPrice(partnerOffer.display_price)}
                      </p>
                      {settings?.show_eur_prices && settings?.exchange_rate_eur && partner.show_secondary_currency && (
                        <p className="text-lg text-gray-500">
                          ≈ {Math.round((partner.show_net_prices && partnerOffer.display_price_net ? partnerOffer.display_price_net : partnerOffer.display_price) / settings.exchange_rate_eur).toLocaleString()}
                          <span className="text-sm ml-0.5">€</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {settings?.show_eur_prices && settings?.exchange_rate_eur ? (
                        <>
                          <p className="text-3xl font-bold text-blue-600">
                            {Math.round((partner.show_net_prices && partnerOffer.display_price_net ? partnerOffer.display_price_net : partnerOffer.display_price) / settings.exchange_rate_eur).toLocaleString()}
                            <span className="text-xl ml-1">€</span>
                          </p>
                          {partner.show_secondary_currency && (
                            <p className="text-lg text-gray-500">
                              ≈ {partner.show_net_prices && partnerOffer.display_price_net
                                ? formatPrice(partnerOffer.display_price_net)
                                : formatPrice(partnerOffer.display_price)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-3xl font-bold text-blue-600">
                          {partner.show_net_prices && partnerOffer.display_price_net
                            ? formatPrice(partnerOffer.display_price_net)
                            : formatPrice(partnerOffer.display_price)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <p className="font-medium text-gray-900">{t('partner.contactPerson')}</p>
                  {partner.contact_person && (
                    <p className="text-sm text-gray-600">{partner.contact_person}</p>
                  )}
                  {partner.phone && (
                    <a
                      href={`tel:${partner.phone.replace(/\s/g, '')}`}
                      className="block text-sm text-blue-600 hover:text-blue-700"
                    >
                      {partner.phone}
                    </a>
                  )}
                  {partner.email && (
                    <a
                      href={`mailto:${partner.email}`}
                      className="block text-sm text-blue-600 hover:text-blue-700"
                    >
                      {partner.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Partner Info Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {partner.company_name}
                </h3>
                {partner.company_address && (
                  <p className="text-sm text-gray-600">
                    {partner.company_address.split('<br>').map((line: string, i: number, arr: string[]) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>
            </div>

            {/* Key Parameters */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {t('detail.keyParameters')}
              </h2>
              <SpecsGrid
                year={offerData.year}
                mileage={offerData.mileage}
                fuelType={offerData.fuel_type}
                transmission={offerData.transmission}
                power={offerData.engine_power}
                location={offerData.seller_city}
                bodyType={offerData.body_type}
                colourType={offerData.colour_type}
              />
            </section>

            {/* Equipment */}
            {offerData.features && (
              <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('detail.equipment')}
                </h2>
                <EquipmentDisplay equipment={offerData.features as string[] | Record<string, string[]> | null | undefined} />
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price Card - Desktop only in sidebar */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {offerData.brand} {offerData.model}
                  {offerData.model_version && offerData.model_version !== 'Brak' && (
                    <span className="ml-2 text-gray-500 font-normal">{offerData.model_version}</span>
                  )}
                </h1>

                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    {t('partner.priceFor')} {partner.company_name} {partner.show_net_prices && `(${t('listing.net')})`}
                  </p>
                  {locale === 'pl' ? (
                    <>
                      <p className="text-3xl font-bold text-blue-600">
                        {partner.show_net_prices && partnerOffer.display_price_net
                          ? formatPrice(partnerOffer.display_price_net)
                          : formatPrice(partnerOffer.display_price)}
                      </p>
                      {settings?.show_eur_prices && settings?.exchange_rate_eur && partner.show_secondary_currency && (
                        <p className="text-lg text-gray-500">
                          ≈ {Math.round((partner.show_net_prices && partnerOffer.display_price_net ? partnerOffer.display_price_net : partnerOffer.display_price) / settings.exchange_rate_eur).toLocaleString()}
                          <span className="text-sm ml-0.5">€</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {settings?.show_eur_prices && settings?.exchange_rate_eur ? (
                        <>
                          <p className="text-3xl font-bold text-blue-600">
                            {Math.round((partner.show_net_prices && partnerOffer.display_price_net ? partnerOffer.display_price_net : partnerOffer.display_price) / settings.exchange_rate_eur).toLocaleString()}
                            <span className="text-xl ml-1">€</span>
                          </p>
                          {partner.show_secondary_currency && (
                            <p className="text-lg text-gray-500">
                              ≈ {partner.show_net_prices && partnerOffer.display_price_net
                                ? formatPrice(partnerOffer.display_price_net)
                                : formatPrice(partnerOffer.display_price)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-3xl font-bold text-blue-600">
                          {partner.show_net_prices && partnerOffer.display_price_net
                            ? formatPrice(partnerOffer.display_price_net)
                            : formatPrice(partnerOffer.display_price)}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <p className="font-medium text-gray-900">{t('partner.contactPerson')}</p>
                  {partner.contact_person && (
                    <p className="text-sm text-gray-600">{partner.contact_person}</p>
                  )}
                  {partner.phone && (
                    <a
                      href={`tel:${partner.phone.replace(/\s/g, '')}`}
                      className="block text-sm text-blue-600 hover:text-blue-700"
                    >
                      {partner.phone}
                    </a>
                  )}
                  {partner.email && (
                    <a
                      href={`mailto:${partner.email}`}
                      className="block text-sm text-blue-600 hover:text-blue-700"
                    >
                      {partner.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Partner Info - Desktop only in sidebar */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {partner.company_name}
                </h3>
                {partner.company_address && (
                  <p className="text-sm text-gray-600">
                    {partner.company_address.split('<br>').map((line: string, i: number, arr: string[]) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>

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
        </div>
      </main>
    </div>
  );
}
