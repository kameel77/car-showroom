'use server';

import { supabase, supabaseAdmin } from '@/lib/supabase';
import { AppSettings } from '@/types/settings';

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function updateGlobalPricingSettings(exchangeRateEur: number, plVat: number): Promise<void> {
  const current = await getAppSettings();
  if (!current) throw new Error('Nie znaleziono ustawień aplikacji');

  const { error } = await supabaseAdmin
    .from('app_settings')
    .update({
      exchange_rate_eur: exchangeRateEur,
      pl_vat: plVat,
      updated_at: new Date().toISOString()
    })
    .eq('id', current.id);

  if (error) {
    throw new Error('Nie udało się zapisać ustawień: ' + error.message);
  }
}

