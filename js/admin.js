let adminProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;

  document.querySelector("#adminEmail").textContent =
    session.user.email || "";

  document
    .querySelector("#logoutButton")
    .addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.href = "index.html";
    });

  document
    .querySelector("#productImage")
    .addEventListener("change", previewImage);

  document
    .querySelector("#productForm")
    .addEventListener("submit", createProduct);

  document
    .querySelector("#purchaseQuantity")
    .addEventListener("input", updatePurchaseCostPreview);

  document
    .querySelector("#purchaseTotal")
    .addEventListener("input", updatePurchaseCostPreview);

  await loadAdminProducts();
});


async function loadAdminProducts() {
  adminProducts = await fetchProducts();

  document.querySelector("#adminProductCount").textContent =
    `${adminProducts.length} 項商品`;

  document.querySelector("#adminProductList").innerHTML =
    adminProducts
      .map(
        product => `
          <div class="admin-product-item">

            <img
              src="${escapeHtml(productImage(product))}"
              alt=""
            >

            <div>
              <div class="name">
                ${escapeHtml(product.name)}
              </div>

              <div class="small">
                ${escapeHtml(product.category)}
                /
                ${escapeHtml(product.subcategory)}
                · 庫存
                ${Number(product.stock)}
                ${escapeHtml(product.unit)}
              </div>
            </div>

            <button
              class="danger-button"
              type="button"
              data-delete="${product.id}"
            >
              刪除
            </button>

          </div>
        `
      )
      .join("");

  document.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", () => {
      deleteProduct(button.dataset.delete);
    });
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

  preview.innerHTML = `
    <img src="${url}" alt="圖片預覽">
  `;
}


function updatePurchaseCostPreview() {
  const quantity = Number(
    document.querySelector("#purchaseQuantity").value
  );

  const total = Number(
    document.querySelector("#purchaseTotal").value
  );

  const preview = document.querySelector("#purchaseCostPreview");

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(total) ||
    total < 0
  ) {
    preview.textContent = "—";
    return;
  }

  const cost = total / quantity;

  preview.textContent = cost.toFixed(2);
}


async function createProduct(event) {
  event.preventDefault();

  const message = document.querySelector("#formMessage");

  message.textContent = "建立中...";

  try {
    /*
     * 取得目前登入管理員
     */
    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("登入狀態已失效，請重新登入。");
    }


    /*
     * 取得商品基本資料
     */
    const name =
      document.querySelector("#productName").value.trim();

    const category =
      document.querySelector("#productCategory").value.trim();

    const subcategory =
      document.querySelector("#productSubcategory").value.trim();

    const unit =
      document.querySelector("#productUnit").value.trim();


    /*
     * 取得採購資料
     */
    const supplier =
      document.querySelector("#productSupplier").value.trim();

    const purchaseQuantity = Number(
      document.querySelector("#purchaseQuantity").value
    );

    const purchaseTotal = Number(
      document.querySelector("#purchaseTotal").value
    );


    /*
     * 基本驗證
     */
    if (!name) {
      throw new Error("請輸入商品名稱。");
    }

    if (!category) {
      throw new Error("請輸入商品分類。");
    }

    if (!subcategory) {
      throw new Error("請輸入商品細分類。");
    }

    if (!unit) {
      throw new Error("請輸入商品單位。");
    }

    if (!supplier) {
      throw new Error("請輸入廠商。");
    }

    if (
      !Number.isInteger(purchaseQuantity) ||
      purchaseQuantity <= 0
    ) {
      throw new Error("採購數量必須是大於 0 的整數。");
    }

    if (
      !Number.isFinite(purchaseTotal) ||
      purchaseTotal < 0
    ) {
      throw new Error("採購總價格式不正確。");
    }


    /*
     * 自動計算成本
     *
     * 成本 = 採購總價 ÷ 採購數量
     */
    const cost = purchaseTotal / purchaseQuantity;


    /*
     * 上傳商品圖片
     */
    const file =
      document.querySelector("#productImage").files?.[0];

    let imageUrl = null;

    if (file) {
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-");

      const path =
        `${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } =
        await supabaseClient.storage
          .from("product-images")
          .upload(
            path,
            file,
            {
              upsert: false,
              contentType: file.type
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const { data } =
        supabaseClient.storage
          .from("product-images")
          .getPublicUrl(path);

      imageUrl = data.publicUrl;
    }


    /*
     * 商品標籤
     */
    const tags =
      document
        .querySelector("#productTags")
        .value
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
        .map(value =>
          value.startsWith("#")
            ? value
            : `#${value}`
        );


    /*
     * 建立商品
     *
     * 第一次上架的庫存
     * = 第一次採購數量
     */
    const productPayload = {
      name,
      category,
      subcategory,
      unit,
      stock: purchaseQuantity,
      tags,
      image_url: imageUrl,
      is_active: true
    };


    const {
      data: insertedProduct,
      error: productError
    } = await supabaseClient
      .from("products")
      .insert(productPayload)
      .select()
      .single();

    if (productError) {
      throw productError;
    }


    /*
     * 建立第一筆採購歷史
     *
     * 舊資料永遠保留。
     * 未來再次採購時會新增另一筆 purchases。
     */
    const purchasePayload = {
      product_id: insertedProduct.id,
      supplier,
      purchase_quantity: purchaseQuantity,
      purchase_total: purchaseTotal,
      cost
    };


    const {
      error: purchaseError
    } = await supabaseClient
      .from("purchases")
      .insert(purchasePayload);

    if (purchaseError) {
      throw purchaseError;
    }


    /*
     * 建立初始入庫紀錄
     */
    const inventoryLogPayload = {
      product_id: insertedProduct.id,
      type: "IN",
      quantity: purchaseQuantity,
      note: "建立商品時的初始入庫",
      operator_id: user.id,
      creator: user.email || "管理員"
    };


    const {
      error: inventoryLogError
    } = await supabaseClient
      .from("inventory_logs")
      .insert(inventoryLogPayload);

    if (inventoryLogError) {
      throw inventoryLogError;
    }


    /*
     * 完成
     */
    message.textContent =
      `商品新增成功，成本 ${cost.toFixed(2)}。`;

    event.target.reset();

    document.querySelector("#imagePreview").innerHTML =
      "<span>尚未選擇圖片</span>";

    document.querySelector("#purchaseCostPreview").textContent =
      "—";

    await loadAdminProducts();

  } catch (error) {

    console.error(error);

    message.textContent =
      `新增失敗：${error.message}`;
  }
}


async function deleteProduct(id) {

  if (
    !confirm(
      "確定要刪除這個商品嗎？第一版會直接將商品設為停用，不會刪除歷史 Log。"
    )
  ) {
    return;
  }


  const { error } =
    await supabaseClient
      .from("products")
      .update({
        is_active: false
      })
      .eq("id", id);


  if (error) {
    alert(`刪除失敗：${error.message}`);
    return;
  }


  await loadAdminProducts();
}
