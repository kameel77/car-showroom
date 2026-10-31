'use server';

import crypto from 'crypto';
import { supabase, supabaseAdmin } from './supabase';
import {
  Partner,
  ClientFilter,
  CreateClientFilterInput,
  UpdateClientFilterInput,
  ImportCarScoutOptions,
  ImportCarScoutResult,
  PartnerFilter,
  PartnerOffer,
  PartnerOfferWithDetails,
  PartnerPublicOffer,
  CreatePartnerInput,
  UpdatePartnerInput,
  CreatePartnerFilterInput,
  UpdatePartnerOfferInput,
} from '@/types/partners';
import {
  calculateDisplayPrice,
  calculateNetPrice,
  normalizeAdditionalCostItems,
  normalizeTransportTiers,
} from './price-calculator';
import { parseCarScoutCSV } from './carscout-import';
import { revalidatePath } from 'next/cache';

const BACKWARD_COMPAT_OPTIONAL_COLUMNS = [
  'show_secondary_currency',
  'financing_cost_percent',
  'additional_cost_items',
  'transport_cost_tiers_eur',
  'presentation_currency',
  'presentation_value',
  'export_vat',
] as const;

type PartnerCostsShape = {
  financing_cost_percent?: number;
  additional_cost_items?: ReturnType<typeof normalizeAdditionalCostItems>;
  transport_cost_tiers_eur?: ReturnType<typeof normalizeTransportTiers>;
};

function sanitizePartnerCosts<T extends Record<string, unknown>>(input: T): T & PartnerCostsShape {
  return {
    ...input,
    financing_cost_percent: Math.max(0, Number(input.financing_cost_percent ?? 0)),
    additional_cost_items: normalizeAdditionalCostItems(
      input.additional_cost_items as Parameters<typeof normalizeAdditionalCostItems>[0]
    ),
    transport_cost_tiers_eur: normalizeTransportTiers(
      input.transport_cost_tiers_eur as Record<number, number> | undefined
    ),
  };
}

function stripMissingColumns<T extends Record<string, unknown>>(payload: T, errorMessage: string): T {
  const result = { ...payload };
  const isSchemaError = errorMessage.includes('does not exist') || errorMessage.includes('schema cache');

  if (isSchemaError) {
    for (const column of BACKWARD_COMPAT_OPTIONAL_COLUMNS) {
      delete result[column];
    }
  }

  return result;
}

/**
 * Dual-mode fallback storage when `client_filters` DDL migration has not yet been applied
 * in the Supabase SQL Editor. Stores filters and per-filter offer links inside an invisible
 * metadata block in `partners.notes` while keeping `partner.notes` clean in the UI.
 */
const META_PREFIX = '\n<!--__CLIENT_FILTERS_META__:';
const META_SUFFIX = '-->';

interface FallbackFilterOfferState {
  custom_price?: number | null;
  is_visible: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PartnerFallbackMeta {
  filters: ClientFilter[];
  filterOffers: Record<string, Record<string, FallbackFilterOfferState>>;
}

function extractMetaFromNotes(rawNotes?: string | null): {
  cleanNotes: string | undefined;
  meta: PartnerFallbackMeta | null;
} {
  if (!rawNotes) {
    return { cleanNotes: undefined, meta: null };
  }
  const idx = rawNotes.indexOf('<!--__CLIENT_FILTERS_META__:');
  if (idx === -1) {
    return { cleanNotes: rawNotes, meta: null };
  }
  const cleanPart = rawNotes.slice(0, idx).replace(/\n+$/, '');
  const metaStart = idx + '<!--__CLIENT_FILTERS_META__:'.length;
  const endIdx = rawNotes.indexOf(META_SUFFIX, metaStart);
  if (endIdx === -1) {
    return { cleanNotes: cleanPart || undefined, meta: null };
  }
  const jsonStr = rawNotes.slice(metaStart, endIdx);
  try {
    const parsed = JSON.parse(jsonStr) as PartnerFallbackMeta;
    return {
      cleanNotes: cleanPart || undefined,
      meta: {
        filters: Array.isArray(parsed.filters) ? parsed.filters : [],
        filterOffers: parsed.filterOffers && typeof parsed.filterOffers === 'object' ? parsed.filterOffers : {},
      },
    };
  } catch {
    return { cleanNotes: cleanPart || undefined, meta: null };
  }
}

function injectMetaIntoNotes(
  cleanNotes: string | undefined,
  meta: PartnerFallbackMeta | null
): string | undefined {
  const base = (cleanNotes || '').trim();
  if (!meta || (meta.filters.length === 0 && Object.keys(meta.filterOffers).length === 0)) {
    return base || undefined;
  }
  return `${base}${META_PREFIX}${JSON.stringify(meta)}${META_SUFFIX}`;
}

function cleanPartnerRow(row: Partner): Partner {
  const { cleanNotes } = extractMetaFromNotes(row.notes);
  return {
    ...row,
    notes: cleanNotes,
  };
}

async function isClientFiltersTableAvailable(): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('client_filters')
    .select('id')
    .limit(1);

  if (!error) return true;
  const msg = (error.message || '').toLowerCase();
  if (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('client_filters')
  ) {
    return false;
  }
  return true;
}

