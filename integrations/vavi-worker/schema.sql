-- Esquema inicial D1: sem dados pessoais, pagamentos ou pedidos.
-- Preços sempre em centavos, não números de ponto flutuante.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS variants (
  sku TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents > 0),
  available INTEGER NOT NULL DEFAULT 0 CHECK(available IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
