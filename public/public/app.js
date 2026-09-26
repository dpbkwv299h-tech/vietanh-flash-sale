const $ = (s) => document.querySelector(s);
let products = [];

// Hàm định dạng tiền tệ Việt Nam (VNĐ)
const money = (n) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

// Tải dữ liệu ban đầu từ Server (danh sách sản phẩm & trạng thái hệ thống)
async function load() {
  const [pr, st] = await Promise.all([
    fetch("/api/products").then((r) => r.json()),
    fetch("/api/status").then((r) => r.json()),
  ]);
  products = pr;
  render(st);

  // Cập nhật đếm ngược mỗi 1 giây
  setInterval(
    async () => render(await fetch("/api/status").then((r) => r.json())),
    1000
  );
}

// Hiển thị dữ liệu lên giao diện HTML
function render(st) {
  const now = st.vietnamTime.split(":").map(Number);
  let target;

  // Xử lý mốc thời gian Flash Sale (6h - 10h)
  if (st.open) target = 10 * 3600;
  else target = now[0] < 6 ? 6 * 3600 : 30 * 3600;

  let sec = target - (now[0] * 3600 + now[1] * 60 + now[2]);
  if (sec < 0) sec += 24 * 3600;

  // Hiển thị đồng hồ đếm ngược HH:MM:SS
  $("#countdown").textContent = `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec \% 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  // Cập nhật khung thông báo nếu đợt sale đang đóng
  const closed = $("#closed");
  closed.classList.toggle("hidden", st.open);
  if (!st.open)
    closed.textContent =
      "Flash Sale đang đóng. Hệ thống nhận đơn từ 06:00 đến trước 10:00.";

  // Render danh sách sản phẩm ra khung dạng lưới
  $("#products").innerHTML = products
    .map(
      (p) => `<article class="card">
        <div class="emoji">${p.emoji}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="promo">${p.promoTitle}</div>
        <s>${money(p.oldPrice)}</s>
        <strong>${money(p.price)}</strong>
        <p>Còn ${p.stock} suất</p>
        <button onclick="choose('${p.id}')">MUA NGAY</button>
      </article>`
    )
    .join("");

  // Render các lựa chọn vào dropdown của Form đặt hàng
  $("#productSelect").innerHTML = products
    .filter((p) => p.active && p.stock > 0)
    .map((p) => `<option value="${p.id}">${p.name} —${money(p.price)}</option>`)
    .join("");
}

// Hàm chọn nhanh sản phẩm và cuộn mượt xuống Form đặt hàng
window.choose = (id) => {
  $("#productSelect").value = id;
  $("#orderForm").scrollIntoView({ behavior: "smooth" });
};

// Lắng nghe sự kiện Gửi form đặt hàng
$("#orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e));

  const r = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const j = await r.json();

  // Hiển thị kết quả đặt hàng (Thành công/Thất bại)
  $("#result").textContent = r.ok
    ? `✅ Đặt hàng thành công! Mã đơn: ${j.id} — Tổng: ${money(j.total)}`
    : `❌ ${j.error}`;

  if (r.ok) {
    e.target.reset();
    load();
  }
});

// Chạy ứng dụng
load();
