import { supabase } from '@/lib/supabase';

export async function getAllowedBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from('brand_filters')
    .select('brand_name')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('brand_name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(b => b.brand_name.toLowerCase());
}

export async function getBrandModels(brandName: string): Promise<string[]> {
  // Get brand filter id (case-insensitive)
  const { data: brandData, error: brandError } = await supabase
    .from('brand_filters')
    .select('id')
    .ilike('brand_name', brandName)
    .eq('is_active', true)
    .single();

  if (brandError || !brandData) {
    return [];
  }

  // Get models for this brand
  const { data: modelsData, error: modelsError } = await supabase
    .from('model_filters')
    .select('model_name')
    .eq('brand_filter_id', brandData.id)
    .eq('is_active', true);

  if (modelsError || !modelsData || modelsData.length === 0) {
    return []; // Empty means all models allowed
  }

  return modelsData.map(m => m.model_name.toLowerCase());
}

export async function isOfferAllowed(brand: string | null, model: string | null): Promise<boolean> {
  if (!brand) return false;

  const allowedBrands = await getAllowedBrands();
  
  // If no brands configured, allow all (backward compatibility)
  if (allowedBrands.length === 0) {
    return true;
  }

  const brandLower = brand.toLowerCase();
  if (!allowedBrands.includes(brandLower)) {
    return false;
  }

  // Check model restrictions
  if (model) {
    const allowedModels = await getBrandModels(brand);
    
    // If no models specified for this brand, allow all
    if (allowedModels.length === 0) {
      return true;
    }

    return allowedModels.includes(model.toLowerCase());
  }

  return true;
}
