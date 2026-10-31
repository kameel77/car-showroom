import { notFound, redirect } from 'next/navigation';
import { findClientFilterByLegacySlug } from '@/lib/partners-server';

interface PartnerPageProps {
  params: Promise<{
    locale: string;
    partner: string;
  }>;
}

export default async function LegacyPartnerRedirectPage({ params }: PartnerPageProps) {
  const { locale, partner: legacySlug } = await params;

  const resolved = await findClientFilterByLegacySlug(legacySlug);
  if (resolved) {
    redirect(`/${locale}/${resolved.partner.slug}/${resolved.filter.slug}`);
  }

  notFound();
}
