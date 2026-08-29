CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT NOT NULL,
  service TEXT NOT NULL,
  kg REAL NOT NULL,
  amount REAL NOT NULL,
  delivery REAL NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Received',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_mobile
ON orders(mobile);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at);
