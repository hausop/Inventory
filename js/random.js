function randomSample(items, count) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function renderRandomResults(items) {
  const target = document.querySelector("#randomResults");
  if (!items.length) {
    target.innerHTML = `<div class="empty-state"><h3>目前沒有符合條件的商品</h3><p>可以放寬分類或標籤條件。</p></div>`;
    return;
  }
  target.innerHTML = items.map(renderProductCard).join("");
}

function buildRandomFilters(products) {
  const categories = uniqueValues(products, "category");
  const tags = [...new Set(products.flatMap(p => normalizeTags(p.tags)))].sort();

  const categoryHTML = categories.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  const tagHTML = tags.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");

  document.querySelector("#randomCategory").insertAdjacentHTML("beforeend", categoryHTML);
  document.querySelector("#randomTag").insertAdjacentHTML("beforeend", tagHTML);
}

function runRandom(products) {
  const count = Number(document.querySelector("#randomCount").value);
  const category = document.querySelector("#randomCategory").value;
  const tag = document.querySelector("#randomTag").value;
  const candidates = products.filter(p => productMatches(p, { category, tag }) && Number(p.stock) > 0);
  renderRandomResults(randomSample(candidates, count));
}

function initRandomFeature(products) {
  const dialog = document.querySelector("#randomDialog");
  const open = document.querySelector("#randomButton");
  const reroll = document.querySelector("#rerollButton");

  buildRandomFilters(products);

  open.addEventListener("click", () => {
    dialog.showModal();
    runRandom(products);
  });

  reroll.addEventListener("click", () => runRandom(products));
  dialog.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
}
