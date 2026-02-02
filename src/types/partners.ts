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
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerFilter {
  id: number;
  partner_id: string;
  brand_name: string;
  model_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface PartnerOffer {
  id: number;
  partner_id: string;
  offer_id: string;
  custom_price?: number;
  is_visible: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerOfferWithDetails extends PartnerOffer {
  offer: {
    id: string;
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
  };
  calculated_price: number;
  margin_percent: number;
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
  is_active?: boolean;
  notes?: string;
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
  is_active?: boolean;
  notes?: string;
}

export interface CreatePartnerFilterInput {
  partner_id: string;
  brand_name: string;
  model_name?: string;
}

export interface UpdatePartnerOfferInput {
  custom_price?: number;
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
  fuel_type?: string;
  engine_power?: string;
  transmission?: string;
  main_photo_url?: string;
  features?: Record<string, any>;
  technical_spec?: Record<string, any>;
}
