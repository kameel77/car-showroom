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

  const payload: any = {
    exchange_rate_eur: exchangeRateEur,
    pl_vat: plVat,
    updated_at: new Date().toISOString()
  };

  let { error } = await supabaseAdmin
    .from('app_settings')
    .update(payload)
    .eq('id', current.id);

  if (error && (error.message.includes('does not exist') || error.message.includes('schema cache'))) {
    console.warn('Some app_settings columns missing in DB, retrying update with backward-compatible payload...');
    delete payload.pl_vat; // Remove the new column to allow saving the old ones (like exchange_rate_eur)
    
    const retry = await supabaseAdmin
      .from('app_settings')
      .update(payload)
      .eq('id', current.id);
    
    error = retry.error;
  }

  if (error) {
    throw new Error('Nie udało się zapisać ustawień: ' + error.message);
  }
}

