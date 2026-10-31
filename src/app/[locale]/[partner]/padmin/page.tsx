import { notFound, redirect } from 'next/navigation';
import { findClientFilterByLegacySlug } from '@/lib/partners-server';

interface PartnerSelfAdminPageProps {
  params: Promise<{
    locale: string;
    partner: string;
  }>;
}

export default async function LegacyPartnerSelfAdminRedirectPage({ params }: PartnerSelfAdminPageProps) {
  const { locale, partner: legacySlug } = await params;

  const resolved = await findClientFilterByLegacySlug(legacySlug);
  if (resolved) {
    redirect(`/${locale}/${resolved.partner.slug}/${resolved.filter.slug}/padmin`);
  }

  notFound();
}