async function getRawPartnerById(id: string): Promise<Partner | null> {
  if (!id || id === 'undefined' || id === 'null') return null;
  const { data, error } = await supabaseAdmin
    .from('partners')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

async function getRawPartners(): Promise<Partner[]> {
  const { data, error } = await supabaseAdmin
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data;
}

async function saveFallbackMeta(partnerId: string, meta: PartnerFallbackMeta): Promise<void> {
  const rawPartner = await getRawPartnerById(partnerId);
  if (!rawPartner) throw new Error('Partner not found');
  const { cleanNotes } = extractMetaFromNotes(rawPartner.notes);
  const newNotes = injectMetaIntoNotes(cleanNotes, meta);
  const { error } = await supabaseAdmin
    .from('partners')
    .update({ notes: newNotes ?? null, updated_at: new Date().toISOString() })
    .eq('id', partnerId);
  if (error) {
    throw new Error(`Failed to save filter metadata: ${error.message}`);
  }
}

function getOrSeedFallbackMeta(rawPartner: Partner): PartnerFallbackMeta {
  const { meta } = extractMetaFromNotes(rawPartner.notes);
  if (meta && meta.filters.length > 0) {
    return meta;
  }
  // If partner has no filters yet in fallback mode, seed a default filter from partner.slug
  const defaultFilter: ClientFilter = {
    id: rawPartner.id,
    partner_id: rawPartner.id,
    name: rawPartner.slug,
    slug: rawPartner.slug,
    description: null,
    source_query: null,
    is_active: true,
    last_imported_at: null,
    last_import_filename: null,
    last_import_count: 0,
    offers_count: 0,
    created_at: rawPartner.created_at,
    updated_at: rawPartner.updated_at,
  };
  return {
    filters: [defaultFilter],
    filterOffers: meta?.filterOffers || {},
  };
}

/**
 * Get all partners
 */
export async function getPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching partners:', error);
    throw new Error(`Failed to fetch partners: ${error.message}`);
  }

  return (data || []).map(cleanPartnerRow);
}

/**
 * Get partner by ID
 */
export async function getPartnerById(id: string): Promise<Partner | null> {
  if (!id || id === 'undefined' || id === 'null') {
    console.error('Invalid partner ID:', id);
    return null;
  }

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching partner:', error);
    return null;
  }

  return data ? cleanPartnerRow(data) : null;
}

/**
 * Get partner by slug (for public pages)
 */
export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching partner by slug:', error);
    return null;
  }

  return data ? cleanPartnerRow(data) : null;
}

/**
 * Create new partner
 */
export async function createPartner(input: CreatePartnerInput): Promise<Partner> {
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(input.slug)) {
    throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
  }

  const payload = sanitizePartnerCosts({
    ...input,
    slug: input.slug.toLowerCase(),
    default_margin_percent: input.default_margin_percent || 0,
    is_active: input.is_active ?? true,
  });

  let { data, error } = await supabaseAdmin
    .from('partners')
    .insert(payload)
    .select()
    .single();

  if (error) {
    const safePayload = stripMissingColumns(payload, error.message);

    if (Object.keys(safePayload).length !== Object.keys(payload).length) {
      console.warn('Some partner columns missing in DB, retrying create with backward-compatible payload...');

      const retry = await supabaseAdmin
        .from('partners')
        .insert(safePayload)
        .select()
        .single();

      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    console.error('Error creating partner:', error);
    if (error.code === '23505') {
      throw new Error('Partner with this slug already exists');
    }
    throw new Error(`Failed to create partner: ${error.message}`);
  }

  revalidatePath('/admin/partners');
  return cleanPartnerRow(data);
}

/**
 * Update partner
 */
export async function updatePartner(
  id: string,
  input: UpdatePartnerInput
): Promise<Partner> {
  // Preserve fallback filter metadata inside notes if present
  const existingRaw = await getRawPartnerById(id);
  const existingMeta = existingRaw ? extractMetaFromNotes(existingRaw.notes).meta : null;

  const mergedNotes =
    'notes' in input
      ? injectMetaIntoNotes(input.notes, existingMeta)
      : existingRaw?.notes;

  const payload = sanitizePartnerCosts({
    ...input,
    ...(mergedNotes !== undefined ? { notes: mergedNotes } : {}),
    updated_at: new Date().toISOString(),
  });

  let { data, error } = await supabaseAdmin
    .from('partners')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const safePayload = stripMissingColumns(payload, error.message);

    if (Object.keys(safePayload).length !== Object.keys(payload).length) {
      console.warn('Some partner columns missing in DB, retrying update with backward-compatible payload...');

      const retry = await supabaseAdmin
        .from('partners')
        .update(safePayload)
        .eq('id', id)
        .select()
        .single();

      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    console.error('Error updating partner:', error);
    throw new Error(`Failed to update partner: ${error.message}`);
  }

  revalidatePath('/admin/partners');
  revalidatePath(`/admin/partners/${id}/edit`);
  return cleanPartnerRow(data);
}

/**
 * Delete partner
 */
export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('partners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting partner:', error);
    throw new Error(`Failed to delete partner: ${error.message}`);
  }

  revalidatePath('/admin/partners');
}

// ============================================================================
// CLIENT FILTERS (Multi-Filter per Client)
// ============================================================================

/**
 * Get all client filters for a given partner (with offer counts)
 */
export async function getClientFilters(partnerId: string): Promise<ClientFilter[]> {
  if (!partnerId || partnerId === 'undefined' || partnerId === 'null') return [];

  if (await isClientFiltersTableAvailable()) {
    const { data: filters, error } = await supabaseAdmin
      .from('client_filters')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching client filters:', error);
      throw new Error(`Failed to fetch client filters: ${error.message}`);
    }

    const { data: poRows } = await supabaseAdmin
      .from('partner_offers')
      .select('filter_id')
      .eq('partner_id', partnerId);

    const counts: Record<string, number> = {};
    for (const row of poRows || []) {
      if (row.filter_id) {
        counts[row.filter_id] = (counts[row.filter_id] || 0) + 1;
      }
    }

    return (filters || []).map(f => ({
      ...f,
      offers_count: counts[f.id] || 0,
    }));
  }

  // Fallback mode
  const rawPartner = await getRawPartnerById(partnerId);
  if (!rawPartner) return [];
  const meta = getOrSeedFallbackMeta(rawPartner);
  return meta.filters.map(f => ({
    ...f,
    offers_count: Object.keys(meta.filterOffers[f.id] || {}).length,
  }));
}

