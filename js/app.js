let allProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  try {
    allProducts = await fetchProducts();
    setupFilters();
    renderProducts();
    initRandomFeature(allProducts);
  } catch (error) {
    console.error(error);
    document.querySelector("#resultText").textContent = "無法讀取資料，請先完成 Supabase 設定。";
    document.querySelector("#productGrid").innerHTML =
      `<div class="empty-state"><h3>尚未連接 Supabase</h3><p>請先設定 js/config.js 並建立資料表。</p></div>`;
  }
});

function setupFilters() {
  const categorySelect = document.querySelector("#categoryFilter");
  uniqueValues(allProducts, "category").forEach(category => {
    categorySelect.insertAdjacentHTML("beforeend",
      `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`);
  });

  const tags = [...new Set(allProducts.flatMap(p => normalizeTags(p.tags)))].sort();
  const tagContainer = document.querySelector("#tagFilters");
  tagContainer.innerHTML = `<button class="chip active" data-tag="">全部</button>` +
    tags.map(tag => `<button class="chip" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("");

  tagContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-tag]");
    if (!button) return;
    tagContainer.querySelectorAll(".chip").forEach(el => el.classList.remove("active"));
    button.classList.add("active");
    renderProducts();
  });

  document.querySelector("#searchInput").addEventListener("input", renderProducts);
  categorySelect.addEventListener("change", renderProducts);
}

function renderProducts() {
  const search = document.querySelector("#searchInput").value;
  const category = document.querySelector("#categoryFilter").value;
  const tag = document.querySelector("#tagFilters .chip.active")?.dataset.tag || "";

  const filtered = allProducts.filter(p => productMatches(p, { search, category, tag }));
  document.querySelector("#productGrid").innerHTML = filtered.map(renderProductCard).join("");
  document.querySelector("#emptyState").classList.toggle("hidden", filtered.length !== 0);
  document.querySelector("#productCount").textContent = allProducts.length;
  document.querySelector("#resultText").textContent = `顯示 ${filtered.length} 項`;
}

if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(console.error); }
