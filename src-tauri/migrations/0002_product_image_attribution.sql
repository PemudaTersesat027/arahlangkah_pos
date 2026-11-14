ALTER TABLE products ADD COLUMN image_attribution TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN image_source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN image_license TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN image_license_url TEXT NOT NULL DEFAULT '';
