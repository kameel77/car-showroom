/**
 * Price calculator utility for partner pricing
 */

export interface PriceCalculationParams {
  basePrice: number;
  marginPercent: number;
  customPrice?: number | null;
}

/**
 * Calculate display price for partner
 * Priority: customPrice > basePrice + margin > basePrice
 */
export function calculateDisplayPrice({
  basePrice,
  marginPercent,
  customPrice,
}: PriceCalculationParams): number {
  // If custom price is set, use it
  if (customPrice !== undefined && customPrice !== null) {
    return customPrice;
  }

  // Otherwise calculate with margin
  if (marginPercent > 0) {
    return Math.round(basePrice * (1 + marginPercent / 100));
  }

  // Return base price if no margin
  return basePrice;
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Calculate price difference (margin amount)
 */
export function calculateMarginAmount(
  basePrice: number,
  displayPrice: number
): number {
  return displayPrice - basePrice;
}

/**
 * Calculate margin percentage from prices
 */
export function calculateMarginPercent(
  basePrice: number,
  displayPrice: number
): number {
  if (basePrice === 0) return 0;
  return parseFloat(((displayPrice - basePrice) / basePrice * 100).toFixed(2));
}

/**
 * VAT rate (23% for Poland)
 */
export const VAT_RATE = 23;

/**
 * Calculate net price from gross price (removes VAT)
 */
export function calculateNetPrice(grossPrice: number): number {
  return Math.round(grossPrice / (1 + VAT_RATE / 100));
}

/**
 * Calculate gross price from net price (adds VAT)
 */
export function calculateGrossPrice(netPrice: number): number {
  return Math.round(netPrice * (1 + VAT_RATE / 100));
}

/**
 * Format price with currency and VAT info
 */
export function formatPriceWithVat(
  price: number, 
  isNet: boolean = false, 
  currency: string = 'PLN'
): string {
  const formatted = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(price);
  
  return isNet ? `${formatted} netto` : formatted;
}
