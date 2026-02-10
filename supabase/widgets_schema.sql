-- Widgets System Schema

-- Widgets table
CREATE TABLE IF NOT EXISTS widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('sidebar', 'content')),
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'html')),
    content TEXT NOT NULL,
    is_global BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Widget Partners junction table
CREATE TABLE IF NOT EXISTS widget_partners (
    id BIGSERIAL PRIMARY KEY,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(widget_id, partner_id)
);

-- Enable RLS
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_partners ENABLE ROW LEVEL SECURITY;

-- Policies (Allow all for now as per project convention)
CREATE POLICY "Allow all" ON widgets FOR ALL USING (true);
CREATE POLICY "Allow all" ON widget_partners FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_widgets_active ON widgets(is_active);
CREATE INDEX IF NOT EXISTS idx_widgets_global ON widgets(is_global);
CREATE INDEX IF NOT EXISTS idx_widget_partners_widget ON widget_partners(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_partners_partner ON widget_partners(partner_id);

COMMENT ON TABLE widgets IS 'Widgets for sidebars and content area';
COMMENT ON TABLE widget_partners IS 'Mapping widgets to specific partners';
