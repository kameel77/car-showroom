export interface BrandFilter {
  id: number;
  created_at: string;
  updated_at: string;
  brand_name: string;
  is_active: boolean;
  display_order: number;
  notes: string | null;
}

export interface ModelFilter {
  id: number;
  created_at: string;
  brand_filter_id: number;
  model_name: string;
  is_active: boolean;
}

export interface FilterConfig {
  brands: BrandFilter[];
  models: Record<string, ModelFilter[]>; // brand -> models
}
