-- Migration to add image_url column to transactions table
-- Run this SQL command in your Supabase SQL editor

ALTER TABLE transactions 
ADD COLUMN image_url TEXT;

-- Add index for better performance when querying by image_url
CREATE INDEX idx_transactions_image_url ON transactions(image_url) WHERE image_url IS NOT NULL;

-- Optional: Add comment to document the column
COMMENT ON COLUMN transactions.image_url IS 'URL of the receipt image stored in Supabase storage';