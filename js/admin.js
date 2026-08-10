let adminProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;

  document.querySelector("#adminEmail").textContent = session.user.email;
  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.href = "index.html";
  });

  document.querySelector("#productImage").addEventListener("change", previewImage);
  document.querySelector("#productForm").addEventListener("submit", createProduct);

  await loadAdminProducts();
});

async function loadAdminProducts() {
  adminProducts = await fetchProducts();
  document.querySelector("#adminProductCount").textContent = `${adminProducts.length} 項商品`;
  document.querySelector("#adminProductList").innerHTML = adminProducts.map(product => `
    <div class="admin-product-item">
      <img src="${escapeHtml(productImage(product))}" alt="">
      <div>
        <div class="name">${escapeHtml(product.name)}</div>
        <div class="small">${escapeHtml(product.category)} / ${escapeHtml(product.subcategory)} · 庫存 ${Number(product.stock)} ${escapeHtml(product.unit)}</div>
      </div>
      <button class="danger-button" type="button" data-delete="${product.id}">刪除</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => deleteProduct(button.dataset.delete));
  });
}

function previewImage(event) {
  const file = event.target.files?.[0];
  const preview = document.querySelector("#imagePreview");
  if (!file) {
    preview.innerHTML = "<span>尚未選擇圖片</span>";
    return;
  }
  const url = URL.createObjectURL(file);
  preview.innerHTML = `<img src="${url}" alt="圖片預覽">`;
}

async function createProduct(event) {
  event.preventDefault();
  const message = document.querySelector("#formMessage");
  message.textContent = "建立中...";

  try {
    const file = document.querySelector("#productImage").files?.[0];
    let imageUrl = null;

    if (file) {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
      const path = `${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("product-images")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabaseClient.storage.from("product-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    const tags = document.querySelector("#productTags").value
      .split(",")
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v.startsWith("#") ? v : `#${v}`);

    const payload = {
      name: document.querySelector("#productName").value.trim(),
      category: document.querySelector("#productCategory").value.trim(),
      subcategory: document.querySelector("#productSubcategory").value.trim(),
      unit: document.querySelector("#productUnit").value.trim(),
      stock: Number(document.querySelector("#productStock").value),
      tags,
      image_url: imageUrl,
      is_active: true
    };

    const { data: inserted, error } = await supabaseClient
      .from("products")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    if (inserted.stock > 0) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      await supabaseClient.from("inventory_logs").insert({
        product_id: inserted.id,
        type: "IN",
        quantity: inserted.stock,
        note: "建立商品時的初始庫存",
        operator_id: user?.id ?? null
      });
    }

    message.textContent = "商品新增成功。";
    event.target.reset();
    document.querySelector("#imagePreview").innerHTML = "<span>尚未選擇圖片</span>";
    await loadAdminProducts();
  } catch (error) {
    console.error(error);
    message.textContent = `新增失敗：${error.message}`;
  }
}

async function deleteProduct(id) {
  if (!confirm("確定要刪除這個商品嗎？第一版會直接將商品設為停用，不會刪除歷史 Log。")) return;

  const { error } = await supabaseClient
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    alert(`刪除失敗：${error.message}`);
    return;
  }

  await loadAdminProducts();
}