/**
 * Get all client filters grouped by partner_id
 */
export async function getAllClientFiltersByPartner(): Promise<Record<string, ClientFilter[]>> {
  if (await isClientFiltersTableAvailable()) {
    const { data: filters, error } = await supabaseAdmin
      .from('client_filters')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all client filters:', error);
      return {};
    }

    const { data: poRows } = await supabaseAdmin
      .from('partner_offers')
      .select('filter_id');

    const counts: Record<string, number> = {};
    for (const row of poRows || []) {
      if (row.filter_id) {
        counts[row.filter_id] = (counts[row.filter_id] || 0) + 1;
      }
    }

    const result: Record<string, ClientFilter[]> = {};
    for (const f of filters || []) {
      const enriched: ClientFilter = {
        ...f,
        offers_count: counts[f.id] || 0,
      };
      if (!result[f.partner_id]) result[f.partner_id] = [];
      result[f.partner_id].push(enriched);
    }
    return result;
  }

  // Fallback mode
  const rawPartners = await getRawPartners();
  const result: Record<string, ClientFilter[]> = {};
  for (const rawPartner of rawPartners) {
    const meta = getOrSeedFallbackMeta(rawPartner);
    result[rawPartner.id] = meta.filters.map(f => ({
      ...f,
      offers_count: Object.keys(meta.filterOffers[f.id] || {}).length,
    }));
  }
  return result;
}

/**
 * Get single client filter by ID
 */
export async function getClientFilterById(filterId: string): Promise<ClientFilter | null> {
  if (!filterId || filterId === 'undefined' || filterId === 'null') return null;

  if (await isClientFiltersTableAvailable()) {
    const { data, error } = await supabaseAdmin
      .from('client_filters')
      .select('*')
      .eq('id', filterId)
      .single();

    if (error || !data) return null;

    const { count } = await supabaseAdmin
      .from('partner_offers')
      .select('*', { count: 'exact', head: true })
      .eq('filter_id', filterId);

    return {
      ...data,
      offers_count: count || 0,
    };
  }

  // Fallback mode
  const rawPartners = await getRawPartners();
  for (const rawPartner of rawPartners) {
    const meta = getOrSeedFallbackMeta(rawPartner);
    const found = meta.filters.find(f => f.id === filterId);
    if (found) {
      return {
        ...found,
        offers_count: Object.keys(meta.filterOffers[found.id] || {}).length,
      };
    }
  }
  return null;
}

/**
 * Resolve partner + filter by (partnerSlug, filterSlug)
 */
export async function getClientFilterBySlugs(
  partnerSlug: string,
  filterSlug: string
): Promise<{ partner: Partner; filter: ClientFilter } | null> {
  const partner = await getPartnerBySlug(partnerSlug);
  if (!partner) return null;

  const filters = await getClientFilters(partner.id);
  const filter = filters.find(f => f.slug === filterSlug.toLowerCase() && f.is_active);
  if (!filter) return null;

  return { partner, filter };
}

/**
 * Legacy 1-segment URL resolver: checks if `legacySlug` matches a filter slug
 * and returns its owning `{ partner, filter }` so `/[locale]/[legacySlug]` can redirect
 * to `/[locale]/[partner.slug]/[filter.slug]`.
 */
export async function findClientFilterByLegacySlug(
  legacySlug: string
): Promise<{ partner: Partner; filter: ClientFilter } | null> {
  const normalized = legacySlug.toLowerCase().trim();
  const partners = await getPartners();
  const activePartners = partners.filter(p => p.is_active);

  // If legacySlug is already a partner slug that has NO filter of the same slug,
  // check if there is a filter matching `normalized` across any active partner.
  const filtersByPartner = await getAllClientFiltersByPartner();

  for (const partner of activePartners) {
    const filters = filtersByPartner[partner.id] || [];
    const matchingFilter = filters.find(f => f.slug === normalized && f.is_active);
    if (matchingFilter) {
      return { partner, filter: matchingFilter };
    }
  }

  return null;
}

/**
 * Create a new ClientFilter for a partner
 */
