export interface CarScoutCSVRow {
  listing_id: string;
  listing_url: string;
  scraped_at: string;
  make: string;
  model: string;
  version: string;
  vin: string;
  price_pln: string;
  price_display: string;
  omnibus_lowest_30d_pln: string;
  omnibus_text: string;
  production_year: string;
  mileage_km: string;
  fuel_type: string;
  transmission: string;
  engine_power_hp: string;
  registration_number: string;
  first_registration_date: string;
  engine_capacity_cm3: string;
  drive: string;
  body_type: string;
  doors: string;
  seats: string;
  color: string;
  paint_type: string;
  dealer_name: string;
  dealer_address_line1: string;
  dealer_address_line2: string;
  dealer_address_line3: string;
  dealer_google_rating: string;
  dealer_review_count: string;
  dealer_google_link: string;
  contact_phone: string;
  primary_image_url: string;
  image_count: string;
  image_urls: string;
  equipment_audio_multimedia: string;
  equipment_safety: string;
  equipment_comfort_extras: string;
  equipment_other: string;
  additional_info_header: string;
  additional_info_content: string;
  specs_json: string;
  [key: string]: string;
}

export interface CarOfferUpsertPayload {
  advert_id: string;
  advert_url: string | null;
  status: string | null;
  offer_published: string | null;
  brand: string | null;
  model: string | null;
  model_version: string | null;
  year: number | null;
  generation: string | null;
  new_used: string | null;
  body_type: string | null;
  price: number;
  vat_invoice: boolean;
  mileage: number | null;
  fuel_type: string | null;
  engine_power: string | null;
  transmission: string | null;
  color: string | null;
  colour_type: string | null;
  country_origin: string | null;
  no_accident: boolean | null;
  technical_spec: Record<string, unknown>;
  features: Record<string, string[]>;
  main_photo_url: string | null;
  additional_photos: string[];
  description: string | null;
  seller_type: string | null;
  seller_id: string | null;
  seller_name: string | null;
  seller_address: string | null;
  seller_city: string | null;
  seller_region: string | null;
  seller_country: string | null;
  seller_postal_code: string | null;
  google_maps_url: string | null;
}

export interface ParsedCarScoutItem {
  row: CarScoutCSVRow;
  payload: CarOfferUpsertPayload;
  hasPlaceholderImages: boolean;
}

export interface ParseCarScoutResult {
  items: ParsedCarScoutItem[];
  totalRows: number;
  placeholderCount: number;
  validPhotosCount: number;
  brandsSummary: Record<string, number>;
  errors: string[];
}

const UPPERCASE_BRANDS = new Set(['BMW', 'KIA', 'MG', 'DS', 'BYD', 'JAC', 'MAN', 'GMC', 'RAM']);

/**
 * RFC 4180 compliant CSV parser supporting multiline quoted fields and escaped quotes ("")
 */
