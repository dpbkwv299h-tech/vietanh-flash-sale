let key = "";
let products = [];

const $ = (selector) => document.querySelector(selector);

const money = (n) =>
  new Intl.NumberFormat("vi-VN").format(Number(n || 0)) + "đ";

/* =========================
   HIỂN THỊ LỖI
========================= */

function showError(message) {
  console.error(message);
  alert("❌ " + message);
}

/* =========================
   ĐĂNG NHẬP ADMIN
========================= */

window.login = async () => {
  const keyInput = $("#key");

  if (!keyInput) {
    showError("Không tìm thấy ô ADMIN_API_KEY.");
    return;
  }

  key = keyInput.value.trim();

  if (!key) {
    showError("Vui lòng nhập ADMIN_API_KEY.");
    keyInput.focus();
    return;
  }

  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error(
        `Không thể kết nối API sản phẩm. HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("API sản phẩm trả về dữ liệu không hợp lệ.");
    }

    $("#login").classList.add("hidden");
    $("#panel").classList.remove("hidden");

    products = data;

    await load();

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    $("#login").classList.remove("hidden");
    $("#panel").classList.add("hidden");

    showError(
      "Không thể mở Admin.\n\n" +
      (error.message || "Lỗi kết nối máy chủ.")
    );
  }
};

/* =========================
   API ADMIN
========================= */

async function api(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "x-admin-key": key
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}

/* =========================
   ĐỌC JSON AN TOÀN
========================= */

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON ERROR:", text);

    throw new Error(
      `Server trả về dữ liệu không hợp lệ (HTTP ${response.status}).`
    );
  }
}

/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   TẢI DANH SÁCH SẢN PHẨM
========================= */

async function loadProducts() {
  const response = await fetch("/api/products");

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Không thể tải sản phẩm. HTTP ${response.status}`
    );
  }

  if (!Array.isArray(data)) {
    throw new Error("Danh sách sản phẩm không hợp lệ.");
  }

  products = data;

  const list = $("#plist");

  if (!list) {
    return;
  }

  if (products.length === 0) {
    list.innerHTML = `
      <div class="row">
        Chưa có sản phẩm nào.
      </div>
    `;
    return;
  }

  list.innerHTML = products
    .map((p) => {
      const productJson = JSON.stringify(p)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");

      return `
        <div class="row">
          <b>
            ${escapeHtml(p.emoji || "")}
            ${escapeHtml(p.id)}
            — ${escapeHtml(p.name)}
          </b>

          <span>
            ${money(p.price)}
            |
            tồn ${Number(p.stock || 0)}
            |
            ${escapeHtml(p.promoTitle || "Chưa có CTKM")}
          </span>

          <button
            type="button"
            onclick='edit(${productJson})'>
            Sửa CTKM
          </button>

          <button
            type="button"
            onclick="del('${escapeHtml(p.id)}')">
            Tắt
          </button>
        </div>
      `;
    })
    .join("");
}

/* =========================
   TẢI ĐƠN HÀNG
========================= */

async function loadOrders() {
  const response = await api("/api/orders");

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Không thể tải đơn hàng. HTTP ${response.status}`
    );
  }

  const orders = Array.isArray(data) ? data : [];

  const orderList = $("#orders");

  if (!orderList) {
    return;
  }

  if (orders.length === 0) {
    orderList.innerHTML = `
      <div class="row">
        Chưa có đơn hàng.
      </div>
    `;
    return;
  }

  orderList.innerHTML = orders
    .map(
      (x) => `
        <div class="row">

          <b>${escapeHtml(x.id)}</b>

          ${escapeHtml(x.name)}
          —
          ${escapeHtml(x.product_name)}
          x${Number(x.qty || 0)}
          —
          ${money(x.total)}
          —
          ${escapeHtml(x.status)}

          <select
            onchange="status('${escapeHtml(x.id)}', this.value)">

            <option
              value="Mới"
              ${x.status === "Mới" ? "selected" : ""}>
              Mới
            </option>

            <option
              value="Đã xác nhận"
              ${x.status === "Đã xác nhận" ? "selected" : ""}>
              Đã xác nhận
            </option>

            <option
              value="Đã giao"
              ${x.status === "Đã giao" ? "selected" : ""}>
              Đã giao
            </option>

            <option
              value="Đã hủy"
              ${x.status === "Đã hủy" ? "selected" : ""}>
              Đã hủy
            </option>

          </select>

        </div>
      `
    )
    .join("");
}

/* =========================
   LOAD TOÀN BỘ ADMIN
========================= */

async function load() {
  try {
    await loadProducts();
  } catch (error) {
    console.error("PRODUCT LOAD ERROR:", error);
    showError(error.message || "Không tải được danh sách sản phẩm.");
  }

  try {
    await loadOrders();
  } catch (error) {
    console.error("ORDER LOAD ERROR:", error);

    const orderList = $("#orders");

    if (orderList) {
      orderList.innerHTML = `
        <div class="row">
          Không tải được đơn hàng:
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

/* =========================
   SỬA SẢN PHẨM
========================= */

window.edit = (product) => {
  if (!product) {
    showError("Không có dữ liệu sản phẩm.");
    return;
  }

  const fields = [
    "id",
    "name",
    "description",
    "emoji",
    "oldPrice",
    "price",
    "stock",
    "promoTitle",
    "promoText",
    "promoStart",
    "promoEnd",
    "active"
  ];

  for (const field of fields) {
    const element = document.querySelector(
      `[name="${field}"]`
    );

    if (element) {
      element.value =
        product[field] === null ||
        product[field] === undefined
          ? ""
          : product[field];
    }
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

/* =========================
   TẮT SẢN PHẨM
========================= */

window.del = async (id) => {
  if (!id) {
    showError("Không xác định được SKU.");
    return;
  }

  const confirmDelete = confirm(
    `Bạn có chắc muốn tắt sản phẩm ${id}?`
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await api(
      "/api/products/" + encodeURIComponent(id),
      {
        method: "DELETE"
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
        `Không thể tắt sản phẩm. HTTP ${response.status}`
      );
    }

    alert("✅ Đã tắt sản phẩm.");

    await load();

  } catch (error) {
    console.error("DELETE ERROR:", error);

    showError(
      error.message ||
      "Không thể tắt sản phẩm."
    );
  }
};

/* =========================
   CẬP NHẬT TRẠNG THÁI ĐƠN
========================= */

window.status = async (id, statusValue) => {
  try {
    const response = await api(
      "/api/orders/" +
        encodeURIComponent(id) +
        "/status",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: statusValue
        })
      }
    );

    const data = await readJson(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
        `Không thể cập nhật đơn hàng. HTTP ${response.status}`
      );
    }

    await load();

  } catch (error) {
    console.error("STATUS ERROR:", error);

    showError(
      error.message ||
      "Không thể cập nhật trạng thái đơn."
    );
  }
};