export async function createClientFilter(input: CreateClientFilterInput): Promise<ClientFilter> {
  const slug = input.slug.toLowerCase().trim();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug filtra może zawierać wyłącznie małe litery, cyfry i myślniki');
  }
  if (!input.name.trim()) {
    throw new Error('Nazwa filtra jest wymagana');
  }

  if (await isClientFiltersTableAvailable()) {
    const { data, error } = await supabaseAdmin
      .from('client_filters')
      .insert({
        partner_id: input.partner_id,
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        source_query: input.source_query?.trim() || null,
        notes: input.notes?.trim() || null,
        margin_percent: input.margin_percent ?? null,
        financing_cost_percent: input.financing_cost_percent ?? null,
        additional_cost_items: input.additional_cost_items ?? null,
        transport_cost_tiers_eur: input.transport_cost_tiers_eur ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Filtr o takim slugu już istnieje dla tego klienta');
      }
      throw new Error(`Błąd tworzenia filtra: ${error.message}`);
    }

    revalidatePath('/admin/partners');
    return { ...data, offers_count: 0 };
  }

  // Fallback mode
  const rawPartner = await getRawPartnerById(input.partner_id);
  if (!rawPartner) throw new Error('Klient nie istnieje');

  const meta = getOrSeedFallbackMeta(rawPartner);
  if (meta.filters.some(f => f.slug === slug)) {
    throw new Error('Filtr o takim slugu już istnieje dla tego klienta');
  }

  const now = new Date().toISOString();
  const newFilter: ClientFilter = {
    id: crypto.randomUUID(),
    partner_id: input.partner_id,
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    source_query: input.source_query?.trim() || null,
    notes: input.notes?.trim() || null,
    margin_percent: input.margin_percent ?? null,
    financing_cost_percent: input.financing_cost_percent ?? null,
    additional_cost_items: input.additional_cost_items ?? null,
    transport_cost_tiers_eur: input.transport_cost_tiers_eur ?? null,
    is_active: input.is_active ?? true,
    last_imported_at: null,
    last_import_filename: null,
    last_import_count: 0,
    offers_count: 0,
    created_at: now,
    updated_at: now,
  };

  meta.filters.push(newFilter);
  meta.filterOffers[newFilter.id] = {};
  await saveFallbackMeta(input.partner_id, meta);
  revalidatePath('/admin/partners');
  return newFilter;
}

/**
 * Update an existing ClientFilter
 */
export async function updateClientFilter(
  filterId: string,
  input: UpdateClientFilterInput
): Promise<ClientFilter> {
  if (input.slug !== undefined) {
    const slug = input.slug.toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error('Slug filtra może zawierać wyłącznie małe litery, cyfry i myślniki');
    }
  }

  if (await isClientFiltersTableAvailable()) {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.slug !== undefined) updatePayload.slug = input.slug.toLowerCase().trim();
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
    if (input.source_query !== undefined) updatePayload.source_query = input.source_query?.trim() || null;
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;
    if (input.margin_percent !== undefined) updatePayload.margin_percent = input.margin_percent;
    if (input.financing_cost_percent !== undefined) updatePayload.financing_cost_percent = input.financing_cost_percent;
    if (input.additional_cost_items !== undefined) updatePayload.additional_cost_items = input.additional_cost_items;
    if (input.transport_cost_tiers_eur !== undefined) updatePayload.transport_cost_tiers_eur = input.transport_cost_tiers_eur;
    if (input.is_active !== undefined) updatePayload.is_active = input.is_active;

    const { data, error } = await supabaseAdmin
      .from('client_filters')
      .update(updatePayload)
      .eq('id', filterId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Filtr o takim slugu już istnieje dla tego klienta');
      }
      throw new Error(`Błąd aktualizacji filtra: ${error.message}`);
    }

    revalidatePath('/admin/partners');
    return data;
  }

  // Fallback mode
  const rawPartners = await getRawPartners();
  for (const rawPartner of rawPartners) {
    const meta = getOrSeedFallbackMeta(rawPartner);
    const idx = meta.filters.findIndex(f => f.id === filterId);
    if (idx !== -1) {
      const targetSlug = input.slug !== undefined ? input.slug.toLowerCase().trim() : meta.filters[idx].slug;
      if (meta.filters.some((f, i) => i !== idx && f.slug === targetSlug)) {
        throw new Error('Filtr o takim slugu już istnieje dla tego klienta');
      }

      const updated: ClientFilter = {
        ...meta.filters[idx],
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.slug !== undefined ? { slug: targetSlug } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.source_query !== undefined ? { source_query: input.source_query?.trim() || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(input.margin_percent !== undefined ? { margin_percent: input.margin_percent } : {}),
        ...(input.financing_cost_percent !== undefined ? { financing_cost_percent: input.financing_cost_percent } : {}),
        ...(input.additional_cost_items !== undefined ? { additional_cost_items: input.additional_cost_items } : {}),
        ...(input.transport_cost_tiers_eur !== undefined ? { transport_cost_tiers_eur: input.transport_cost_tiers_eur } : {}),
        ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
        updated_at: new Date().toISOString(),
      };
      meta.filters[idx] = updated;
      await saveFallbackMeta(rawPartner.id, meta);
      revalidatePath('/admin/partners');
      return {
        ...updated,
        offers_count: Object.keys(meta.filterOffers[filterId] || {}).length,
      };
    }
  }

  throw new Error('Filtr nie został znaleziony');
}

/**
 * Delete a ClientFilter
 */
export async function deleteClientFilter(filterId: string): Promise<void> {
  if (await isClientFiltersTableAvailable()) {
    const { error } = await supabaseAdmin
      .from('client_filters')
      .delete()
      .eq('id', filterId);

    if (error) {
      throw new Error(`Błąd usuwania filtra: ${error.message}`);
    }
    revalidatePath('/admin/partners');
    return;
  }

  // Fallback mode
  const rawPartners = await getRawPartners();
  for (const rawPartner of rawPartners) {
    const meta = getOrSeedFallbackMeta(rawPartner);
    const idx = meta.filters.findIndex(f => f.id === filterId);
    if (idx !== -1) {
      meta.filters.splice(idx, 1);
      delete meta.filterOffers[filterId];
      await saveFallbackMeta(rawPartner.id, meta);
      revalidatePath('/admin/partners');
      return;
    }
  }
}

/**
 * Get offers with full details for a specific ClientFilter (for admin & padmin views)
 */
