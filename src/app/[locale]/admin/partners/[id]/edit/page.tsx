import { PartnerForm } from '@/components/partners/PartnerForm';
import { getPartnerById } from '@/lib/partners-server';
import { notFound } from 'next/navigation';

interface EditPartnerPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function EditPartnerPage({ params }: EditPartnerPageProps) {
  const { id } = await params;
  const partner = await getPartnerById(id);
  
  if (!partner) {
    notFound();
  }
  
  return <PartnerForm partner={partner} mode="edit" />;
}
