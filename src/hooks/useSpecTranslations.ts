import { useTranslations } from 'next-intl';

export function useSpecTranslations() {
  const t = useTranslations('specs');

  const translateFuel = (fuelType: string | null): string => {
    if (!fuelType) return '-';
    
    const fuelMap: Record<string, string> = {
      'petrol': t('fuel.petrol'),
      'diesel': t('fuel.diesel'),
      'electric': t('fuel.electric'),
      'hybrid': t('fuel.hybrid'),
      'plugin_hybrid': t('fuel.plugin_hybrid'),
      'lpg': t('fuel.lpg'),
      'cng': t('fuel.cng'),
      'other': t('fuel.other'),
      // Polish variants
      'benzyna': t('fuel.petrol'),
      'elektryczny': t('fuel.electric'),
      'hybryda': t('fuel.hybrid'),
    };

    return fuelMap[fuelType.toLowerCase()] || fuelType;
  };

  const translateTransmission = (transmission: string | null): string => {
    if (!transmission) return '-';
    
    const transmissionMap: Record<string, string> = {
      'automatic': t('transmission.automatic'),
      'manual': t('transmission.manual'),
      'semi_automatic': t('transmission.semi_automatic'),
      'cvt': t('transmission.cvt'),
      // Polish variants
      'automatyczna': t('transmission.automatic'),
      'manualna': t('transmission.manual'),
    };

    return transmissionMap[transmission.toLowerCase()] || transmission;
  };

  const translateBodyType = (bodyType: string | null): string => {
    if (!bodyType) return '-';
    
    const bodyTypeMap: Record<string, string> = {
      'sedan': t('bodyType.sedan'),
      'hatchback': t('bodyType.hatchback'),
      'kombi': t('bodyType.kombi'),
      'suv': t('bodyType.suv'),
      'coupe': t('bodyType.coupe'),
      'cabrio': t('bodyType.cabrio'),
      'pickup': t('bodyType.pickup'),
      'van': t('bodyType.van'),
      'minivan': t('bodyType.minivan'),
      'other': t('bodyType.other'),
    };

    return bodyTypeMap[bodyType.toLowerCase()] || bodyType;
  };

  const translateColourType = (colourType: string | null): string => {
    if (!colourType) return '-';
    
    const colourTypeMap: Record<string, string> = {
      'metallic': t('colourType.metallic'),
      'matte': t('colourType.matte'),
      'pearl': t('colourType.pearl'),
      'solid': t('colourType.solid'),
      'other': t('colourType.other'),
      // Polish variants
      'metalik': t('colourType.metallic'),
      'mat': t('colourType.matte'),
      'perłowy': t('colourType.pearl'),
    };

    return colourTypeMap[colourType.toLowerCase()] || colourType;
  };

  return {
    translateFuel,
    translateTransmission,
    translateBodyType,
    translateColourType,
  };
}
