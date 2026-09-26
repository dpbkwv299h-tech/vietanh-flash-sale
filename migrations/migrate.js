import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

// Khởi tạo kết nối cơ sở dữ liệu PostgreSQL từ môi trường (env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : false,
});

// Lấy đường dẫn thư mục hiện tại của tệp
const dir = path.dirname(new URL(import.meta.url).pathname);

try {
  // 1. Tạo bảng quản lý phiên bản migration nếu chưa tồn tại
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`
  );

  // 2. Đọc tất cả các tệp .sql trong thư mục và sắp xếp theo thứ tự
  for (const file of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    // Kiểm tra xem tệp SQL này đã được thực thi chưa
    const exists = await pool.query(
      `SELECT 1 FROM schema_migrations WHERE version=$1`,
      [file]
    );
    if (exists.rowCount) continue;

    // Đọc nội dung tệp SQL
    const sql = fs.readFileSync(path.join(dir, file), "utf8");

    // Thực thi tệp SQL trong một Transaction (BEGIN...COMMIT)
    await pool.query("BEGIN");
    await pool.query(sql);
    await pool.query(`INSERT INTO schema_migrations(version) VALUES($1)`, [
      file,
    ]);
    await pool.query("COMMIT");

    console.log("Applied", file);
  }
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  // Đóng kết nối PostgreSQL khi hoàn thành
  await pool.end();
}
