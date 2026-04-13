-- Запусти этот SQL в Supabase → SQL Editor

-- Таблица товаров
CREATE TABLE products (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       INTEGER NOT NULL,
  old_price   INTEGER,
  description TEXT,
  sizes       TEXT[] DEFAULT '{}',
  images      TEXT[] DEFAULT '{}',
  is_new      BOOLEAN DEFAULT false,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Разрешить чтение всем (для сайта)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Читать могут все" ON products
  FOR SELECT USING (active = true);

CREATE POLICY "Писать может сервис" ON products
  FOR ALL USING (true);

-- Хранилище фотографий
-- В Supabase → Storage → создай bucket с именем "products"
-- Настройки: Public bucket = ON

-- Проверка (должна вернуть пустой список)
SELECT * FROM products;
