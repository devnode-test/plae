CREATE TABLE IF NOT EXISTS metric_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('eje', 'foco', 'objetivo', 'indicador', 'meta', 'axis', 'focus', 'objective', 'indicator', 'goal')),
    entity_id UUID NOT NULL,
    effort DOUBLE PRECISION NOT NULL DEFAULT 0,
    compliance DOUBLE PRECISION NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(level, entity_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshot_level_entity_date
    ON metric_snapshot(level, entity_id, snapshot_date DESC);

ALTER TABLE metric_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON metric_snapshot;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON metric_snapshot;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON metric_snapshot;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON metric_snapshot;

CREATE POLICY "Enable read access for all users" ON metric_snapshot
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON metric_snapshot
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON metric_snapshot
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON metric_snapshot
FOR DELETE TO authenticated
USING (true);

GRANT SELECT ON metric_snapshot TO anon;
GRANT ALL PRIVILEGES ON metric_snapshot TO authenticated;
