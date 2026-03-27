'use client';

import React, { useState, useEffect } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { updateGlobalPricingSettings } from '@/lib/settings-server';
import { Loader2, Save, Euro, Percent } from 'lucide-react';

export function GlobalPricingSettings() {
  const { settings, loading, mutate } = useAppSettings();
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [plVat, setPlVat] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setExchangeRate(settings.exchange_rate_eur.toString());
      setPlVat((settings.pl_vat ?? 23).toString());
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const rateNum = parseFloat(exchangeRate);
      const vatNum = parseFloat(plVat);

      if (isNaN(rateNum) || rateNum <= 0) throw new Error('Nieprawidłowy kurs EUR');
      if (isNaN(vatNum) || vatNum < 0) throw new Error('Nieprawidłowy VAT PLN');

      await updateGlobalPricingSettings(rateNum, vatNum);
      await mutate();
      setMessage({ type: 'success', text: 'Zapisano ustawienia globalne.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Wystąpił błąd' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex mb-6 items-center justify-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Ustawienia Globalne</h2>
        <p className="text-sm text-gray-500">Wartości wykorzystywane do bazowych przeliczeń marży (Arbitraż).</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Euro className="h-4 w-4" />
            Kurs EUR
          </label>
          <input
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            min="0.0001"
            step="0.0001"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="w-full sm:w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Percent className="h-4 w-4" />
            PL VAT (%) zakupu
          </label>
          <input
            type="number"
            value={plVat}
            onChange={(e) => setPlVat(e.target.value)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !exchangeRate || !plVat}
          className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Zapisz
        </button>

        {message && (
          <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'} flex-1`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
