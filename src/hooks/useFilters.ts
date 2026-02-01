import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BrandFilter, ModelFilter } from '@/types/filters';

export function useFilters() {
  const [brands, setBrands] = useState<BrandFilter[]>([]);
  const [models, setModels] = useState<Record<number, ModelFilter[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brand_filters')
        .select('*')
        .order('display_order', { ascending: true })
        .order('brand_name', { ascending: true });

      if (brandsError) throw brandsError;
      
      setBrands(brandsData || []);
      
      // Fetch models for each brand
      if (brandsData && brandsData.length > 0) {
        const brandIds = brandsData.map(b => b.id);
        const { data: modelsData, error: modelsError } = await supabase
          .from('model_filters')
          .select('*')
          .in('brand_filter_id', brandIds);

        if (modelsError) throw modelsError;
        
        // Group models by brand
        const modelsByBrand: Record<number, ModelFilter[]> = {};
        brandsData.forEach(brand => {
          modelsByBrand[brand.id] = (modelsData || []).filter(m => m.brand_filter_id === brand.id);
        });
        
        setModels(modelsByBrand);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const addBrand = async (brandName: string, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('brand_filters')
        .insert([{ brand_name: brandName, notes }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchFilters();
      return data;
    } catch (err) {
      throw err;
    }
  };

  const removeBrand = async (brandId: number) => {
    try {
      const { error } = await supabase
        .from('brand_filters')
        .delete()
        .eq('id', brandId);

      if (error) throw error;
      
      await fetchFilters();
    } catch (err) {
      throw err;
    }
  };

  const toggleBrand = async (brandId: number, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('brand_filters')
        .update({ is_active: isActive })
        .eq('id', brandId);

      if (error) throw error;
      
      setBrands(prev => prev.map(b => 
        b.id === brandId ? { ...b, is_active: isActive } : b
      ));
    } catch (err) {
      throw err;
    }
  };

  const addModel = async (brandId: number, modelName: string) => {
    try {
      const { data, error } = await supabase
        .from('model_filters')
        .insert([{ brand_filter_id: brandId, model_name: modelName }])
        .select()
        .single();

      if (error) throw error;
      
      setModels(prev => ({
        ...prev,
        [brandId]: [...(prev[brandId] || []), data]
      }));
      
      return data;
    } catch (err) {
      throw err;
    }
  };

  const removeModel = async (brandId: number, modelId: number) => {
    try {
      const { error } = await supabase
        .from('model_filters')
        .delete()
        .eq('id', modelId);

      if (error) throw error;
      
      setModels(prev => ({
        ...prev,
        [brandId]: (prev[brandId] || []).filter(m => m.id !== modelId)
      }));
    } catch (err) {
      throw err;
    }
  };

  const isBrandAllowed = (brandName: string): boolean => {
    const brand = brands.find(b => b.brand_name.toLowerCase() === brandName.toLowerCase());
    return brand ? brand.is_active : false;
  };

  const isModelAllowed = (brandName: string, modelName: string): boolean => {
    const brand = brands.find(b => b.brand_name.toLowerCase() === brandName.toLowerCase());
    if (!brand || !brand.is_active) return false;
    
    const brandModels = models[brand.id] || [];
    if (brandModels.length === 0) return true; // No restrictions
    
    return brandModels.some(m => 
      m.model_name.toLowerCase() === modelName.toLowerCase() && m.is_active
    );
  };

  return {
    brands,
    models,
    loading,
    error,
    refresh: fetchFilters,
    addBrand,
    removeBrand,
    toggleBrand,
    addModel,
    removeModel,
    isBrandAllowed,
    isModelAllowed,
  };
}
