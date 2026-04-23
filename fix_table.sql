ALTER TABLE complement_categories RENAME COLUMN order_index TO "order";
ALTER TABLE complement_categories ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT false;
ALTER TABLE complement_categories ADD COLUMN IF NOT EXISTS min_select INTEGER DEFAULT 0;
ALTER TABLE complement_categories ADD COLUMN IF NOT EXISTS max_select INTEGER DEFAULT 1;
