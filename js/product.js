let currentProduct = null;
let currentPurchases = [];
let currentInventoryLogs = [];

document.addEventListener("DOMContentLoaded", async () => {
  setupEditProductEvents();
  await loadProductDetail();
});


/*
 * 取得網址中的商品 ID
 *
 * 例如：
 * product.html?id=09dbd634-b82c-4a2c-b6f0-c3b58341de47
 */
function getProductId() {
  const params = new URLSearchParams(
    window.location.search
  );

  return params.get("id");
}


/*
 * 載入商品詳細資料
 */
async function loadProductDetail() {

  const productId = getProductId();

  if (!productId) {
    showProductError("網址中沒有商品 ID。");
    return;
  }

  try {

    /*
     * 讀取商品
     */
    const {
      data: product,
      error: productError
    } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();


    if (productError) {
      throw productError;
    }


    if (!product) {
      throw new Error("找不到這個商品。");
    }


    currentProduct = product;


    /*
     * 同時讀取：
     *
     * 1. 採購歷史
     * 2. 庫存異動歷史
     */
    const [
      purchasesResult,
      inventoryLogsResult
    ] = await Promise.all([

      supabaseClient
        .from("purchases")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", {
          ascending: false
        }),

      supabaseClient
        .from("inventory_logs")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", {
          ascending: false
        })

    ]);


    if (purchasesResult.error) {
      throw purchasesResult.error;
    }


    if (inventoryLogsResult.error) {
      throw inventoryLogsResult.error;
    }


    currentPurchases =
      purchasesResult.data ?? [];


    currentInventoryLogs =
      inventoryLogsResult.data ?? [];


    /*
     * 顯示資料
     */
    renderProductDetail(product);

    renderPurchases(currentPurchases);

    renderInventoryLogs(currentInventoryLogs);


    /*
     * 顯示內容
     */
    document
      .querySelector("#productLoading")
      .classList.add("hidden");

    document
      .querySelector("#productContent")
      .classList.remove("hidden");

  } catch (error) {

    console.error(
      "載入商品詳細資料失敗：",
      error
    );

    showProductError(
      error.message ||
      "無法載入商品資料。"
    );

  }

}


/*
 * 顯示商品基本資料
 */
function renderProductDetail(product) {

  const image =
    productImage(product);


  document
    .querySelector("#productImage")
    .src = image;


  document
    .querySelector("#productImage")
    .alt =
      product.name || "商品圖片";


  document
    .querySelector("#productName")
    .textContent =
      product.name || "未命名商品";


  document
    .querySelector("#productCategory")
    .textContent =
      product.category || "未分類";


  document
    .querySelector("#productSubcategory")
    .textContent =
      product.subcategory || "無細分類";


  document
    .querySelector("#productStock")
    .textContent =
      Number(product.stock);


  document
    .querySelector("#productUnit")
    .textContent =
      product.unit || "";


  const tags =
    normalizeTags(product.tags);


  document
    .querySelector("#productTags")
    .innerHTML =
      tags
        .map(
          tag =>
            `<span class="tag">${escapeHtml(tag)}</span>`
        )
        .join("");


  /*
   * 更新瀏覽器標題
   */
  document.title =
    `${product.name || "商品詳細"}｜倉管系統`;
}


/*
 * 顯示採購紀錄
 */
function renderPurchases(purchases) {

  const count =
    document.querySelector("#purchaseCount");

  const list =
    document.querySelector("#purchaseList");


  count.textContent =
    `${purchases.length} 筆紀錄`;


  if (!purchases.length) {

    list.innerHTML = `
      <div class="empty-state">
        <p>目前沒有採購紀錄。</p>
      </div>
    `;

    return;
  }


  list.innerHTML =
    purchases
      .map(purchase => {

        const quantity =
          Number(
            purchase.purchase_quantity
          );


        const total =
          Number(
            purchase.purchase_total
          );


        const cost =
          Number(
            purchase.cost
          );


        return `
          <article class="record-item">

            <div class="record-main">

              <div class="record-title">
                ${escapeHtml(
                  purchase.supplier ||
                  "未記錄廠商"
                )}
              </div>

              <div class="record-meta">

                <span>
                  採購 ${quantity}
                  ${escapeHtml(
                    currentProduct?.unit || ""
                  )}
                </span>

                <span>
                  ${formatDateTime(
                    purchase.created_at
                  )}
                </span>

              </div>

            </div>


            <div class="record-values">

              <div>

                <span class="muted">
                  採購總價
                </span>

                <strong>
                  ${formatMoney(total)}
                </strong>

              </div>


              <div>

                <span class="muted">
                  單位成本
                </span>

                <strong>
                  ${formatMoney(cost)}
                </strong>

              </div>

            </div>

          </article>
        `;

      })
      .join("");
}


