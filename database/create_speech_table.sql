-- Create speech table for storing transcriptions
CREATE TABLE IF NOT EXISTS speech (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES sound_files(file_id) ON DELETE CASCADE,
    transcript TEXT COLLATE "C",
    language VARCHAR(10),
    duration DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_speech_file_id ON speech(file_id);