export async function getFilterOffersWithDetails(
  filterId: string
): Promise<{ partner: Partner; filter: ClientFilter; offers: PartnerOfferWithDetails[] }> {
  const filter = await getClientFilterById(filterId);
  if (!filter) {
    throw new Error('Filter not found');
  }

  const partner = await getPartnerById(filter.partner_id);
  if (!partner) {
    throw new Error('Partner not found');
  }

  let offerStatesMap = new Map<
    string,
    { id: number; custom_price?: number | null; is_visible: boolean; notes?: string; created_at: string; updated_at: string }
  >();

  if (await isClientFiltersTableAvailable()) {
    const { data: poRows, error: poError } = await supabaseAdmin
      .from('partner_offers')
      .select('*')
      .eq('filter_id', filterId);

    if (poError) {
      throw new Error(`Failed to fetch filter offers: ${poError.message}`);
    }

    for (const po of poRows || []) {
      offerStatesMap.set(po.offer_id, {
        id: po.id,
        custom_price: po.custom_price,
        is_visible: po.is_visible ?? true,
        notes: po.notes,
        created_at: po.created_at,
        updated_at: po.updated_at,
      });
    }
  } else {
    const rawPartner = await getRawPartnerById(partner.id);
    if (rawPartner) {
      const meta = getOrSeedFallbackMeta(rawPartner);
      const mapObj = meta.filterOffers[filterId] || {};
      let idx = 1;
      for (const [offerId, state] of Object.entries(mapObj)) {
        offerStatesMap.set(offerId, {
          id: idx++,
          custom_price: state.custom_price,
          is_visible: state.is_visible ?? true,
          notes: state.notes,
          created_at: state.created_at,
          updated_at: state.updated_at,
        });
      }
    }
  }

  const offerIds = Array.from(offerStatesMap.keys());
  if (offerIds.length === 0) {
    return { partner, filter, offers: [] };
  }

  const { data: carOffers, error: offersError } = await supabaseAdmin
    .from('car_offers')
    .select('*')
    .in('id', offerIds)
    .order('created_at', { ascending: false });

  if (offersError) {
    throw new Error(`Failed to fetch car offers: ${offersError.message}`);
  }

  const effectiveMargin =
    filter.margin_percent != null
      ? Number(filter.margin_percent)
      : partner.default_margin_percent;

  const offers: PartnerOfferWithDetails[] = (carOffers || []).map(offer => {
    const po = offerStatesMap.get(offer.id);
    const calculatedPrice = calculateDisplayPrice({
      basePrice: offer.price,
      marginPercent: effectiveMargin,
      customPrice: po?.custom_price,
    });
    const calculatedPriceNet = calculateNetPrice(calculatedPrice);

    return {
      id: po?.id || 0,
      partner_id: partner.id,
      filter_id: filter.id,
      offer_id: offer.id,
      custom_price: po?.custom_price ?? null,
      is_visible: po?.is_visible ?? true,
      notes: po?.notes,
      created_at: po?.created_at || new Date().toISOString(),
      updated_at: po?.updated_at || new Date().toISOString(),
      offer: {
        id: offer.id,
        advert_id: offer.advert_id,
        brand: offer.brand,
        model: offer.model,
        model_version: offer.model_version,
        year: offer.year,
        mileage: offer.mileage,
        price: offer.price,
        fuel_type: offer.fuel_type,
        engine_power: offer.engine_power,
        transmission: offer.transmission,
        main_photo_url: offer.main_photo_url,
        additional_photos: offer.additional_photos,
        body_type: offer.body_type,
        color: offer.color,
        colour_type: offer.colour_type,
        country_origin: offer.country_origin,
        vat_invoice: offer.vat_invoice,
        description: offer.description,
        seller_name: offer.seller_name,
        seller_address: offer.seller_address,
        seller_city: offer.seller_city,
        seller_region: offer.seller_region,
        technical_spec: offer.technical_spec,
        features: offer.features,
        advert_url: offer.advert_url,
      },
      calculated_price: calculatedPrice,
      calculated_price_net: calculatedPriceNet,
      margin_percent: effectiveMargin,
      show_net_prices: partner.show_net_prices ?? false,
      presentation_currency: partner.presentation_currency,
      presentation_value: partner.presentation_value,
    };
  });

  return { partner, filter, offers };
}

/**
 * Update a single offer in a specific ClientFilter (custom price, visibility, notes)
 */
export async function updateFilterOffer(
  filterId: string,
  offerId: string,
  input: UpdatePartnerOfferInput
): Promise<PartnerOffer> {
  const filter = await getClientFilterById(filterId);
  if (!filter) throw new Error('Filter not found');

  if (await isClientFiltersTableAvailable()) {
    const { data: existing } = await supabaseAdmin
      .from('partner_offers')
      .select('*')
      .eq('filter_id', filterId)
      .eq('offer_id', offerId)
      .single();

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if ('custom_price' in input) updatePayload.custom_price = input.custom_price ?? null;
      if ('is_visible' in input) updatePayload.is_visible = input.is_visible;
      if ('notes' in input) updatePayload.notes = input.notes;

      const { data, error } = await supabaseAdmin
        .from('partner_offers')
        .update(updatePayload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update filter offer: ${error.message}`);
      }
      revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);
      return data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('partner_offers')
        .insert({
          partner_id: filter.partner_id,
          filter_id: filterId,
          offer_id: offerId,
          custom_price: input.custom_price ?? null,
          is_visible: input.is_visible ?? true,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create filter offer: ${error.message}`);
      }
      revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);
      return data;
    }
  }

  // Fallback mode
  const rawPartner = await getRawPartnerById(filter.partner_id);
  if (!rawPartner) throw new Error('Partner not found');
  const meta = getOrSeedFallbackMeta(rawPartner);
  if (!meta.filterOffers[filterId]) meta.filterOffers[filterId] = {};

  const now = new Date().toISOString();
  const prev = meta.filterOffers[filterId][offerId] || {
    custom_price: null,
    is_visible: true,
    created_at: now,
    updated_at: now,
  };

  const updatedState: FallbackFilterOfferState = {
    ...prev,
    ...('custom_price' in input ? { custom_price: input.custom_price ?? null } : {}),
    ...('is_visible' in input && input.is_visible !== undefined ? { is_visible: input.is_visible } : {}),
    ...('notes' in input ? { notes: input.notes } : {}),
    updated_at: now,
  };
  meta.filterOffers[filterId][offerId] = updatedState;
  await saveFallbackMeta(filter.partner_id, meta);

  revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);
  return {
    id: 0,
    partner_id: filter.partner_id,
    filter_id: filterId,
    offer_id: offerId,
    custom_price: updatedState.custom_price,
    is_visible: updatedState.is_visible,
    notes: updatedState.notes,
    created_at: updatedState.created_at,
    updated_at: updatedState.updated_at,
  };
}

