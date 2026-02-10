'use server';

import { supabase } from './supabase';
import { Widget, CreateWidgetInput, UpdateWidgetInput } from '@/types/widgets';

/**
 * Get all widgets (for admin)
 */
export async function getWidgets(): Promise<Widget[]> {
    const { data, error } = await supabase
        .from('widgets')
        .select('*, widget_partners(partner_id)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching widgets:', error);
        throw new Error('Failed to fetch widgets');
    }

    return (data || []).map(widget => ({
        ...widget,
        partners: widget.widget_partners.map((wp: { partner_id: string }) => wp.partner_id)
    }));
}

/**
 * Get widget by ID
 */
export async function getWidgetById(id: string): Promise<Widget | null> {
    const { data, error } = await supabase
        .from('widgets')
        .select('*, widget_partners(partner_id)')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching widget:', error);
        return null;
    }

    return {
        ...data,
        partners: data.widget_partners.map((wp: { partner_id: string }) => wp.partner_id)
    };
}

/**
 * Create new widget
 */
export async function createWidget(input: CreateWidgetInput): Promise<Widget> {
    const { partner_ids, ...widgetData } = input;

    const { data: widget, error } = await supabase
        .from('widgets')
        .insert({
            ...widgetData,
            language: input.language || null,
            is_global: input.is_global ?? false,
            is_active: input.is_active ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating widget:', error);
        throw new Error('Failed to create widget');
    }

    // If there are specific partners and it's not global
    if (partner_ids && partner_ids.length > 0 && !input.is_global) {
        const partnerLinks = partner_ids.map(partnerId => ({
            widget_id: widget.id,
            partner_id: partnerId
        }));

        const { error: linkError } = await supabase
            .from('widget_partners')
            .insert(partnerLinks);

        if (linkError) {
            console.error('Error linking widget to partners:', linkError);
            throw new Error('Failed to link widget to partners');
        }
    }

    return { ...widget, partners: partner_ids || [] };
}

/**
 * Update widget
 */
export async function updateWidget(
    id: string,
    input: UpdateWidgetInput
): Promise<Widget> {
    const { partner_ids, ...widgetData } = input;

    const { data: widget, error } = await supabase
        .from('widgets')
        .update({
            ...widgetData,
            language: input.language !== undefined ? (input.language || null) : undefined,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating widget:', error);
        throw new Error('Failed to update widget');
    }

    // Update partner links
    if (partner_ids !== undefined) {
        // Delete existing links
        await supabase.from('widget_partners').delete().eq('widget_id', id);

        // Add new links if not global
        if (partner_ids.length > 0 && !(input.is_global ?? widget.is_global)) {
            const partnerLinks = partner_ids.map(partnerId => ({
                widget_id: id,
                partner_id: partnerId
            }));

            const { error: linkError } = await supabase
                .from('widget_partners')
                .insert(partnerLinks);

            if (linkError) {
                console.error('Error updating widget partners:', linkError);
                throw new Error('Failed to update widget partners');
            }
        }
    }

    return { ...widget, partners: partner_ids || [] };
}

/**
 * Delete widget
 */
export async function deleteWidget(id: string): Promise<void> {
    const { error } = await supabase
        .from('widgets')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting widget:', error);
        throw new Error('Failed to delete widget');
    }
}

/**
 * Get widgets for a specific partner and global widgets
 */
export async function getWidgetsByPartner(partnerId: string, locale?: string): Promise<Widget[]> {
    // Fetch global active widgets
    let globalQuery = supabase
        .from('widgets')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true);

    if (locale) {
        globalQuery = globalQuery.or(`language.eq.${locale},language.is.null`);
    }

    const { data: globalWidgets, error: globalError } = await globalQuery;

    if (globalError) {
        console.error('Error fetching global widgets:', globalError);
    }

    // Fetch partner-specific active widgets
    let partnerQuery = supabase
        .from('widgets')
        .select('*, widget_partners!inner(partner_id)')
        .eq('is_global', false)
        .eq('is_active', true)
        .eq('widget_partners.partner_id', partnerId);

    if (locale) {
        partnerQuery = partnerQuery.or(`language.eq.${locale},language.is.null`);
    }

    const { data: partnerWidgets, error: partnerError } = await partnerQuery;

    if (partnerError && partnerError.code !== 'PGRST116') {
        console.error('Error fetching partner widgets:', partnerError);
    }

    const allWidgets = [...(globalWidgets || []), ...(partnerWidgets || [])];

    return allWidgets;
}

/**
 * Get only global widgets
 */
export async function getGlobalWidgets(locale?: string): Promise<Widget[]> {
    let query = supabase
        .from('widgets')
        .select('*')
        .eq('is_global', true)
        .eq('is_active', true);

    if (locale) {
        query = query.or(`language.eq.${locale},language.is.null`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching global widgets:', error);
        return [];
    }

    return data || [];
}
