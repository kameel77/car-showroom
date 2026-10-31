import { redirect } from 'next/navigation';
import { getClientFilters } from '@/lib/partners-server';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PartnerOffersRedirectPage({ params }: Props) {
  const { locale, id } = await params;
  const filters = await getClientFilters(id);

  if (filters.length > 0) {
    redirect(`/${locale}/admin/partners/${id}/filters/${filters[0].id}/offers`);
  }

  redirect(`/${locale}/admin/partners`);
}