/* =========================
   LƯU SẢN PHẨM / CTKM
========================= */

async function saveProduct(event) {
  event.preventDefault();

  console.log("=== BẮT ĐẦU LƯU SẢN PHẨM ===");

  try {
    if (!key) {
      showError(
        "Chưa có ADMIN_API_KEY. Hãy đăng nhập Admin lại."
      );
      return;
    }

    const form = event.currentTarget;

    if (!form) {
      showError("Không tìm thấy form sản phẩm.");
      return;
    }

    const formData = new FormData(form);

    const d = Object.fromEntries(formData.entries());

    /* Chuẩn hóa dữ liệu */

    d.id = String(d.id || "").trim();
    d.name = String(d.name || "").trim();
    d.description = String(d.description || "").trim();
    d.emoji = String(d.emoji || "").trim();

    d.promoTitle = String(d.promoTitle || "").trim();
    d.promoText = String(d.promoText || "").trim();

    /* Kiểm tra bắt buộc */

    if (!d.id) {
      showError("Vui lòng nhập SKU.");
      return;
    }

    if (!d.name) {
      showError("Vui lòng nhập tên sản phẩm.");
      return;
    }

    if (d.oldPrice === "") {
      showError("Vui lòng nhập giá cũ.");
      return;
    }

    if (d.price === "") {
      showError("Vui lòng nhập giá Flash Sale.");
      return;
    }

    if (d.stock === "") {
      showError("Vui lòng nhập tồn kho.");
      return;
    }

    /* Chuyển số */

    d.oldPrice = Number(d.oldPrice);
    d.price = Number(d.price);
    d.stock = Number(d.stock);

    if (!Number.isFinite(d.oldPrice)) {
      showError("Giá cũ không hợp lệ.");
      return;
    }

    if (!Number.isFinite(d.price)) {
      showError("Giá Flash Sale không hợp lệ.");
      return;
    }

    if (!Number.isFinite(d.stock)) {
      showError("Tồn kho không hợp lệ.");
      return;
    }

    if (d.oldPrice < 0) {
      showError("Giá cũ không được âm.");
      return;
    }

    if (d.price < 0) {
      showError("Giá Flash Sale không được âm.");
      return;
    }

    if (d.stock < 0) {
      showError("Tồn kho không được âm.");
      return;
    }

    /* Tìm sản phẩm đã tồn tại */

    const existing = products.find(
      (p) => String(p.id) === d.id
    );

    let url = "/api/products";
    let method = "POST";

    if (existing) {
      url =
        "/api/products/" +
        encodeURIComponent(d.id);

      method = "PATCH";
    }

    console.log("SAVE URL:", url);
    console.log("SAVE METHOD:", method);
    console.log("SAVE DATA:", d);

    /* Khóa nút tránh bấm nhiều lần */

    const submitButton =
      form.querySelector('button[type="submit"]') ||
      form.querySelector("button");

    const oldButtonText =
      submitButton?.textContent || "";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "ĐANG LƯU...";
    }

    try {
      const response = await api(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(d)
      });

      const data = await readJson(response);

      console.log("SAVE RESPONSE:", response.status, data);

      if (!response.ok) {
        throw new Error(
          data.error ||
          `Server từ chối lưu sản phẩm. HTTP ${response.status}`
        );
      }

      alert(
        existing
          ? "✅ Đã cập nhật sản phẩm / CTKM."
          : "✅ Đã thêm sản phẩm thành công."
      );

      /* Xóa form */

      form.reset();

      /* Tải lại danh sách */

      await load();

      /* Kiểm tra sản phẩm vừa lưu */

      const saved = products.find(
        (p) => String(p.id) === d.id
      );

      if (saved) {
        console.log(
          "ĐÃ TÌM THẤY SẢN PHẨM TRONG DANH SÁCH:",
          saved
        );
      } else {
        console.warn(
          "API lưu thành công nhưng chưa tìm thấy SKU trong danh sách."
        );
      }

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = oldButtonText;
      }
    }

  } catch (error) {
    console.error("SAVE PRODUCT ERROR:", error);

    showError(
      error.message ||
      "Không thể lưu sản phẩm."
    );
  }
}

/* =========================
   KHỞI TẠO
========================= */

function initAdmin() {
  const form = $("#productForm");

  if (!form) {
    console.error(
      "Không tìm thấy #productForm."
    );
    return;
  }

  form.addEventListener(
    "submit",
    saveProduct
  );

  console.log(
    "✅ Admin Flash Sale đã khởi tạo."
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initAdmin
  );
} else {
  initAdmin();
}