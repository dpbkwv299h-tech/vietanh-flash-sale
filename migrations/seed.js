import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Khởi tạo kết nối cơ sở dữ liệu PostgreSQL từ biến môi trường
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

// Danh sách dữ liệu mẫu của 5 sản phẩm (SKU)
const products = [
  ["SKU01", "Gà dai da giòn", "Flash Sale cực sốc", "🍗", 110000, 55000, 50, "🔥 GÀ DAI DA GIÒN", "Chỉ 55.000đ/con"],
  ["SKU02", "Bắp Mỹ luộc", "Bắp ngọt hấp dẫn", "🌽", 30000, 20000, 50, "🔥 BẮP MỸ", "20.000đ / 3 trái"],
  ["SKU03", "Rau lá", "Rau tươi mỗi ngày", "🥬", 10000, 5000, 100, "🔥 RAU LÁ", "Chỉ 5.000đ / gói"],
  ["SKU04", "Kem hộp", "Mát lạnh giá sốc", "🍦", 45000, 25000, 40, "🔥 KEM FLASH SALE", "Chỉ 25.000đ"],
  ["SKU05", "Nước giải khát", "Ưu đãi buổi sáng", "🥤", 15000, 9000, 80, "🔥 NƯỚC GIẢI KHÁT", "Chỉ 9.000đ"]
];

// Nạp dữ liệu vào bảng products
for (const p of products) {
  await pool.query(
    `INSERT INTO products(id, name, description, emoji, old_price, price, stock, promo_title, promo_text)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT(id) DO UPDATE SET 
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       emoji = EXCLUDED.emoji,
       old_price = EXCLUDED.old_price,
       price = EXCLUDED.price,
       promo_title = EXCLUDED.promo_title,
       promo_text = EXCLUDED.promo_text`,
    p
  );
}

console.log("Seeded 5 SKUs");
await pool.end();
