/**
 * Price calculator utility for partner pricing
 */

export interface PriceCalculationParams {
  basePrice: number;
  marginPercent: number;
  customPrice?: number | null;
}

export interface AdditionalCostItem {
  description: string;
  valueEurNet: number;
}

export interface TransportCostTiers {
  1?: number;
  2?: number;
  4?: number;
  8?: number;
  9?: number;
}

export interface VehicleMarginCalculationInput {
  purchaseGrossPln: number;
  exchangeRatePlnPerEur: number;
  financingCostPercent: number;
  additionalCostsEur: number;
  transportCostEur: number;
  saleValueEur: number;
}

export interface VehicleMarginBreakdown {
  purchaseNetPln: number;
  vatPln: number;
  purchaseNetEur: number;
  financingCostEur: number;
  additionalCostsEur: number;
  transportCostEur: number;
  totalCostEur: number;
  saleValueEur: number;
  marginEur: number;
  marginPercent: number;
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
  if (customPrice !== undefined && customPrice !== null) {
    return customPrice;
  }

  if (marginPercent > 0) {
    return Math.round(basePrice * (1 + marginPercent / 100));
  }

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

export function formatPricePrecise(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
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
  return parseFloat((((displayPrice - basePrice) / basePrice) * 100).toFixed(2));
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const SUPPORTED_TRANSPORT_TIERS: Array<1 | 2 | 4 | 8 | 9> = [1, 2, 4, 8, 9];

export function normalizeTransportTiers(tiers?: Partial<TransportCostTiers> | null): TransportCostTiers {
  return {
    1: Math.max(0, Number(tiers?.[1] ?? 0)),
    2: Math.max(0, Number(tiers?.[2] ?? 0)),
    4: Math.max(0, Number(tiers?.[4] ?? 0)),
    8: Math.max(0, Number(tiers?.[8] ?? 0)),
    9: Math.max(0, Number(tiers?.[9] ?? 0)),
  };
}

/**
 * Returns transport bundle decomposition for selected vehicle count.
 * - For <=9 uses upward mapping to nearest configured tier (e.g. 3 -> 4).
 * - For >9 decomposes using biggest tiers first (e.g. 11 -> 9 + 2).
 */
export function decomposeTransportBundles(
  selectedCarsCount: number,
  tiers: Partial<TransportCostTiers> | null | undefined
): number[] {
  const count = Math.max(0, Math.floor(selectedCarsCount));
  if (count === 0) return [];

  const normalized = normalizeTransportTiers(tiers);

  if (count <= 9) {
    const tier = SUPPORTED_TRANSPORT_TIERS.find((item) => item >= count) ?? 9;
    return [tier];
  }

  let remaining = count;
  const bundles: number[] = [];

  for (const tier of [...SUPPORTED_TRANSPORT_TIERS].sort((a, b) => b - a)) {
    while (remaining >= tier) {
      bundles.push(tier);
      remaining -= tier;
    }
  }

  if (remaining > 0) {
    const finalTier = SUPPORTED_TRANSPORT_TIERS.find((item) => item >= remaining) ?? 9;
    bundles.push(finalTier);
  }

  if (bundles.length === 0) {
    bundles.push(1);
  }

  // keep function deterministic and avoid "unused" in future extensions
  void normalized;

  return bundles;
}

export function calculateTransportCostTotalEur(
  selectedCarsCount: number,
  tiers: Partial<TransportCostTiers> | null | undefined
): number {
  const normalized = normalizeTransportTiers(tiers);
  const bundles = decomposeTransportBundles(selectedCarsCount, normalized);

  return round2(
    bundles.reduce((sum, bundleSize) => {
      const bundleTier = bundleSize as 1 | 2 | 4 | 8 | 9;
      return sum + (normalized[bundleTier] ?? 0);
    }, 0)
  );
}

export function calculateTransportCostPerCarEur(
  selectedCarsCount: number,
  tiers: Partial<TransportCostTiers> | null | undefined
): number {
  const count = Math.max(0, Math.floor(selectedCarsCount));
  if (count === 0) return 0;

  return round2(calculateTransportCostTotalEur(count, tiers) / count);
}

export function calculateAdditionalCostsTotalEur(items?: AdditionalCostItem[] | null): number {
  if (!items || items.length === 0) return 0;

  return round2(
    items.reduce((sum, item) => sum + Math.max(0, Number(item.valueEurNet || 0)), 0)
  );
}

/**
 * Margin % is calculated against sale value (sale margin convention).
 */
export function calculateVehicleMarginBreakdown(input: VehicleMarginCalculationInput): VehicleMarginBreakdown {
  const purchaseNetPln = round2(input.purchaseGrossPln / 1.23);
  const vatPln = round2(input.purchaseGrossPln - purchaseNetPln);
  const purchaseNetEur = input.exchangeRatePlnPerEur > 0
    ? round2(purchaseNetPln / input.exchangeRatePlnPerEur)
    : 0;

  const financingCostEur = round2(purchaseNetEur * Math.max(0, input.financingCostPercent) / 100);
  const additionalCostsEur = round2(Math.max(0, input.additionalCostsEur));
  const transportCostEur = round2(Math.max(0, input.transportCostEur));

  const totalCostEur = round2(
    purchaseNetEur + financingCostEur + additionalCostsEur + transportCostEur
  );

  const saleValueEur = round2(Math.max(0, input.saleValueEur));
  const marginEur = round2(saleValueEur - totalCostEur);
  const marginPercent = saleValueEur > 0 ? round2((marginEur / saleValueEur) * 100) : 0;

  return {
    purchaseNetPln,
    vatPln,
    purchaseNetEur,
    financingCostEur,
    additionalCostsEur,
    transportCostEur,
    totalCostEur,
    saleValueEur,
    marginEur,
    marginPercent,
  };
}

/**
 * Deterministic examples:
 * - decomposeTransportBundles(3, any) -> [4]
 * - decomposeTransportBundles(11, any) -> [9, 2]
 */
