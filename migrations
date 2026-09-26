-- Bảng lưu trữ thông tin sản phẩm và chương trình khuyến mãi
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🔥',
  old_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  price NUMERIC(12,2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  promo_title TEXT DEFAULT '',
  promo_text TEXT DEFAULT '',
  promo_start TIMESTAMPTZ,
  promo_end TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng lưu trữ thông tin đơn hàng
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  store TEXT NOT NULL,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty > 0),
  total NUMERIC(12,2) NOT NULL,
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Mới',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục (Index) tối ưu tốc độ truy vấn danh sách đơn hàng theo thời gian tạo
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
