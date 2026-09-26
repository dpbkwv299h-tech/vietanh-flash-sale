import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
});

const TZ = "Asia/Ho_Chi_Minh";

function vnParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const x = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return { hour:+x.hour, minute:+x.minute, second:+x.second };
}
function vnTime() {
  const p = vnParts();
  return `${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}:${String(p.second).padStart(2,"0")}`;
}
function saleOpen() {
  const {hour} = vnParts();
  return hour >= 6 && hour < 10;
}
function admin(req,res,next) {
  if (!process.env.ADMIN_API_KEY) return res.status(500).json({error:"ADMIN_API_KEY chưa cấu hình"});
  if (req.get("x-admin-key") !== process.env.ADMIN_API_KEY) return res.status(401).json({error:"Unauthorized"});
  next();
}

app.get("/health", async (_,res) => {
  try { await pool.query("SELECT 1"); res.json({status:"ok",database:"ok",timezone:TZ,vietnamTime:vnTime(),flashSaleOpen:saleOpen()}); }
  catch(e){ res.status(500).json({status:"error",database:"error",message:e.message}); }
});

app.get("/api/status", (_,res) => res.json({timezone:TZ,vietnamTime:vnTime(),open:saleOpen(),start:"06:00",end:"10:00"}));

app.get("/api/products", async (_,res) => {
  try {
    const {rows}=await pool.query(`SELECT id,name,description,emoji,old_price AS "oldPrice",price,stock,promo_title AS "promoTitle",promo_text AS "promoText",promo_start AS "promoStart",promo_end AS "promoEnd",active FROM products ORDER BY id`);
    res.json(rows);
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.post("/api/orders", async (req,res)=>{
  if(!saleOpen()) return res.status(400).json({error:"Flash Sale chỉ nhận đơn từ 06:00 đến trước 10:00 giờ Việt Nam.",vietnamTime:vnTime()});
  const {name,phone,store,productId,qty,note=""}=req.body;
  const quantity=Number(qty);
  if(!name || !phone || !store || !productId || !Number.isInteger(quantity) || quantity<1)
    return res.status(400).json({error:"Thông tin đặt hàng chưa hợp lệ."});
  const c=await pool.connect();
  try {
    await c.query("BEGIN");
    const r=await c.query(`SELECT * FROM products WHERE id=$1 AND active=true FOR UPDATE`,[productId]);
    const p=r.rows[0];
    if(!p) throw new Error("Sản phẩm không tồn tại.");
    if(p.stock<quantity) throw new Error(`Chỉ còn ${p.stock} suất.`);
    const id="FS-"+crypto.randomBytes(4).toString("hex").toUpperCase();
    const total=Number(p.price)*quantity;
    await c.query(`UPDATE products SET stock=stock-$1 WHERE id=$2`,[quantity,productId]);
    await c.query(`INSERT INTO orders(id,name,phone,store,product_id,product_name,qty,total,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id,name,phone,store,p.id,p.name,quantity,total,note]);
    await c.query("COMMIT");
    res.status(201).json({success:true,id,total,product:p.name,qty:quantity});
  } catch(e){ await c.query("ROLLBACK"); res.status(400).json({error:e.message}); }
  finally{ c.release(); }
});

app.get("/api/orders",admin,async(req,res)=>{
  try {
    const {rows}=await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
    res.json(rows);
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.patch("/api/orders/:id/status",admin,async(req,res)=>{
  const allowed=["Mới","Đã xác nhận","Đã giao","Đã hủy"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:"Trạng thái không hợp lệ"});
  const c=await pool.connect();
  try{
    await c.query("BEGIN");
    const r=await c.query(`SELECT * FROM orders WHERE id=$1 FOR UPDATE`,[req.params.id]);
    const o=r.rows[0]; if(!o) throw new Error("Không tìm thấy đơn");
    if(o.status!=="Đã hủy" && req.body.status==="Đã hủy")
      await c.query(`UPDATE products SET stock=stock+$1 WHERE id=$2`,[o.qty,o.product_id]);
    const u=await c.query(`UPDATE orders SET status=$1 WHERE id=$2 RETURNING *`,[req.body.status,o.id]);
    await c.query("COMMIT"); res.json(u.rows[0]);
  }catch(e){await c.query("ROLLBACK");res.status(400).json({error:e.message});}finally{c.release();}
});

app.post("/api/products",admin,async(req,res)=>{
  const {id,name,description="",emoji="🔥",oldPrice,price,stock=0,promoTitle="",promoText="",promoStart=null,promoEnd=null,active=true}=req.body;
  if(!id||!name||Number(price)<0) return res.status(400).json({error:"Thiếu id, tên hoặc giá"});
  try{
    const {rows}=await pool.query(`INSERT INTO products(id,name,description,emoji,old_price,price,stock,promo_title,promo_text,promo_start,promo_end,active)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,[id,name,description,emoji,oldPrice,price,stock,promoTitle,promoText,promoStart,promoEnd,active]);
    res.status(201).json(rows[0]);
  }catch(e){res.status(400).json({error:e.message});}
});

app.patch("/api/products/:id",admin,async(req,res)=>{
  const fields=["name","description","emoji","oldPrice","price","stock","promoTitle","promoText","promoStart","promoEnd","active"];
  const map={oldPrice:"old_price",promoTitle:"promo_title",promoText:"promo_text",promoStart:"promo_start",promoEnd:"promo_end"};
  const set=[],vals=[]; let i=1;
  for(const f of fields) if(req.body[f]!==undefined){set.push(`${map[f]||f}=$${i++}`);vals.push(req.body[f]);}
  if(!set.length)return res.status(400).json({error:"Không có dữ liệu thay đổi"});
  vals.push(req.params.id);
  try{const {rows}=await pool.query(`UPDATE products SET ${set.join(",")} WHERE id=$${i} RETURNING *`,vals); if(!rows[0])return res.status(404).json({error:"Không tìm thấy sản phẩm"});res.json(rows[0]);}
  catch(e){res.status(400).json({error:e.message});}
});

app.delete("/api/products/:id",admin,async(req,res)=>{
  try{const {rows}=await pool.query(`UPDATE products SET active=false WHERE id=$1 RETURNING id`,[req.params.id]); if(!rows[0])return res.status(404).json({error:"Không tìm thấy"});res.json({success:true});}
  catch(e){res.status(400).json({error:e.message});}
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Flash Sale running :${port} | ${TZ} | ${vnTime()}`));