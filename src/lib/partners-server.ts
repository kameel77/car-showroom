'use server';

import { supabase } from './supabase';
import {
  Partner,
  PartnerFilter,
  PartnerOffer,
  PartnerOfferWithDetails,
  PartnerPublicOffer,
  CreatePartnerInput,
  UpdatePartnerInput,
  CreatePartnerFilterInput,
  UpdatePartnerOfferInput,
} from '@/types/partners';
import { calculateDisplayPrice, calculateNetPrice } from './price-calculator';

import { revalidatePath } from 'next/cache';

/**
 * Get all partners
 */
export async function getPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partners:', error);
    throw new Error(`Failed to fetch partners: ${error.message}`);
  }

  return data || [];
}

/**
 * Get partner by ID
 */
export async function getPartnerById(id: string): Promise<Partner | null> {
  if (!id || id === 'undefined' || id === 'null') {
    console.error('Invalid partner ID:', id);
    return null;
  }

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching partner:', error);
    return null;
  }

  return data;
}

/**
 * Get partner by slug (for public pages)
 */
export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching partner by slug:', error);
    return null;
  }

  return data;
}

/**
 * Create new partner
 */
export async function createPartner(input: CreatePartnerInput): Promise<Partner> {
  // Validate slug format (only lowercase letters, numbers, and hyphens)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(input.slug)) {
    throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
  }

  // Try to create with all fields
  const { data, error } = await supabase
    .from('partners')
    .insert({
      ...input,
      slug: input.slug.toLowerCase(),
      default_margin_percent: input.default_margin_percent || 0,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    // If column doesn't exist, try again without it
    if (error.message.includes('column "show_secondary_currency" does not exist')) {
      console.warn('Column "show_secondary_currency" missing in DB, retrying create without it...');
      const { show_secondary_currency, ...safeInput } = input as any;

      const { data: retryData, error: retryError } = await supabase
        .from('partners')
        .insert({
          ...safeInput,
          slug: input.slug.toLowerCase(),
          default_margin_percent: input.default_margin_percent || 0,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (retryError) {
        console.error('Error creating partner (retry):', retryError);
        throw new Error(`Failed to create partner: ${retryError.message}`);
      }

      revalidatePath('/admin/partners');
      return retryData;
    }

    console.error('Error creating partner:', error);
    if (error.code === '23505') {
      throw new Error('Partner with this slug already exists');
    }
    throw new Error(`Failed to create partner: ${error.message}`);
  }

  revalidatePath('/admin/partners');
  return data;
}

/**
 * Update partner
 */
export async function updatePartner(
  id: string,
  input: UpdatePartnerInput
): Promise<Partner> {
  console.log('Updating partner:', id, input);

  // Try to update with all fields
  const { data, error } = await supabase
    .from('partners')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    // If column doesn't exist, try again without it
    if (error.message.includes('column "show_secondary_currency" does not exist')) {
      console.warn('Column "show_secondary_currency" missing in DB, retrying without it...');
      const { show_secondary_currency, ...safeInput } = input as any;

      const { data: retryData, error: retryError } = await supabase
        .from('partners')
        .update({
          ...safeInput,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (retryError) {
        console.error('Error updating partner (retry):', retryError);
        throw new Error(`Failed to update partner: ${retryError.message}`);
      }

      revalidatePath('/admin/partners');
      revalidatePath(`/admin/partners/${id}/edit`);
      return retryData;
    }

    console.error('Error updating partner:', error);
    throw new Error(`Failed to update partner: ${error.message}`);
  }

  revalidatePath('/admin/partners');
  revalidatePath(`/admin/partners/${id}/edit`);
  return data;
}

/**
 * Delete partner
 */
export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting partner:', error);
    throw new Error(`Failed to delete partner: ${error.message}`);
  }

  revalidatePath('/admin/partners');
}

/**
 * Get partner filters
 */
export async function getPartnerFilters(partnerId: string): Promise<PartnerFilter[]> {
  if (!partnerId || partnerId === 'undefined' || partnerId === 'null') {
    console.error('Invalid partner ID for filters:', partnerId);
    return [];
  }

  const { data, error } = await supabase
    .from('partner_filters')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('is_active', true)
    .order('brand_name');

  if (error) {
    console.error('Error fetching partner filters:', error);
    throw new Error('Failed to fetch partner filters');
  }

  return data || [];
}

/**
 * Create partner filter
 */
export async function createPartnerFilter(
  input: CreatePartnerFilterInput
): Promise<PartnerFilter> {
  const { data, error } = await supabase
    .from('partner_filters')
    .insert({
      partner_id: input.partner_id,
      brand_name: input.brand_name,
      model_name: input.model_name || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating partner filter:', error);
    throw new Error('Failed to create partner filter');
  }

  return data;
}

/**
 * Delete partner filter
 */
export async function deletePartnerFilter(filterId: number): Promise<void> {
  const { error } = await supabase
    .from('partner_filters')
    .delete()
    .eq('id', filterId);

  if (error) {
    console.error('Error deleting partner filter:', error);
    throw new Error('Failed to delete partner filter');
  }
}

/**
 * Get partner offers with details (for admin view)
 */
export async function getPartnerOffersWithDetails(
  partnerId: string
): Promise<PartnerOfferWithDetails[]> {
  if (!partnerId || partnerId === 'undefined' || partnerId === 'null') {
    console.error('Invalid partner ID for offers:', partnerId);
    throw new Error('Invalid partner ID');
  }

  // First get partner info
  const partner = await getPartnerById(partnerId);
  if (!partner) {
    throw new Error('Partner not found');
  }

  // Get filters to determine which offers to show
  const filters = await getPartnerFilters(partnerId);

  // Build query for offers
  let query = supabase
    .from('car_offers')
    .select('*');

  // If filters exist, apply them
  if (filters.length > 0) {
    const brandFilters = filters.filter(f => !f.model_name);
    const modelFilters = filters.filter(f => f.model_name);

    if (brandFilters.length > 0 || modelFilters.length > 0) {
      const brandNames = brandFilters.map(f => f.brand_name.toLowerCase());
      const modelConditions = modelFilters.map(f => ({
        brand: f.brand_name.toLowerCase(),
        model: f.model_name!.toLowerCase(),
      }));

      // This is a simplified filter - in production you'd build a more complex query
      // For now, we'll fetch all and filter in memory
    }
  }

  const { data: offers, error: offersError } = await query.order('created_at', { ascending: false });

  if (offersError) {
    console.error('Error fetching offers:', offersError);
    throw new Error('Failed to fetch offers');
  }

  // Get partner offers (custom prices and visibility)
  const { data: partnerOffers, error: poError } = await supabase
    .from('partner_offers')
    .select('*')
    .eq('partner_id', partnerId);

  if (poError) {
    console.error('Error fetching partner offers:', poError);
    throw new Error('Failed to fetch partner offers');
  }

  // Create a map for quick lookup
  const partnerOffersMap = new Map(
    (partnerOffers || []).map(po => [po.offer_id, po])
  );

  // Filter offers based on partner filters
  let filteredOffers = offers || [];
  if (filters.length > 0) {
    const brandFilters = filters.filter(f => !f.model_name).map(f => f.brand_name.toLowerCase());
    const modelFilters = filters.filter(f => f.model_name).map(f => ({
      brand: f.brand_name.toLowerCase(),
      model: f.model_name!.toLowerCase(),
    }));

    filteredOffers = filteredOffers.filter(offer => {
      const offerBrand = offer.brand?.toLowerCase();
      const offerModel = offer.model?.toLowerCase();

      // Check if matches brand filter (all models)
      if (brandFilters.includes(offerBrand)) {
        return true;
      }

      // Check if matches specific model filter
      return modelFilters.some(
        f => f.brand === offerBrand && f.model === offerModel
      );
    });
  }

  // Combine data
  const result: PartnerOfferWithDetails[] = filteredOffers.map(offer => {
    const partnerOffer = partnerOffersMap.get(offer.id);
    const calculatedPrice = calculateDisplayPrice({
      basePrice: offer.price,
      marginPercent: partner.default_margin_percent,
      customPrice: partnerOffer?.custom_price,
    });

    // Calculate net price (remove 23% VAT)
    const calculatedPriceNet = calculateNetPrice(calculatedPrice);

    return {
      id: partnerOffer?.id || 0,
      partner_id: partnerId,
      offer_id: offer.id,
      custom_price: partnerOffer?.custom_price,
      is_visible: partnerOffer?.is_visible ?? true,
      notes: partnerOffer?.notes,
      created_at: partnerOffer?.created_at || new Date().toISOString(),
      updated_at: partnerOffer?.updated_at || new Date().toISOString(),
      offer: {
        id: offer.id,
        brand: offer.brand,
        model: offer.model,
        model_version: offer.model_version,
        year: offer.year,
        mileage: offer.mileage,
        price: offer.price,
        fuel_type: offer.fuel_type,
        engine_power: offer.engine_power,
        transmission: offer.transmission,
        main_photo_url: offer.main_photo_url,
      },
      calculated_price: calculatedPrice,
      calculated_price_net: calculatedPriceNet,
      margin_percent: partner.default_margin_percent,
      show_net_prices: partner.show_net_prices ?? false,
    };
  });

  return result;
}

/**
 * Update partner offer (custom price, visibility)
 */
export async function updatePartnerOffer(
  partnerId: string,
  offerId: string,
  input: UpdatePartnerOfferInput
): Promise<PartnerOffer> {
  // Check if partner_offer exists
  const { data: existing } = await supabase
    .from('partner_offers')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('offer_id', offerId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('partner_offers')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating partner offer:', error);
      throw new Error('Failed to update partner offer');
    }

    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('partner_offers')
      .insert({
        partner_id: partnerId,
        offer_id: offerId,
        custom_price: input.custom_price,
        is_visible: input.is_visible ?? true,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating partner offer:', error);
      throw new Error('Failed to create partner offer');
    }

    return data;
  }
}

/**
 * Bulk update partner offers
 */
export async function bulkUpdatePartnerOffers(
  partnerId: string,
  offerIds: string[],
  input: UpdatePartnerOfferInput
): Promise<void> {
  for (const offerId of offerIds) {
    await updatePartnerOffer(partnerId, offerId, input);
  }
}

/**
 * Get public offers for partner (for partner showroom page)
 */
export async function getPartnerPublicOffers(
  slug: string
): Promise<PartnerPublicOffer[]> {
  const { data, error } = await supabase
    .rpc('get_partner_offers', { partner_slug: slug });

  if (error) {
    console.error('Error fetching partner public offers:', error);
    throw new Error('Failed to fetch partner offers');
  }

  return data || [];
}

/**
 * Get single public offer for partner
 */
export async function getPartnerPublicOffer(
  slug: string,
  offerId: string
): Promise<PartnerPublicOffer | null> {
  const offers = await getPartnerPublicOffers(slug);
  return offers.find(o => o.offer_id === offerId) || null;
}
