export interface AppSettings {
  id: number;
  created_at: string;
  updated_at: string;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  default_currency: string;
  exchange_rate_eur: number;
  show_eur_prices: boolean;
  show_secondary_currency: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  show_contact_buttons: boolean;
  show_dealer_info: boolean;
  show_dealer_name: boolean;
  show_dealer_address: boolean;
  show_dealer_rating: boolean;
  enable_financing_calculator: boolean;
  enable_contact_form: boolean;
  enable_whatsapp_button: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
}
