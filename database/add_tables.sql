-- Create sound_files table
CREATE TABLE IF NOT EXISTS sound_files (
  file_id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL COLLATE "C",
  filepath VARCHAR(500) NOT NULL COLLATE "C",
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy VARCHAR(255) COLLATE "C",
  note TEXT COLLATE "C",
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create kpis table
CREATE TABLE IF NOT EXISTS kpis (
  kpi_id SERIAL PRIMARY KEY,
  kpi_name VARCHAR(255) NOT NULL COLLATE "C",
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
  file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  evidence_txt TEXT COLLATE "C",
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
  kpi_id INTEGER NOT NULL REFERENCES kpis(kpi_id) ON DELETE CASCADE,
  evidence_count INTEGER DEFAULT 0,
  mark DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_sound_files_filename ON sound_files(filename);
CREATE INDEX idx_sound_files_createdby ON sound_files(createdBy);
CREATE INDEX idx_kpis_kpi_name ON kpis(kpi_name);
CREATE INDEX idx_kpis_createdby ON kpis(createdBy);
CREATE INDEX idx_evidences_kpi_id ON evidences(kpi_id);
CREATE INDEX idx_evidences_file_id ON evidences(file_id);
CREATE INDEX idx_evaluations_file_id ON evaluations(file_id);
CREATE INDEX idx_evaluations_kpi_id ON evaluations(kpi_id);

-- Add comments to tables
COMMENT ON TABLE sound_files IS 'Stores audio file metadata for the application';
COMMENT ON TABLE kpis IS 'Stores KPI (Key Performance Indicator) data';
COMMENT ON TABLE evidences IS 'Stores evidence records linking KPIs to sound files with time ranges';
COMMENT ON TABLE evaluations IS 'Stores evaluation scores and evidence counts for KPIs and sound files';

-- Add column comments
COMMENT ON COLUMN sound_files.file_id IS 'Unique identifier for sound file';
COMMENT ON COLUMN sound_files.filename IS 'Name of the sound file';
COMMENT ON COLUMN sound_files.filepath IS 'Path to the sound file';
COMMENT ON COLUMN sound_files.createdBy IS 'User who created the file';
COMMENT ON COLUMN sound_files.note IS 'Additional notes about the file';

COMMENT ON COLUMN kpis.kpi_id IS 'Unique identifier for KPI';
COMMENT ON COLUMN kpis.kpi_name IS 'Name of the KPI';
COMMENT ON COLUMN kpis.createdBy IS 'User who created the KPI';
COMMENT ON COLUMN kpis.note IS 'Additional notes about the KPI';

COMMENT ON COLUMN evidences.id IS 'Unique identifier for evidence';
COMMENT ON COLUMN evidences.kpi_id IS 'Foreign key to KPIs table';
COMMENT ON COLUMN evidences.file_id IS 'Foreign key to sound_files table';
COMMENT ON COLUMN evidences.start_time IS 'Start time of the evidence';
COMMENT ON COLUMN evidences.end_time IS 'End time of the evidence';
COMMENT ON COLUMN evidences.evidence_txt IS 'Text description of the evidence';
