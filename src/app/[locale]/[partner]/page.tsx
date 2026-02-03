import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { PartnerPublicOffer } from '@/types/partners';
import { getPartnerBySlug, getPartnerPublicOffers } from '@/lib/partners-server';
import { PartnerListingCard } from '@/components/partners/PartnerListingCard';

interface PartnerPageProps {
  params: Promise<{
    locale: string;
    partner: string;
  }>;
}

export async function generateMetadata({ params }: PartnerPageProps): Promise<Metadata> {
  const { partner: partnerSlug } = await params;
  const partner = await getPartnerBySlug(partnerSlug);

  if (!partner) {
    const t = await getTranslations();
    return {
      title: t('detail.notFound'),
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${partner.company_name} - Oferty specjalne`,
    description: `Sprawdź wyselekcjonowane oferty samochodowe dla ${partner.company_name}`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { locale, partner: partnerSlug } = await params;
  const t = await getTranslations();

  // Get partner data
  const partner = await getPartnerBySlug(partnerSlug);

  if (!partner) {
    notFound();
  }

  // Get partner offers with calculated prices
  const offers = await getPartnerPublicOffers(partnerSlug);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Partner Header */}
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {partner.company_name}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('partner.specialOffers')}
              </p>
            </div>

            {partner.contact_person && (
              <div className="text-sm text-gray-600">
                <p className="font-medium">{partner.contact_person}</p>
                {partner.phone && <p>{partner.phone}</p>}
                {partner.email && <p>{partner.email}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Offers Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {t('partner.availableOffers')}: <span className="font-semibold text-gray-900">{offers.length}</span>
          </p>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {offers.length > 0 ? (
            offers.map((offer, index) => (
              <PartnerListingCard
                key={offer.offer_id}
                offer={offer}
                partnerSlug={partnerSlug}
                locale={locale}
                index={index}
              />
            ))
          ) : (
            <div className="col-span-full py-16 text-center">
              <p className="text-lg font-medium text-gray-900">
                {t('partner.noOffersAvailable')}
              </p>
              <p className="text-gray-500 mt-1">
                {t('partner.checkLaterOrContact')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            {t('partner.footerOffersPreparedFor')} {partner.company_name}
          </p>
          <p className="mt-1">
            {partner.show_net_prices
              ? t('partner.footerAllPricesNet')
              : t('partner.footerAllPricesGross')}
          </p>
        </div>
      </main>
    </div>
  );
}
