import { notFound, redirect } from 'next/navigation';
import { findClientFilterByLegacySlug } from '@/lib/partners-server';

interface PartnerOfferPageProps {
  params: Promise<{
    locale: string;
    partner: string;
    id: string;
  }>;
}

export default async function LegacyPartnerOfferRedirectPage({ params }: PartnerOfferPageProps) {
  const { locale, partner: legacySlug, id } = await params;

  const resolved = await findClientFilterByLegacySlug(legacySlug);
  if (resolved) {
    redirect(`/${locale}/${resolved.partner.slug}/${resolved.filter.slug}/offer/${id}`);
  }

  notFound();
}
