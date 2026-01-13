-- Migration: Create Elements Tables
-- Created: 2026-01-13
-- Description: Creates tables for the Elements feature to organize generated images by color/theme

-- Create elements table
CREATE TABLE IF NOT EXISTS elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- hex color code (e.g., #FF5733)
  user_id UUID, -- optional for now, can link to auth.users later
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create element_photos table
CREATE TABLE IF NOT EXISTS element_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0, -- order of photo within element
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_elements_user_id ON elements(user_id);
CREATE INDEX IF NOT EXISTS idx_elements_created_at ON elements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_element_photos_element_id ON element_photos(element_id);
CREATE INDEX IF NOT EXISTS idx_element_photos_position ON element_photos(element_id, position);

-- Create updated_at trigger function for elements table
CREATE OR REPLACE FUNCTION update_elements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on elements
CREATE TRIGGER trigger_update_elements_updated_at
  BEFORE UPDATE ON elements
  FOR EACH ROW
  EXECUTE FUNCTION update_elements_updated_at();

-- Add RLS (Row Level Security) policies
-- Enable RLS
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE element_photos ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (can be tightened later with auth)
CREATE POLICY "Allow all access to elements" ON elements
  FOR ALL USING (true);

CREATE POLICY "Allow all access to element_photos" ON element_photos
  FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE elements IS 'Stores user-defined elements (color themes/categories) for organizing generated images';
COMMENT ON TABLE element_photos IS 'Stores photos/images associated with elements';
COMMENT ON COLUMN elements.color IS 'Hex color code representing the element theme (e.g., #FF5733)';
COMMENT ON COLUMN element_photos.position IS 'Sort order for photos within an element (0-indexed)';
