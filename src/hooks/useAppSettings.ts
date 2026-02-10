import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AppSettings } from '@/types/settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
        // Set default settings if fetch fails
        setSettings({
          id: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          site_name: 'CarShowroom',
          logo_url: null,
          favicon_url: null,
          default_currency: 'PLN',
          exchange_rate_eur: 4.5,
          show_eur_prices: true,
          contact_phone: '+48 123 456 789',
          contact_email: 'kontakt@carshowroom.pl',
          show_contact_buttons: true,
          show_dealer_info: true,
          show_dealer_name: true,
          show_dealer_address: true,
          show_dealer_rating: false,
          enable_financing_calculator: false,
          enable_contact_form: true,
          enable_whatsapp_button: false,
          show_secondary_currency: false,
          meta_title: null,
          meta_description: null,
          og_image_url: null,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const formatPrice = (pricePln: number | null, currency?: string): string => {
    if (!pricePln || !settings) return '-';

    const targetCurrency = currency || settings.default_currency;

    if (targetCurrency === 'EUR' && settings.show_eur_prices) {
      const eurPrice = pricePln / settings.exchange_rate_eur;
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(eurPrice);
    }

    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0,
    }).format(pricePln);
  };

  const getDualPrice = (pricePln: number | null): { pln: string; eur: string | null } => {
    if (!pricePln || !settings) {
      return { pln: '-', eur: null };
    }

    const pln = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0,
    }).format(pricePln);

    let eur = null;
    if (settings.show_eur_prices) {
      const eurPrice = pricePln / settings.exchange_rate_eur;
      eur = new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(eurPrice);
    }

    return { pln, eur };
  };

  return {
    settings,
    loading,
    error,
    formatPrice,
    getDualPrice,
  };
}
