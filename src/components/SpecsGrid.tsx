'use client';

import { useTranslations } from 'next-intl';
import { 
  Calendar, 
  Gauge, 
  Fuel, 
  Settings2,
  Zap,
  MapPin,
  Car,
  Palette
} from 'lucide-react';

interface SpecsGridProps {
  year: number | null;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  power: string | null;
  location: string | null;
  bodyType: string | null;
  colourType: string | null;
}

export function SpecsGrid({ 
  year, 
  mileage, 
  fuelType, 
  transmission, 
  power, 
  location,
  bodyType,
  colourType 
}: SpecsGridProps) {
  const t = useTranslations();
  const tSpecs = useTranslations('specs');

  const formatMileage = (mileage: number | null) => {
    if (!mileage) return '-';
    return mileage.toLocaleString();
  };

  const translateFuel = (fuel: string | null): string => {
    if (!fuel) return '-';
    const fuelMap: Record<string, string> = {
      'petrol': tSpecs('fuel.petrol'),
      'diesel': tSpecs('fuel.diesel'),
      'electric': tSpecs('fuel.electric'),
      'hybrid': tSpecs('fuel.hybrid'),
      'plugin_hybrid': tSpecs('fuel.plugin_hybrid'),
      'lpg': tSpecs('fuel.lpg'),
      'cng': tSpecs('fuel.cng'),
      'other': tSpecs('fuel.other'),
    };
    return fuelMap[fuel.toLowerCase()] || fuel;
  };

  const translateTransmission = (trans: string | null): string => {
    if (!trans) return '-';
    const transMap: Record<string, string> = {
      'automatic': tSpecs('transmission.automatic'),
      'manual': tSpecs('transmission.manual'),
      'semi_automatic': tSpecs('transmission.semi_automatic'),
      'cvt': tSpecs('transmission.cvt'),
    };
    return transMap[trans.toLowerCase()] || trans;
  };

  const translateBodyType = (body: string | null): string => {
    if (!body) return '-';
    const bodyMap: Record<string, string> = {
      'sedan': tSpecs('bodyType.sedan'),
      'hatchback': tSpecs('bodyType.hatchback'),
      'kombi': tSpecs('bodyType.kombi'),
      'suv': tSpecs('bodyType.suv'),
      'coupe': tSpecs('bodyType.coupe'),
      'cabrio': tSpecs('bodyType.cabrio'),
      'pickup': tSpecs('bodyType.pickup'),
      'van': tSpecs('bodyType.van'),
      'minivan': tSpecs('bodyType.minivan'),
      'other': tSpecs('bodyType.other'),
    };
    return bodyMap[body.toLowerCase()] || body;
  };

  const translateColourType = (colour: string | null): string => {
    if (!colour) return '-';
    const colourMap: Record<string, string> = {
      'metallic': tSpecs('colourType.metallic'),
      'matte': tSpecs('colourType.matte'),
      'pearl': tSpecs('colourType.pearl'),
      'solid': tSpecs('colourType.solid'),
      'other': tSpecs('colourType.other'),
    };
    return colourMap[colour.toLowerCase()] || colour;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Calendar className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-500">{t('listing.year')}</p>
          <p className="font-semibold text-gray-900">{year || '-'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Gauge className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-500">{t('listing.mileage')}</p>
          <p className="font-semibold text-gray-900">
            {formatMileage(mileage)} {t('listing.km')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Fuel className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-500">{t('listing.fuel')}</p>
          <p className="font-semibold text-gray-900">{translateFuel(fuelType)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Settings2 className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-500">{t('listing.transmission')}</p>
          <p className="font-semibold text-gray-900">{translateTransmission(transmission)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Zap className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-500">{t('listing.power')}</p>
          <p className="font-semibold text-gray-900">{power || '-'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <MapPin className="h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs text-gray-500">{t('listing.location')}</p>
          <p className="font-semibold text-gray-900">{location || '-'}</p>
        </div>
      </div>
      {bodyType && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Car className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500">{t('listing.bodyType')}</p>
            <p className="font-semibold text-gray-900">{translateBodyType(bodyType)}</p>
          </div>
        </div>
      )}
      {colourType && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Palette className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500">{t('listing.colourType')}</p>
            <p className="font-semibold text-gray-900">{translateColourType(colourType)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