/*
 * 顯示庫存異動紀錄
 */
function renderInventoryLogs(logs) {

  const count =
    document.querySelector(
      "#inventoryLogCount"
    );


  const list =
    document.querySelector(
      "#inventoryLogList"
    );


  count.textContent =
    `${logs.length} 筆紀錄`;


  if (!logs.length) {

    list.innerHTML = `
      <div class="empty-state">
        <p>目前沒有庫存異動紀錄。</p>
      </div>
    `;

    return;
  }


  list.innerHTML =
    logs
      .map(log => {

        const isIn =
          log.type === "IN";


        const quantity =
          Number(log.quantity);


        const sign =
          isIn ? "+" : "-";


        const typeText =
          isIn ? "入庫" : "出庫";


        const operator =
          log.creator ||
          "管理員";


        return `
          <article class="record-item">

            <div class="record-main">

              <div class="record-title">

                <span
                  class="record-type ${
                    isIn
                      ? "record-in"
                      : "record-out"
                  }"
                >
                  ${typeText}
                </span>

                <strong>
                  ${sign}${quantity}
                  ${escapeHtml(
                    currentProduct?.unit || ""
                  )}
                </strong>

              </div>


              <div class="record-meta">

                <span>
                  ${escapeHtml(
                    log.note ||
                    "無備註"
                  )}
                </span>

                <span>
                  ${formatDateTime(
                    log.created_at
                  )}
                </span>

              </div>

            </div>


            <div class="record-operator">

              <span class="muted">
                操作人員
              </span>

              <strong>
                ${escapeHtml(operator)}
              </strong>

            </div>

          </article>
        `;

      })
      .join("");
}


/*
 * ==========================================
 * 修改商品
 * ==========================================
 */


/*
 * 綁定修改商品相關事件
 */
function setupEditProductEvents() {

  const editButton =
    document.querySelector(
      "#editProductButton"
    );


  const dialog =
    document.querySelector(
      "#editProductDialog"
    );


  const closeButton =
    document.querySelector(
      "#closeEditProductButton"
    );


  const cancelButton =
    document.querySelector(
      "#cancelEditProductButton"
    );


  const form =
    document.querySelector(
      "#editProductForm"
    );


  if (
    !editButton ||
    !dialog ||
    !closeButton ||
    !cancelButton ||
    !form
  ) {
    return;
  }


  /*
   * 開啟修改視窗
   */
  editButton.addEventListener(
    "click",
    () => {

      if (!currentProduct) {
        return;
      }


      fillEditProductForm();


      clearEditProductError();


      dialog.showModal();
    }
  );


  /*
   * 關閉
   */
  closeButton.addEventListener(
    "click",
    () => {
      dialog.close();
    }
  );


  cancelButton.addEventListener(
    "click",
    () => {
      dialog.close();
    }
  );


  /*
   * 點擊 dialog 外部關閉
   */
  dialog.addEventListener(
    "click",
    event => {

      if (
        event.target === dialog
      ) {
        dialog.close();
      }

    }
  );


  /*
   * 儲存
   */
  form.addEventListener(
    "submit",
    handleEditProductSubmit
  );
}


/*
 * 將目前商品資料填入表單
 */
function fillEditProductForm() {

  if (!currentProduct) {
    return;
  }


  document
    .querySelector("#editProductName")
    .value =
      currentProduct.name || "";


  document
    .querySelector("#editProductCategory")
    .value =
      currentProduct.category || "";


  document
    .querySelector("#editProductSubcategory")
    .value =
      currentProduct.subcategory || "";


  document
    .querySelector("#editProductUnit")
    .value =
      currentProduct.unit || "";


  document
    .querySelector("#editProductTags")
    .value =
      normalizeTags(
        currentProduct.tags
      ).join(", ");


  document
    .querySelector("#editProductImageUrl")
    .value =
      currentProduct.image_url || "";
}


/*
 * 儲存商品修改
 */