/**
 * Bulk update offers in a specific ClientFilter
 */
export async function bulkUpdateFilterOffers(
  filterId: string,
  offerIds: string[],
  input: UpdatePartnerOfferInput
): Promise<void> {
  if (await isClientFiltersTableAvailable()) {
    for (const offerId of offerIds) {
      await updateFilterOffer(filterId, offerId, input);
    }
    return;
  }

  const filter = await getClientFilterById(filterId);
  if (!filter) throw new Error('Filter not found');
  const rawPartner = await getRawPartnerById(filter.partner_id);
  if (!rawPartner) throw new Error('Partner not found');

  const meta = getOrSeedFallbackMeta(rawPartner);
  if (!meta.filterOffers[filterId]) meta.filterOffers[filterId] = {};
  const now = new Date().toISOString();

  for (const offerId of offerIds) {
    const prev = meta.filterOffers[filterId][offerId] || {
      custom_price: null,
      is_visible: true,
      created_at: now,
      updated_at: now,
    };
    meta.filterOffers[filterId][offerId] = {
      ...prev,
      ...('custom_price' in input ? { custom_price: input.custom_price ?? null } : {}),
      ...('is_visible' in input && input.is_visible !== undefined ? { is_visible: input.is_visible } : {}),
      ...('notes' in input ? { notes: input.notes } : {}),
      updated_at: now,
    };
  }

  await saveFallbackMeta(filter.partner_id, meta);
  revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);
}

/**
 * Remove selected offers from a specific ClientFilter (unlinks from filter; deletes orphan car_offers if unused)
 */
export async function removeOffersFromFilter(
  filterId: string,
  offerIds: string[]
): Promise<void> {
  if (!offerIds.length) return;
  const filter = await getClientFilterById(filterId);
  if (!filter) throw new Error('Filter not found');

  if (await isClientFiltersTableAvailable()) {
    const { error } = await supabaseAdmin
      .from('partner_offers')
      .delete()
      .eq('filter_id', filterId)
      .in('offer_id', offerIds);

    if (error) {
      throw new Error(`Failed to unlink offers from filter: ${error.message}`);
    }

    // Check which of these offerIds are no longer linked to any filter
    const { data: remainingLinks } = await supabaseAdmin
      .from('partner_offers')
      .select('offer_id')
      .in('offer_id', offerIds);

    const stillLinkedSet = new Set((remainingLinks || []).map(r => r.offer_id));
    const orphanIds = offerIds.filter(id => !stillLinkedSet.has(id));
    if (orphanIds.length > 0) {
      await supabaseAdmin.from('car_offers').delete().in('id', orphanIds);
    }

    revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);
    revalidatePath('/admin/partners');
    return;
  }

  // Fallback mode
  const rawPartner = await getRawPartnerById(filter.partner_id);
  if (!rawPartner) throw new Error('Partner not found');
  const meta = getOrSeedFallbackMeta(rawPartner);
  if (meta.filterOffers[filterId]) {
    for (const offerId of offerIds) {
      delete meta.filterOffers[filterId][offerId];
    }
  }
  await saveFallbackMeta(filter.partner_id, meta);

  // Check if any other filter across all partners references these offerIds
  const allRawPartners = await getRawPartners();
  const stillUsed = new Set<string>();
  for (const p of allRawPartners) {
    const pMeta = getOrSeedFallbackMeta(p);
    for (const fMap of Object.values(pMeta.filterOffers)) {
      for (const oid of Object.keys(fMap)) {
        stillUsed.add(oid);
      }
    }
  }

  const orphanIds = offerIds.filter(id => !stillUsed.has(id));
  if (orphanIds.length > 0) {
    await supabaseAdmin.from('car_offers').delete().in('id', orphanIds);
  }

  revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);
  revalidatePath('/admin/partners');
}

/**
 * Import Car-Scout CSV offers into a specific ClientFilter
 */
