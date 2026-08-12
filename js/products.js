async function fetchProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}


function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map(tag => String(tag).trim())
    .filter(Boolean);
}


function uniqueValues(items, key) {
  return [
    ...new Set(
      items
        .map(item => item[key])
        .filter(Boolean)
    )
  ].sort();
}


function productMatches(
  product,
  {
    search = "",
    category = "",
    tag = ""
  } = {}
) {
  const q = search.trim().toLowerCase();

  const text = [
    product.name,
    product.category,
    product.subcategory,
    ...normalizeTags(product.tags)
  ]
    .join(" ")
    .toLowerCase();

  const searchOK =
    !q ||
    text.includes(q);

  const categoryOK =
    !category ||
    product.category === category;

  const tagOK =
    !tag ||
    normalizeTags(product.tags).includes(tag);

  return searchOK && categoryOK && tagOK;
}


function productImage(product) {
  return (
    product.image_url ||
    "assets/product-placeholder.svg"
  );
}


/*
 * 商品卡片
 *
 * 點擊後進入：
 *
 * product.html?id=商品 UUID
 *
 * 之後商品詳細頁會透過這個 id
 * 讀取 products / purchases / inventory_logs。
 */
function renderProductCard(product) {
  const tags = normalizeTags(product.tags);

  return `
    <a
      class="product-card"
      href="product.html?id=${encodeURIComponent(product.id)}"
      aria-label="查看 ${escapeHtml(product.name)} 詳細資料"
    >

      <div class="product-image">
        <img
          src="${escapeHtml(productImage(product))}"
          alt="${escapeHtml(product.name)}"
          loading="lazy"
        >
      </div>

      <div class="product-info">

        <div class="product-name">
          ${escapeHtml(product.name)}
        </div>

        <div class="product-meta">

          <span>
            ${escapeHtml(product.category)}
            /
            ${escapeHtml(product.subcategory)}
          </span>

          <span class="stock">
            ${Number(product.stock)}
            ${escapeHtml(product.unit)}
          </span>

        </div>

        <div class="product-tags">
          ${
            tags
              .map(
                tag =>
                  `<span class="tag">${escapeHtml(tag)}</span>`
              )
              .join("")
          }
        </div>

      </div>

    </a>
  `;
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