async function handleEditProductSubmit(event) {

  event.preventDefault();


  if (!currentProduct) {
    return;
  }


  const saveButton =
    document.querySelector(
      "#saveEditProductButton"
    );


  clearEditProductError();


  const name =
    document
      .querySelector("#editProductName")
      .value
      .trim();


  const category =
    document
      .querySelector("#editProductCategory")
      .value
      .trim();


  const subcategory =
    document
      .querySelector("#editProductSubcategory")
      .value
      .trim();


  const unit =
    document
      .querySelector("#editProductUnit")
      .value
      .trim();


  const tagsText =
    document
      .querySelector("#editProductTags")
      .value
      .trim();


  const imageUrl =
    document
      .querySelector("#editProductImageUrl")
      .value
      .trim();


  /*
   * 基本驗證
   */
  if (!name) {
    showEditProductError(
      "請輸入商品名稱。"
    );
    return;
  }


  if (!category) {
    showEditProductError(
      "請輸入商品分類。"
    );
    return;
  }


  if (!subcategory) {
    showEditProductError(
      "請輸入商品細分類。"
    );
    return;
  }


  if (!unit) {
    showEditProductError(
      "請輸入商品單位。"
    );
    return;
  }


  /*
   * 標籤轉成 PostgreSQL text[]
   */
  const tags =
    tagsText
      ? tagsText
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean)
      : [];


  /*
   * 防止重複送出
   */
  saveButton.disabled = true;
  saveButton.textContent = "儲存中...";


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("products")
      .update({
        name,
        category,
        subcategory,
        unit,
        tags,
        image_url:
          imageUrl || null,
        updated_at:
          new Date().toISOString()
      })
      .eq("id", currentProduct.id)
      .select("*")
      .single();


    if (error) {
      throw error;
    }


    if (!data) {
      throw new Error(
        "商品更新失敗。"
      );
    }


    /*
     * 更新目前商品
     */
    currentProduct = data;


    /*
     * 重新顯示商品
     */
    renderProductDetail(
      currentProduct
    );


    /*
     * 關閉視窗
     */
    document
      .querySelector(
        "#editProductDialog"
      )
      .close();


    /*
     * 提示成功
     */
    alert("商品資料已更新。");


  } catch (error) {

    console.error(
      "修改商品失敗：",
      error
    );


    showEditProductError(
      error.message ||
      "商品修改失敗，請稍後再試。"
    );

  } finally {

    saveButton.disabled = false;
    saveButton.textContent = "儲存修改";

  }

}


/*
 * 顯示修改錯誤
 */
function showEditProductError(
  message
) {

  const errorBox =
    document.querySelector(
      "#editProductError"
    );


  errorBox.textContent =
    message;


  errorBox.classList.remove(
    "hidden"
  );
}


/*
 * 清除修改錯誤
 */
function clearEditProductError() {

  const errorBox =
    document.querySelector(
      "#editProductError"
    );


  if (!errorBox) {
    return;
  }


  errorBox.textContent = "";


  errorBox.classList.add(
    "hidden"
  );
}


/*
 * 商品圖片
 */
function productImage(product) {

  return (
    product.image_url ||
    "assets/product-placeholder.svg"
  );

}


/*
 * 標籤整理
 */
function normalizeTags(tags) {

  if (!Array.isArray(tags)) {
    return [];
  }


  return tags
    .map(tag => String(tag).trim())
    .filter(Boolean);
}


/*
 * 日期時間格式
 *
 * 強制使用台灣時區。
 */
function formatDateTime(value) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }


  return new Intl.DateTimeFormat(
    "zh-TW",
    {
      timeZone: "Asia/Taipei",

      year: "numeric",
      month: "2-digit",
      day: "2-digit",

      hour: "2-digit",
      minute: "2-digit",

      hour12: false
    }
  ).format(date);

}


/*
 * 金額格式
 */
function formatMoney(value) {

  if (
    !Number.isFinite(value)
  ) {
    return "—";
  }


  return new Intl.NumberFormat(
    "zh-TW",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(value);

}


/*
 * 顯示商品錯誤
 */
function showProductError(message) {

  document
    .querySelector(
      "#productLoading"
    )
    .classList.add("hidden");


  document
    .querySelector(
      "#productContent"
    )
    .classList.add("hidden");


  document
    .querySelector(
      "#productError"
    )
    .classList.remove("hidden");


  document
    .querySelector(
      "#productErrorMessage"
    )
    .textContent =
      message;

}


/*
 * HTML 安全處理
 */
function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}
