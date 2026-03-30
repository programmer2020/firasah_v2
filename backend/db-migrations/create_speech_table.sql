-- Create lecture table for storing transcriptions
CREATE TABLE IF NOT EXISTS lecture (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    time_slot_id INTEGER REFERENCES section_time_slots(time_slot_id) ON DELETE SET NULL,
    transcript TEXT COLLATE "C",
    language VARCHAR(10),
    duration DECIMAL(10, 2),
    slot_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lecture_file_id ON lecture(file_id);
CREATE INDEX IF NOT EXISTS idx_lecture_time_slot_id ON lecture(time_slot_id);
