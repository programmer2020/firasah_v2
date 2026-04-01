-- Create sound_files table
CREATE TABLE IF NOT EXISTS sound_files (
  file_id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL COLLATE "C",
  filepath VARCHAR(500) NOT NULL COLLATE "C",
  createdBy VARCHAR(255) COLLATE "C",
  note TEXT COLLATE "C",
  class_id INTEGER,
  day_of_week VARCHAR(10) COLLATE "C",
  slot_date DATE,
  transcript TEXT COLLATE "C",
  transcript_language VARCHAR(10) COLLATE "C",
  transcript_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create domains table for teaching evaluation framework
CREATE TABLE IF NOT EXISTS domains (
  domain_id SERIAL PRIMARY KEY,
  domain_code VARCHAR(20) NOT NULL UNIQUE COLLATE "C",
  domain_name VARCHAR(255) NOT NULL COLLATE "C",
  domain_description TEXT COLLATE "C",
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create kpis table with domain reference
CREATE TABLE IF NOT EXISTS kpis (
  kpi_id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(domain_id) ON DELETE CASCADE,
  kpi_code VARCHAR(20) COLLATE "C",
  kpi_name VARCHAR(255) NOT NULL COLLATE "C",
  kpi_description TEXT COLLATE "C",
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy VARCHAR(255) COLLATE "C",
  note TEXT COLLATE "C",
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create evidences table
CREATE TABLE IF NOT EXISTS evidences (
  id SERIAL PRIMARY KEY,
  kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
  lecture_id INTEGER NOT NULL REFERENCES lecture(lecture_id) ON DELETE CASCADE,
  start_time TIME,
  end_time TIME,
  status VARCHAR(50),
  facts TEXT,
  interpretation TEXT,
  limitations TEXT,
  confidence INTEGER,
  iscalculated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lecture_kpi table
CREATE TABLE IF NOT EXISTS lecture_kpi (
  lecture_id INTEGER NOT NULL REFERENCES lecture(lecture_id) ON DELETE CASCADE,
  kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
  avg_confidence NUMERIC,
  evidence_count INTEGER DEFAULT 0,
  score NUMERIC(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lecture_id, kpi_id)
);

-- Create evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
  kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
  evidence_count INTEGER DEFAULT 0,
  avg_confidence DECIMAL(5, 2) DEFAULT 0,
  kpi_score DECIMAL(5, 2) DEFAULT 0,
  mark VARCHAR(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_evaluations_file_kpi UNIQUE (file_id, kpi_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sound_files_filename ON sound_files(filename);
CREATE INDEX IF NOT EXISTS idx_sound_files_createdby ON sound_files(createdBy);
CREATE INDEX IF NOT EXISTS idx_domains_code ON domains(domain_code);
CREATE INDEX IF NOT EXISTS idx_kpis_domain_id ON kpis(domain_id);
CREATE INDEX IF NOT EXISTS idx_kpis_code ON kpis(kpi_code);
CREATE INDEX IF NOT EXISTS idx_kpis_kpi_name ON kpis(kpi_name);
CREATE INDEX IF NOT EXISTS idx_kpis_createdby ON kpis(createdBy);
CREATE INDEX IF NOT EXISTS idx_evidences_kpi_id ON evidences(kpi_id);
CREATE INDEX IF NOT EXISTS idx_evidences_lecture_id ON evidences(lecture_id);
CREATE INDEX IF NOT EXISTS idx_evidences_lecture_kpi_iscalculated ON evidences(lecture_id, kpi_id, iscalculated);
CREATE INDEX IF NOT EXISTS idx_evaluations_file_id ON evaluations(file_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_kpi_id ON evaluations(kpi_id);

-- Add comments to tables
COMMENT ON TABLE sound_files IS 'Stores audio file metadata for the application';
COMMENT ON TABLE domains IS 'Teaching evaluation framework domains (8 domains)';
COMMENT ON TABLE kpis IS 'Stores KPI (Key Performance Indicator) data with domain reference';
COMMENT ON TABLE evidences IS 'Stores evidence records linking KPIs to sound files with time ranges';
COMMENT ON TABLE evaluations IS 'Stores evaluation scores and evidence counts for KPIs and sound files';

-- Add column comments
COMMENT ON COLUMN sound_files.file_id IS 'Unique identifier for sound file';
COMMENT ON COLUMN sound_files.filename IS 'Name of the sound file';
COMMENT ON COLUMN sound_files.filepath IS 'Path to the sound file';
COMMENT ON COLUMN sound_files.createdBy IS 'User who created the file';
COMMENT ON COLUMN sound_files.note IS 'Additional notes about the file';
COMMENT ON COLUMN sound_files.transcript IS 'Full transcript aggregated from all processed fragments';
COMMENT ON COLUMN sound_files.transcript_language IS 'Detected or selected transcript language';
COMMENT ON COLUMN sound_files.transcript_updated_at IS 'When the aggregated transcript was last rebuilt';

COMMENT ON COLUMN domains.domain_id IS 'Unique identifier for teaching domain';
COMMENT ON COLUMN domains.domain_code IS 'Domain code (D1-D8)';
COMMENT ON COLUMN domains.domain_name IS 'Domain name in Arabic and English';
COMMENT ON COLUMN domains.domain_description IS 'Description of the domain';
COMMENT ON COLUMN domains.sort_order IS 'Order for display';

COMMENT ON COLUMN kpis.kpi_id IS 'Unique identifier for KPI';
COMMENT ON COLUMN kpis.domain_id IS 'Reference to KPI domain (foreign key)';
COMMENT ON COLUMN kpis.kpi_code IS 'KPI code (1.1, 1.2, ... 8.2)';
COMMENT ON COLUMN kpis.kpi_name IS 'Name of the KPI';
COMMENT ON COLUMN kpis.kpi_description IS 'Detailed description of the KPI';
COMMENT ON COLUMN kpis.createdBy IS 'User who created the KPI';
COMMENT ON COLUMN kpis.note IS 'Additional notes about the KPI';

COMMENT ON COLUMN evidences.id IS 'Unique identifier for evidence';
COMMENT ON COLUMN evidences.kpi_id IS 'Foreign key to KPIs table';
COMMENT ON COLUMN evidences.lecture_id IS 'Foreign key to lecture table';
COMMENT ON COLUMN evidences.start_time IS 'Start time of the evidence';
COMMENT ON COLUMN evidences.end_time IS 'End time of the evidence';
COMMENT ON COLUMN evidences.evidence_txt IS 'Text description of the evidence';
COMMENT ON COLUMN evidences.iscalculated IS 'Whether this evidence row was already aggregated into evaluations';
