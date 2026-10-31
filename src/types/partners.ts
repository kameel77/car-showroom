import { AdditionalCostItem, TransportCostTiers } from '@/lib/price-calculator';

export interface Partner {
  id: string;
  slug: string;
  company_name: string;
  company_address?: string;
  vat_number?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  default_margin_percent: number;
  show_net_prices: boolean;
  show_secondary_currency: boolean;
  financing_cost_percent: number;
  export_vat: number;
  additional_cost_items?: AdditionalCostItem[];
  transport_cost_tiers_eur?: TransportCostTiers;
  is_active: boolean;
  notes?: string;
  presentation_currency?: string;
  presentation_value?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientFilter {
  id: string;
  partner_id: string;
  name: string;
  slug: string;
  description?: string | null;
  source_query?: string | null;
  notes?: string | null;
  margin_percent?: number | null;
  financing_cost_percent?: number | null;
  additional_cost_items?: AdditionalCostItem[] | null;
  transport_cost_tiers_eur?: TransportCostTiers | null;
  is_active: boolean;
  last_imported_at?: string | null;
  last_import_filename?: string | null;
  last_import_count: number;
  offers_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientFilterInput {
  partner_id: string;
  name: string;
  slug: string;
  description?: string;
  source_query?: string;
  notes?: string;
  margin_percent?: number | null;
  financing_cost_percent?: number | null;
  additional_cost_items?: AdditionalCostItem[] | null;
  transport_cost_tiers_eur?: TransportCostTiers | null;
  is_active?: boolean;
}

export interface UpdateClientFilterInput {
  name?: string;
  slug?: string;
  description?: string;
  source_query?: string;
  notes?: string;
  margin_percent?: number | null;
  financing_cost_percent?: number | null;
  additional_cost_items?: AdditionalCostItem[] | null;
  transport_cost_tiers_eur?: TransportCostTiers | null;
  is_active?: boolean;
}

export interface ImportCarScoutOptions {
  mode: 'upsert' | 'replace';
  skipPlaceholders: boolean;
  filename?: string;
}

export interface ImportCarScoutResult {
  totalParsed: number;
  importedCount: number;
  skippedPlaceholdersCount: number;
  errorsCount: number;
  errors: string[];
}

export interface PartnerFilter {
  id: number;
  partner_id: string;
  filter_id?: string | null;
  brand_name: string;
  model_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface PartnerOffer {
  id: number;
  partner_id: string;
  filter_id?: string | null;
  offer_id: string;
  custom_price?: number | null;
  is_visible: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerOfferWithDetails extends PartnerOffer {
  offer: {
    id: string;
    advert_id?: string | null;
    brand: string;
    model: string;
    model_version?: string;
    year?: number;
    mileage?: number;
    price: number;
    fuel_type?: string;
    engine_power?: string;
    transmission?: string;
    main_photo_url?: string;
    additional_photos?: string[] | null;
    body_type?: string | null;
    color?: string | null;
    colour_type?: string | null;
    country_origin?: string | null;
    vat_invoice?: boolean | null;
    description?: string | null;
    seller_name?: string | null;
    seller_address?: string | null;
    seller_city?: string | null;
    seller_region?: string | null;
    technical_spec?: Record<string, any> | null;
    features?: Record<string, any> | null;
    advert_url?: string | null;
  };
  calculated_price: number;
  calculated_price_net: number;
  margin_percent: number;
  show_net_prices: boolean;
  presentation_currency?: string;
  presentation_value?: string;
}

export interface CreatePartnerInput {
  slug: string;
  company_name: string;
  company_address?: string;
  vat_number?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  default_margin_percent?: number;
  show_net_prices?: boolean;
  show_secondary_currency?: boolean;
  financing_cost_percent?: number;
  export_vat?: number;
  additional_cost_items?: AdditionalCostItem[];
  transport_cost_tiers_eur?: TransportCostTiers;
  is_active?: boolean;
  notes?: string;
  presentation_currency?: string;
  presentation_value?: string;
}

export interface UpdatePartnerInput {
  company_name?: string;
  company_address?: string;
  vat_number?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  default_margin_percent?: number;
  show_net_prices?: boolean;
  show_secondary_currency?: boolean;
  financing_cost_percent?: number;
  export_vat?: number;
  additional_cost_items?: AdditionalCostItem[];
  transport_cost_tiers_eur?: TransportCostTiers;
  is_active?: boolean;
  notes?: string;
  presentation_currency?: string;
  presentation_value?: string;
}

export interface CreatePartnerFilterInput {
  partner_id: string;
  brand_name: string;
  model_name?: string;
}

export interface UpdatePartnerOfferInput {
  custom_price?: number | null;
  is_visible?: boolean;
  notes?: string;
}

export interface PartnerPublicOffer {
  offer_id: string;
  brand: string;
  model: string;
  model_version?: string;
  year?: number;
  mileage?: number;
  price: number;
  display_price: number;
  display_price_net?: number;
  custom_price?: number;
  show_net_prices?: boolean;
  show_secondary_currency?: boolean;
  presentation_currency?: string;
  presentation_value?: string;
  fuel_type?: string;
  engine_power?: string;
  transmission?: string;
  main_photo_url?: string;
  features?: Record<string, any>;
  technical_spec?: Record<string, any>;
}