export async function importCarScoutOffersToFilter(
  filterId: string,
  csvText: string,
  options: ImportCarScoutOptions
): Promise<ImportCarScoutResult> {
  const filter = await getClientFilterById(filterId);
  if (!filter) {
    throw new Error('Wybrany filtr klienta nie istnieje');
  }

  const parsed = parseCarScoutCSV(csvText);

  const activeItems = options.skipPlaceholders
    ? parsed.items.filter(item => !item.hasPlaceholderImages)
    : parsed.items;

  const skippedPlaceholdersCount = options.skipPlaceholders
    ? parsed.placeholderCount
    : 0;

  const errors = [...parsed.errors];
  if (activeItems.length === 0) {
    return {
      totalParsed: parsed.totalRows,
      importedCount: 0,
      skippedPlaceholdersCount,
      errorsCount: errors.length,
      errors,
    };
  }

  // Upsert into car_offers in batches of 50 by advert_id
  const importedOfferIds: string[] = [];
  const batchSize = 50;
  const payloads = activeItems.map(item => item.payload);

  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const { data: upsertedRows, error: upsertError } = await supabaseAdmin
      .from('car_offers')
      .upsert(batch, { onConflict: 'advert_id' })
      .select('id, advert_id');

    if (upsertError) {
      console.error('Error upserting car_offers batch:', upsertError);
      errors.push(`Błąd zapisu partii ofert do bazy: ${upsertError.message}`);
      continue;
    }

    for (const row of upsertedRows || []) {
      importedOfferIds.push(row.id);
    }
  }

  const now = new Date().toISOString();

  if (await isClientFiltersTableAvailable()) {
    // 1. Fetch existing partner_offers for this filter so we preserve custom_price and is_visible
    const { data: existingLinks } = await supabaseAdmin
      .from('partner_offers')
      .select('*')
      .eq('filter_id', filterId);

    const existingSet = new Set((existingLinks || []).map(l => l.offer_id));

    // Insert only new links so existing custom_price and is_visible remain untouched
    const newLinks = importedOfferIds
      .filter(offerId => !existingSet.has(offerId))
      .map(offerId => ({
        partner_id: filter.partner_id,
        filter_id: filterId,
        offer_id: offerId,
        is_visible: true,
      }));

    if (newLinks.length > 0) {
      const { error: linkError } = await supabaseAdmin
        .from('partner_offers')
        .insert(newLinks);

      if (linkError) {
        errors.push(`Błąd przypisywania ofert do filtra: ${linkError.message}`);
      }
    }

    // If mode === 'replace', unlink offers from this filter that were not in the CSV
    if (options.mode === 'replace') {
      const importedSet = new Set(importedOfferIds);
      const toRemove = Array.from(existingSet).filter(id => !importedSet.has(id));
      if (toRemove.length > 0) {
        await removeOffersFromFilter(filterId, toRemove);
      }
    }

    // Update filter import metadata
    await supabaseAdmin
      .from('client_filters')
      .update({
        last_imported_at: now,
        last_import_filename: options.filename || null,
        last_import_count: importedOfferIds.length,
        updated_at: now,
      })
      .eq('id', filterId);
  } else {
    // Fallback mode
    const rawPartner = await getRawPartnerById(filter.partner_id);
    if (!rawPartner) throw new Error('Partner not found');
    const meta = getOrSeedFallbackMeta(rawPartner);
    if (!meta.filterOffers[filterId]) meta.filterOffers[filterId] = {};

    const currentMap = meta.filterOffers[filterId];
    const importedSet = new Set(importedOfferIds);

    let removedOfferIds: string[] = [];
    if (options.mode === 'replace') {
      for (const existingOfferId of Object.keys(currentMap)) {
        if (!importedSet.has(existingOfferId)) {
          removedOfferIds.push(existingOfferId);
          delete currentMap[existingOfferId];
        }
      }
    }

    for (const offerId of importedOfferIds) {
      if (!currentMap[offerId]) {
        currentMap[offerId] = {
          custom_price: null,
          is_visible: true,
          created_at: now,
          updated_at: now,
        };
      }
    }

    const fIdx = meta.filters.findIndex(f => f.id === filterId);
    if (fIdx !== -1) {
      meta.filters[fIdx] = {
        ...meta.filters[fIdx],
        last_imported_at: now,
        last_import_filename: options.filename || null,
        last_import_count: importedOfferIds.length,
        updated_at: now,
      };
    }

    await saveFallbackMeta(filter.partner_id, meta);

    if (removedOfferIds.length > 0) {
      await removeOffersFromFilter(filterId, removedOfferIds);
    }
  }

  revalidatePath('/admin/partners');
  revalidatePath(`/admin/partners/${filter.partner_id}/filters/${filterId}/offers`);

  return {
    totalParsed: parsed.totalRows,
    importedCount: importedOfferIds.length,
    skippedPlaceholdersCount,
    errorsCount: errors.length,
    errors,
  };
}

/**
 * Get public offers for a specific (partnerSlug, filterSlug) showroom page
 */
export async function getFilterPublicOffers(
  partnerSlug: string,
  filterSlug: string
): Promise<{ partner: Partner; filter: ClientFilter; offers: PartnerPublicOffer[] } | null> {
  const resolved = await getClientFilterBySlugs(partnerSlug, filterSlug);
  if (!resolved) return null;

  const { partner, filter } = resolved;
  const { offers: detailedOffers } = await getFilterOffersWithDetails(filter.id);

  const visibleOffers: PartnerPublicOffer[] = detailedOffers
    .filter(o => o.is_visible)
    .map(o => ({
      offer_id: o.offer_id,
      brand: o.offer.brand,
      model: o.offer.model,
      model_version: o.offer.model_version,
      year: o.offer.year,
      mileage: o.offer.mileage,
      price: o.offer.price,
      display_price: o.calculated_price,
      display_price_net: o.calculated_price_net,
      custom_price: o.custom_price ?? undefined,
      show_net_prices: partner.show_net_prices,
      show_secondary_currency: partner.show_secondary_currency,
      presentation_currency: partner.presentation_currency,
      presentation_value: partner.presentation_value,
      fuel_type: o.offer.fuel_type,
      engine_power: o.offer.engine_power,
      transmission: o.offer.transmission,
      main_photo_url: o.offer.main_photo_url,
      features: o.offer.features ?? undefined,
      technical_spec: o.offer.technical_spec ?? undefined,
    }));

  return { partner, filter, offers: visibleOffers };
}

/**
 * Get single public offer for a specific (partnerSlug, filterSlug, offerId)
 */
