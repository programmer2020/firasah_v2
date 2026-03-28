-- Create fragments table for storing 15-minute audio fragments
CREATE TABLE IF NOT EXISTS fragments (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    lecture_id INTEGER REFERENCES lecture(id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
    fragment_order INTEGER NOT NULL,
    start_seconds DECIMAL(10, 2) NOT NULL,
    end_seconds DECIMAL(10, 2) NOT NULL,
    duration DECIMAL(10, 2) NOT NULL,
    fragment_path VARCHAR(500),
    transcript TEXT COLLATE "C",
    language VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fragments_file_id ON fragments(file_id);
CREATE INDEX IF NOT EXISTS idx_fragments_lecture_id ON fragments(lecture_id);
CREATE INDEX IF NOT EXISTS idx_fragments_time_slot_id ON fragments(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_fragments_order ON fragments(file_id, fragment_order);
