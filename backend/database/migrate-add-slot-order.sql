-- Add slot_order column to lecture table if it doesn't exist
ALTER TABLE lecture 
ADD COLUMN IF NOT EXISTS slot_order INTEGER DEFAULT 0;

-- Update index for better performance
CREATE INDEX IF NOT EXISTS idx_lecture_slot_order ON lecture(slot_order);

-- Log successful migration
DO $$ 
BEGIN
  RAISE NOTICE 'Successfully added slot_order column to lecture table';
END $$;
