import { getTranslations } from 'next-intl/server';
import { ListingCard, ListingCardSkeleton } from '@/components/ListingCard';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { getBrandModels } from '@/lib/filters-server';
import { CarOffer } from '@/types/car';

export const revalidate = 60;

async function getListings(): Promise<CarOffer[]> {
  // Get allowed brands (with original case from DB)
  const { data: brandFilters, error: brandsError } = await supabase
    .from('brand_filters')
    .select('brand_name')
    .eq('is_active', true);

  if (brandsError) {
    console.error('Error fetching brand filters:', brandsError);
  }

  const allowedBrands = (brandFilters || []).map(b => b.brand_name.toLowerCase());
  
  // If no filters configured, show all (backward compatibility)
  if (allowedBrands.length === 0) {
    const { data, error } = await supabase
      .from('car_offers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Error fetching listings:', error);
      return [];
    }

    return data || [];
  }

  // Get all offers and filter case-insensitively
  const { data, error } = await supabase
    .from('car_offers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching listings:', error);
    return [];
  }

  // Filter by brands (case-insensitive) and models
  const filteredOffers: CarOffer[] = [];
  
  for (const offer of (data || [])) {
    const offerBrand = (offer.brand || '').toLowerCase();
    
    // Check if brand is allowed
    if (!allowedBrands.includes(offerBrand)) {
      continue;
    }
    
    // Check model restrictions
    const allowedModels = await getBrandModels(offer.brand || '');
    
    // If no models specified for this brand, allow all
    if (allowedModels.length === 0) {
      filteredOffers.push(offer);
      continue;
    }
    
    // Check if model is allowed
    if (offer.model && allowedModels.includes(offer.model.toLowerCase())) {
      filteredOffers.push(offer);
    }
  }

  return filteredOffers.slice(0, 30);
}

export default async function HomePage() {
  const t = await getTranslations();
  const listings = await getListings();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {t('nav.offers')}
          </h1>
          <p className="text-gray-600">
            {t('common.found')}: <span className="font-semibold text-gray-900">{listings.length}</span> {t('common.offers')}
          </p>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.length > 0 ? (
            listings.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} index={index} />
            ))
          ) : (
            <div className="col-span-full py-16 text-center">
              <p className="text-lg font-medium text-gray-900">
                Brak dostępnych ofert
              </p>
              <p className="text-gray-500 mt-1">
                Sprawdź później lub skontaktuj się z nami
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