export async function getFilterPublicOffer(
  partnerSlug: string,
  filterSlug: string,
  offerId: string
): Promise<{ partner: Partner; filter: ClientFilter; partnerOffer: PartnerPublicOffer } | null> {
  const res = await getFilterPublicOffers(partnerSlug, filterSlug);
  if (!res) return null;
  const partnerOffer = res.offers.find(o => o.offer_id === offerId);
  if (!partnerOffer) return null;
  return {
    partner: res.partner,
    filter: res.filter,
    partnerOffer,
  };
}

/**
 * Get visible offers with full detail for partner self-admin view (`/[locale]/[partner]/[filter]/padmin`)
 */
export async function getFilterOffersBySlugs(
  partnerSlug: string,
  filterSlug: string
): Promise<{ partner: Partner; filter: ClientFilter; offers: PartnerOfferWithDetails[] } | null> {
  const resolved = await getClientFilterBySlugs(partnerSlug, filterSlug);
  if (!resolved) return null;

  const { partner, filter } = resolved;
  const { offers } = await getFilterOffersWithDetails(filter.id);
  return {
    partner,
    filter,
    offers: offers.filter(o => o.is_visible),
  };
}

// ============================================================================
// LEGACY FUNCTIONS (kept for backward compatibility)
// ============================================================================

export async function getPartnerFilters(partnerId: string): Promise<PartnerFilter[]> {
  if (!partnerId || partnerId === 'undefined' || partnerId === 'null') {
    return [];
  }

  const { data, error } = await supabase
    .from('partner_filters')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('is_active', true)
    .order('brand_name');

  if (error) {
    console.error('Error fetching partner filters:', error);
    throw new Error('Failed to fetch partner filters');
  }

  return data || [];
}

export async function createPartnerFilter(
  input: CreatePartnerFilterInput
): Promise<PartnerFilter> {
  const { data, error } = await supabaseAdmin
    .from('partner_filters')
    .insert({
      partner_id: input.partner_id,
      brand_name: input.brand_name,
      model_name: input.model_name || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating partner filter:', error);
    throw new Error('Failed to create partner filter');
  }

  return data;
}

export async function deletePartnerFilter(filterId: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from('partner_filters')
    .delete()
    .eq('id', filterId);

  if (error) {
    console.error('Error deleting partner filter:', error);
    throw new Error('Failed to delete partner filter');
  }
}

export async function getPartnerOffersWithDetails(
  partnerId: string
): Promise<PartnerOfferWithDetails[]> {
  const filters = await getClientFilters(partnerId);
  if (filters.length > 0) {
    const res = await getFilterOffersWithDetails(filters[0].id);
    return res.offers;
  }
  return [];
}

export async function updatePartnerOffer(
  partnerId: string,
  offerId: string,
  input: UpdatePartnerOfferInput
): Promise<PartnerOffer> {
  const filters = await getClientFilters(partnerId);
  if (filters.length > 0) {
    return updateFilterOffer(filters[0].id, offerId, input);
  }
  throw new Error('No filter found for partner');
}

export async function bulkUpdatePartnerOffers(
  partnerId: string,
  offerIds: string[],
  input: UpdatePartnerOfferInput
): Promise<void> {
  const filters = await getClientFilters(partnerId);
  if (filters.length > 0) {
    await bulkUpdateFilterOffers(filters[0].id, offerIds, input);
  }
}

export async function deleteCarOffer(offerId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('car_offers')
    .delete()
    .eq('id', offerId);

  if (error) {
    console.error('Error deleting car offer:', error);
    throw new Error('Failed to delete car offer');
  }
}

export async function bulkDeleteCarOffers(offerIds: string[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from('car_offers')
    .delete()
    .in('id', offerIds);

  if (error) {
    console.error('Error bulk deleting car offers:', error);
    throw new Error('Failed to delete car offers');
  }
}

export async function getPartnerOffersBySlug(
  slug: string
): Promise<{ partner: Partner; offers: PartnerOfferWithDetails[] }> {
  const resolved = await findClientFilterByLegacySlug(slug);
  if (resolved) {
    const { offers } = await getFilterOffersWithDetails(resolved.filter.id);
    return { partner: resolved.partner, offers: offers.filter(o => o.is_visible) };
  }
  const partner = await getPartnerBySlug(slug);
  if (!partner) throw new Error('Partner not found');
  const allOffers = await getPartnerOffersWithDetails(partner.id);
  return { partner, offers: allOffers.filter(o => o.is_visible) };
}

export async function getPartnerPublicOffers(
  slug: string
): Promise<PartnerPublicOffer[]> {
  const resolved = await findClientFilterByLegacySlug(slug);
  if (resolved) {
    const res = await getFilterPublicOffers(resolved.partner.slug, resolved.filter.slug);
    return res?.offers || [];
  }
  return [];
}

export async function getPartnerPublicOffer(
  slug: string,
  offerId: string
): Promise<PartnerPublicOffer | null> {
  const offers = await getPartnerPublicOffers(slug);
  return offers.find(o => o.offer_id === offerId) || null;
}

export async function updateCarPhotos(
  offerId: string,
  mainPhoto: string | null,
  additionalPhotos: string[]
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('car_offers')
    .update({
      main_photo_url: mainPhoto,
      additional_photos: additionalPhotos,
    })
    .eq('id', offerId);

  if (error) {
    console.error('Error updating car photos:', error);
    throw new Error('Failed to update car photos');
  }
}

export async function uploadCarImage(formData: FormData): Promise<string> {
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `showroom_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;

  const { error } = await supabaseAdmin.storage
    .from('public-img')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('public-img')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}
