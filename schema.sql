CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, mobile TEXT NOT NULL, address TEXT NOT NULL,
 pickup_date TEXT DEFAULT '', service TEXT NOT NULL, kg REAL NOT NULL, subtotal INTEGER NOT NULL,
 delivery_fee INTEGER NOT NULL, total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Received',
 ready INTEGER NOT NULL DEFAULT 0, signature TEXT DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(mobile);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
