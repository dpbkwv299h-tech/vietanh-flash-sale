let key = "", products = [];
const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat("vi-VN").format(n) + "đ";

// Hàm xử lý đăng nhập vào bảng quản trị
window.login = () => {
  key = $("#key").value;
  if (key) {
    $("#login").classList.add("hidden");
    $("#panel").classList.remove("hidden");
    load();
  }
};

// Hàm gửi request API kèm Header xác thực Admin (x-admin-key)
async function api(url, opt = {}) {
  opt.headers = { ...(opt.headers || {}), "x-admin-key": key };
  return fetch(url, opt);
}

// Tải dữ liệu sản phẩm & danh sách đơn hàng ra giao diện Quản trị
async function load() {
  // Lấy danh sách sản phẩm
  products = await fetch("/api/products").then((r) => r.json());
  $("#plist").innerHTML = products
    .map(
      (p) => `<div class="row">
        <b>${p.emoji} ${p.id} — ${p.name}</b>
        <span>${money(p.price)} | tồn ${p.stock} | ${p.promoTitle || "Chưa có CTKM"}</span>
        <button onclick='edit(${JSON.stringify(p)})'>Sửa CTKM</button>
        <button onclick="del('${p.id}')">Tắt</button>
      </div>`
    )
    .join("");

  // Lấy danh sách đơn hàng
  const o = await api("/api/orders").then((r) => r.json());
  $("#orders").innerHTML = o
    .map(
      (x) => `<div class="row">
        <b>${x.id}</b> ${x.name} — ${x.product_name} x${x.qty} — ${money(x.total)} — ${x.status} 
        <select onchange="status('${x.id}',this.value)">
          <option ${x.status === "Mới" ? "selected" : ""}>Mới</option>
          <option ${x.status === "Đã xác nhận" ? "selected" : ""}>Đã xác nhận</option>
          <option ${x.status === "Đã giao" ? "selected" : ""}>Đã giao</option>
          <option ${x.status === "Đã hủy" ? "selected" : ""}>Đã hủy</option>
        </select>
      </div>`
    )
    .join("");
}

// Đổ dữ liệu sản phẩm vào Form để chỉnh sửa
window.edit = (p) => {
  for (const [k, v] of Object.entries(p)) {
    const el = $(`[name="${k}"]`);
    if (el) el.value = v ?? "";
  }
};

// Hàm ẩn/tắt sản phẩm (DELETE API)
window.del = async (id) => {
  await api("/api/products/" + id, { method: "DELETE" });
  load();
};

// Cập nhật trạng thái đơn hàng (PATCH API)
window.status = async (id, status) => {
  await api("/api/orders/" + id + "/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  load();
};

// Lắng nghe sự kiện thêm mới hoặc cập nhật sản phẩm / CTKM
$("#productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e));

  // Chuyển đổi dữ liệu kiểu số
  for (const k of ["oldPrice", "price", "stock"]) d[k] = Number(d[k]);

  let existing = products.find((p) => p.id === d.id);
  const r = await api(existing ? "/api/products/" + d.id : "/api/products", {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  });

  const j = await r.json();
  alert(r.ok ? "Đã lưu" : "Lỗi: " + j.error);
  if (r.ok) load();
});
