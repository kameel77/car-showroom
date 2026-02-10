export type WidgetType = 'sidebar' | 'content';
export type WidgetContentType = 'image' | 'html';

export interface Widget {
    id: string;
    name: string;
    type: WidgetType;
    content_type: WidgetContentType;
    content: string;
    is_global: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    partners?: string[]; // Array of partner IDs if it's not global
}

export interface CreateWidgetInput {
    name: string;
    type: WidgetType;
    content_type: WidgetContentType;
    content: string;
    is_global?: boolean;
    is_active?: boolean;
    partner_ids?: string[];
}

export interface UpdateWidgetInput {
    name?: string;
    type?: WidgetType;
    content_type?: WidgetContentType;
    content?: string;
    is_global?: boolean;
    is_active?: boolean;
    partner_ids?: string[];
}
