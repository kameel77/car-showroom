/**
 * Price calculator utility for partner pricing
 */

export interface PriceCalculationParams {
  basePrice: number;
  marginPercent: number;
  customPrice?: number | null;
}

export type AdditionalCostMode = 'fixed_eur' | 'percent_of_net_plus_financing';

export interface AdditionalCostItem {
  description: string;
  mode?: AdditionalCostMode;
  valueEurNet?: number;
  percentValue?: number;
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
  additionalCostItems?: AdditionalCostItem[];
  transportCostEur: number;
  saleGrossEur: number;
}

export interface VehicleMarginBreakdown {
  purchaseNetPln: number;
  vatPln: number;
  purchaseNetEur: number;
  financingCostEur: number;
  additionalCostsEur: number;
  transportCostEur: number;
  totalCostEur: number;
  saleGrossEur: number;
  saleNetEur: number;
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
 * VAT rate (23% for Poland purchase)
 */
export const VAT_RATE = 23;

/**
 * VAT rate for sale input (gross -> net) - changed to 18% as per user requirement
 */
export const NL_SALE_VAT_RATE = 18;

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

export function normalizeAdditionalCostItems(items?: AdditionalCostItem[] | null): AdditionalCostItem[] {
  return (items || [])
    .map((item) => {
      const mode: AdditionalCostMode = item.mode === 'percent_of_net_plus_financing'
        ? 'percent_of_net_plus_financing'
        : 'fixed_eur';

      return {
        description: String(item.description || '').trim(),
        mode,
        valueEurNet: mode === 'fixed_eur' ? Math.max(0, Number(item.valueEurNet || 0)) : 0,
        percentValue: mode === 'percent_of_net_plus_financing' ? Math.max(0, Number(item.percentValue || 0)) : 0,
      };
    })
    .filter((item) => item.description.length > 0);
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

export function calculateAdditionalCostsTotalEur(
  items?: AdditionalCostItem[] | null,
  baseNetPlusFinancingEur: number = 0
): number {
  const normalizedItems = normalizeAdditionalCostItems(items);
  if (normalizedItems.length === 0) return 0;

  return round2(
    normalizedItems.reduce((sum, item) => {
      if (item.mode === 'percent_of_net_plus_financing') {
        return sum + (Math.max(0, Number(item.percentValue || 0)) / 100) * Math.max(0, baseNetPlusFinancingEur);
      }

      return sum + Math.max(0, Number(item.valueEurNet || 0));
    }, 0)
  );
}

/**
 * Margin % is calculated against total net cost.
 * margin_pct = margin_eur / total_cost_net_eur * 100
 */
export function calculateVehicleMarginBreakdown(input: VehicleMarginCalculationInput): VehicleMarginBreakdown {
  const purchaseNetPln = round2(input.purchaseGrossPln / 1.23);
  const vatPln = round2(input.purchaseGrossPln - purchaseNetPln);
  const purchaseNetEur = input.exchangeRatePlnPerEur > 0
    ? round2(purchaseNetPln / input.exchangeRatePlnPerEur)
    : 0;

  const financingCostEur = round2(purchaseNetEur * Math.max(0, input.financingCostPercent) / 100);
  const netPlusFinancing = round2(purchaseNetEur + financingCostEur);
  const additionalCostsEur = round2(calculateAdditionalCostsTotalEur(input.additionalCostItems, netPlusFinancing));
  const transportCostEur = round2(Math.max(0, input.transportCostEur));

  const totalCostEur = round2(
    purchaseNetEur + financingCostEur + additionalCostsEur + transportCostEur
  );

  const saleGrossEur = round2(Math.max(0, input.saleGrossEur));
  const saleNetEur = round2(saleGrossEur / (1 + NL_SALE_VAT_RATE / 100));
  const marginEur = round2(saleNetEur - totalCostEur);
  const marginPercent = totalCostEur > 0 ? round2((marginEur / totalCostEur) * 100) : 0;

  return {
    purchaseNetPln,
    vatPln,
    purchaseNetEur,
    financingCostEur,
    additionalCostsEur,
    transportCostEur,
    totalCostEur,
    saleGrossEur,
    saleNetEur,
    marginEur,
    marginPercent,
  };
}

/**
 * Deterministic examples:
 * - decomposeTransportBundles(3, any) -> [4]
 * - decomposeTransportBundles(11, any) -> [9, 2]
 */
