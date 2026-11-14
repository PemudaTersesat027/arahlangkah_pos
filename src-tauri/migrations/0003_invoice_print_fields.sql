ALTER TABLE transactions ADD COLUMN customer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN customer_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN customer_address TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN customer_note TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100);
ALTER TABLE transactions ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0 CHECK (tax_amount >= 0);