export function parseRawCSV(csvText: string): string[][] {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(cell => cell.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function decodeBase64Safe(b64: string): string {
  try {
    const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(normalized + pad, 'base64').toString('utf-8');
    }
    if (typeof atob !== 'undefined') {
      return atob(normalized + pad);
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Detects whether an image URL is a placeholder (either directly or encoded in Automarket CDN base64 path)
 */
export function isPlaceholderImageUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('placeholder') || lower.includes('offer_in_preparation') || lower.includes('brak-zdjecia')) {
    return true;
  }

  // Automarket CDN uses imgproxy base64 URL paths: /rs:fit:1920:1080/<b64_chunk>/<b64_chunk>.jpg
  const match = trimmed.match(/\/rs:fit:\d+:\d+\/(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  if (match && match[1]) {
    const joinedBase64 = match[1].replace(/\//g, '');
    const decoded = decodeBase64Safe(joinedBase64).toLowerCase();
    if (decoded.includes('placeholder') || decoded.includes('offer_in_preparation')) {
      return true;
    }
  }

  return false;
}

export function normalizeBrandName(rawMake: string | null | undefined): string | null {
  if (!rawMake || !rawMake.trim()) return null;
  const trimmed = rawMake.trim();
  const upper = trimmed.toUpperCase();

  if (UPPERCASE_BRANDS.has(upper)) {
    return upper;
  }
  if (upper === 'MERCEDES-BENZ' || upper === 'MERCEDES') {
    return 'Mercedes-Benz';
  }
  if (upper === 'VOLKSWAGEN' || upper === 'VW') {
    return 'Volkswagen';
  }
  if (upper === 'SKODA' || upper === 'ŠKODA') {
    return 'Skoda';
  }

  return trimmed
    .split(/([\s-]+)/)
    .map(part => {
      if (/^[\s-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

export function normalizeFuelType(rawFuel: string | null | undefined): string | null {
  if (!rawFuel || !rawFuel.trim()) return null;
  const trimmed = rawFuel.trim();
  const upper = trimmed.toUpperCase();

  const fuelMap: Record<string, string> = {
    PB: 'Benzyna',
    BENZYNA: 'Benzyna',
    PETROL: 'Benzyna',
    GASOLINE: 'Benzyna',
    ON: 'Diesel',
    DIESEL: 'Diesel',
    HEV: 'Hybryda',
    MHEV: 'Hybryda',
    HYBRYDA: 'Hybryda',
    HYBRID: 'Hybryda',
    PHEV: 'Hybryda plug-in',
    'HYBRYDA PLUG-IN': 'Hybryda plug-in',
    PLUGIN_HYBRID: 'Hybryda plug-in',
    BEV: 'Elektryczny',
    EV: 'Elektryczny',
    ELEKTRYCZNY: 'Elektryczny',
    ELECTRIC: 'Elektryczny',
    LPG: 'LPG',
    'PB+LPG': 'LPG',
    CNG: 'CNG',
  };

  return fuelMap[upper] || trimmed;
}

function safeInt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/\s+/g, '');
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseLocationFromLine3(line3: string | undefined): { city: string | null; region: string | null; postalCode: string | null } {
  if (!line3) return { city: null, region: null, postalCode: null };
  // Example: "Lokalizacja auta: Mysłowice, śląskie"
  const cleaned = line3.replace(/^Lokalizacja\s+auta\s*:\s*/i, '').trim();
  if (!cleaned) return { city: null, region: null, postalCode: null };
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  return {
    city: parts[0] || null,
    region: parts[1] || null,
    postalCode: null,
  };
}

function parseAddressLine2(line2: string | undefined): { postalCode: string | null; city: string | null } {
  if (!line2) return { postalCode: null, city: null };
  const trimmed = line2.trim();
  const match = trimmed.match(/^(\d{2}-\d{3})\s+(.+)$/);
  if (match) {
    return { postalCode: match[1], city: match[2].trim() };
  }
  return { postalCode: null, city: trimmed || null };
}

function splitPipeList(val: string | undefined): string[] {
  if (!val || !val.trim()) return [];
  return val
    .split('|')
    .map(item => item.trim())
    .filter(Boolean);
}

export function mapCarScoutRowToCarOffer(row: CarScoutCSVRow): ParsedCarScoutItem {
  let specsObj: Record<string, unknown> = {};
  if (row.specs_json && row.specs_json.trim()) {
    try {
      const parsed = JSON.parse(row.specs_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        specsObj = parsed as Record<string, unknown>;
      }
    } catch {
      specsObj = {};
    }
  }

  const advertId = (row.listing_id?.trim() || row.vin?.trim() || '').trim();
  const brand = normalizeBrandName(row.make);
  const model = row.model?.trim() || null;
  const modelVersion = row.version?.trim() || null;
  const year = safeInt(row.production_year);
  const mileage = safeInt(row.mileage_km);
  const price = safeInt(row.price_pln) ?? safeInt(specsObj.price_gross_pln) ?? 0;

  const vatInvoice =
    specsObj.invoice !== undefined
      ? Boolean(Number(specsObj.invoice))
      : true;

  const newUsed =
    typeof specsObj.vehicle_state === 'string' && specsObj.vehicle_state.trim()
      ? specsObj.vehicle_state.trim()
      : mileage !== null && mileage < 100
        ? 'Nowy'
        : 'Używany';

  const fuelType = normalizeFuelType(row.fuel_type);
  const transmission = row.transmission?.trim() || null;

  const rawPower = row.engine_power_hp?.trim() || '';
  const enginePower = rawPower
    ? /^\d+$/.test(rawPower)
      ? `${rawPower} KM`
      : rawPower
    : null;

  const bodyType = row.body_type?.trim() || null;
  const color = row.color?.trim() || null;
  const rawPaintType = row.paint_type?.trim() || '';
  const colourType =
    rawPaintType ||
    (color?.toLowerCase().includes('metalik')
      ? 'Metalik'
      : color?.toLowerCase().includes('perł')
        ? 'Perłowy'
        : null);

  const countryOrigin =
    typeof specsObj.origin_country === 'string' && specsObj.origin_country.trim()
      ? specsObj.origin_country.trim()
      : null;

  const allUrls = row.image_urls
    ? row.image_urls
        .split('|')
        .map(u => u.trim())
        .filter(Boolean)
    : [];

  const rawMainPhotoUrl = (row.primary_image_url?.trim() || allUrls[0] || '') || null;

  const hasPlaceholderImages =
    isPlaceholderImageUrl(rawMainPhotoUrl) ||
    (allUrls.length > 0 && allUrls.every(u => isPlaceholderImageUrl(u)));

  const validUrls = allUrls.filter(u => !isPlaceholderImageUrl(u));
  const mainPhotoUrl =
    rawMainPhotoUrl && !isPlaceholderImageUrl(rawMainPhotoUrl)
      ? rawMainPhotoUrl
      : validUrls[0] || null;

  // Deduplicate main_photo_url from additional_photos and exclude placeholder URLs
  const additionalPhotos = validUrls.filter(u => u !== mainPhotoUrl);

  const audioList = splitPipeList(row.equipment_audio_multimedia);
  const safetyList = splitPipeList(row.equipment_safety);
  const comfortList = splitPipeList(row.equipment_comfort_extras);
  const otherList = splitPipeList(row.equipment_other);

  const features: Record<string, string[]> = {};
  if (audioList.length > 0) features['Audio i multimedia'] = audioList;
  if (safetyList.length > 0) features['Bezpieczeństwo'] = safetyList;
  if (comfortList.length > 0) features['Komfort i dodatki'] = comfortList;
  if (otherList.length > 0) features['Inne'] = otherList;

  const technicalSpec: Record<string, unknown> = {
    ...specsObj,
    vin: row.vin?.trim() || specsObj.vin || undefined,
    registration_number: row.registration_number?.trim() || specsObj.registration_number || undefined,
    first_registration_date: row.first_registration_date?.trim() || specsObj.first_registration_date || undefined,
    engine_capacity_cm3: safeInt(row.engine_capacity_cm3) ?? specsObj.engine_capacity_cm3 ?? undefined,
    drive: row.drive?.trim() || specsObj.drive || undefined,
    doors: safeInt(row.doors) ?? specsObj.doors ?? undefined,
    seats: safeInt(row.seats) ?? specsObj.seats ?? undefined,
    color: color || specsObj.color || undefined,
    paint_type: rawPaintType || specsObj.paint_type || undefined,
    omnibus_lowest_30d_pln: safeInt(row.omnibus_lowest_30d_pln) ?? undefined,
    omnibus_text: row.omnibus_text?.trim() || undefined,
    additional_info_header: row.additional_info_header?.trim() || undefined,
    additional_info_content: row.additional_info_content?.trim() || undefined,
    dealer_address_line1: row.dealer_address_line1?.trim() || undefined,
    dealer_address_line2: row.dealer_address_line2?.trim() || undefined,
    dealer_address_line3: row.dealer_address_line3?.trim() || undefined,
    dealer_google_rating: row.dealer_google_rating?.trim() || undefined,
    dealer_review_count: row.dealer_review_count?.trim() || undefined,
    dealer_google_link: row.dealer_google_link?.trim() || undefined,
    contact_phone: row.contact_phone?.trim() || undefined,
  };

  // Remove undefined keys for clean JSONB storage
  Object.keys(technicalSpec).forEach(k => {
    if (technicalSpec[k] === undefined || technicalSpec[k] === '') {
      delete technicalSpec[k];
    }
  });

  const descParts = [
    row.additional_info_header?.trim(),
    row.additional_info_content?.trim(),
  ].filter(Boolean);
  const description = descParts.length > 0 ? descParts.join('\n\n') : null;

  const line3Loc = parseLocationFromLine3(row.dealer_address_line3);
  const line2Loc = parseAddressLine2(row.dealer_address_line2);

  const sellerCity =
    (typeof specsObj.location_city === 'string' && specsObj.location_city.trim()) ||
    line3Loc.city ||
    line2Loc.city ||
    null;

  const sellerRegion =
    (typeof specsObj.location_region === 'string' && specsObj.location_region.trim()) ||
    line3Loc.region ||
    null;

  const sellerAddress =
    [row.dealer_address_line1?.trim(), row.dealer_address_line2?.trim()]
      .filter(Boolean)
      .join(', ') || null;

  const offerPublished =
    (typeof specsObj.first_publication_date === 'string' && specsObj.first_publication_date.trim()) ||
    row.scraped_at?.trim() ||
    null;

  const payload: CarOfferUpsertPayload = {
    advert_id: advertId,
    advert_url: row.listing_url?.trim() || null,
    status: 'active',
    offer_published: offerPublished,
    brand,
    model,
    model_version: modelVersion,
    year,
    generation: null,
    new_used: newUsed,
    body_type: bodyType,
    price,
    vat_invoice: vatInvoice,
    mileage,
    fuel_type: fuelType,
    engine_power: enginePower,
    transmission,
    color,
    colour_type: colourType,
    country_origin: countryOrigin,
    no_accident: null,
    technical_spec: technicalSpec,
    features,
    main_photo_url: mainPhotoUrl,
    additional_photos: additionalPhotos,
    description,
    seller_type: typeof specsObj.seller_type === 'string' ? specsObj.seller_type : null,
    seller_id: typeof specsObj.seller_nip === 'string' ? specsObj.seller_nip : null,
    seller_name: row.dealer_name?.trim() || null,
    seller_address: sellerAddress,
    seller_city: sellerCity,
    seller_region: sellerRegion,
    seller_country: 'Polska',
    seller_postal_code: line2Loc.postalCode,
    google_maps_url:
      row.dealer_google_link?.trim() ||
      (sellerCity
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerCity)}`
        : null),
  };

  return {
    row,
    payload,
    hasPlaceholderImages,
  };
}

export function parseCarScoutCSV(csvText: string): ParseCarScoutResult {
  const rawRows = parseRawCSV(csvText);
  if (rawRows.length < 2) {
    return {
      items: [],
      totalRows: 0,
      placeholderCount: 0,
      validPhotosCount: 0,
      brandsSummary: {},
      errors: ['Plik CSV jest pusty lub nie zawiera wierszy z danymi.'],
    };
  }

  const headers = rawRows[0].map(h => h.trim());
  const requiredHeaders = ['listing_id', 'make', 'model', 'price_pln'];
  const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
  if (missingHeaders.length > 0) {
    return {
      items: [],
      totalRows: 0,
      placeholderCount: 0,
      validPhotosCount: 0,
      brandsSummary: {},
      errors: [`Brak wymaganych kolumn formatu Car-Scout: ${missingHeaders.join(', ')}`],
    };
  }

  const items: ParsedCarScoutItem[] = [];
  const errors: string[] = [];
  const brandsSummary: Record<string, number> = {};
  let placeholderCount = 0;

  for (let i = 1; i < rawRows.length; i++) {
    const cells = rawRows[i];
    if (cells.length === 1 && !cells[0].trim()) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] ?? '';
    });

    const typedRow = rowObj as CarScoutCSVRow;
    const mapped = mapCarScoutRowToCarOffer(typedRow);

    if (!mapped.payload.advert_id) {
      errors.push(`Wiersz ${i + 1}: pominięto z powodu braku listing_id oraz VIN.`);
      continue;
    }

    if (mapped.hasPlaceholderImages) {
      placeholderCount++;
    }

    const brandKey = mapped.payload.brand || 'Inne';
    brandsSummary[brandKey] = (brandsSummary[brandKey] || 0) + 1;
    items.push(mapped);
  }

  return {
    items,
    totalRows: items.length,
    placeholderCount,
    validPhotosCount: items.length - placeholderCount,
    brandsSummary,
    errors,
  };
}
