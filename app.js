const STORAGE_KEY = "event-kasse-products-v1";

const defaultProducts = [
  { id: crypto.randomUUID(), name: "Bier", price: 3.5, deposit: 1.0 },
  { id: crypto.randomUUID(), name: "Cola", price: 2.5, deposit: 1.0 },
  { id: crypto.randomUUID(), name: "Wasser", price: 2.0, deposit: 1.0 },
  { id: crypto.randomUUID(), name: "Bratwurst", price: 4.0, deposit: 0 }
];

let products = loadProducts();
let cart = {};

const els = {
  productGrid: document.getElementById("productGrid"),
  emptyProducts: document.getElementById("emptyProducts"),
  cart: document.getElementById("cart"),
  emptyCart: document.getElementById("emptyCart"),
  goodsTotal: document.getElementById("goodsTotal"),
  depositTotal: document.getElementById("depositTotal"),
  grandTotal: document.getElementById("grandTotal"),
  cashGiven: document.getElementById("cashGiven"),
  changeAmount: document.getElementById("changeAmount"),
  clearCartBtn: document.getElementById("clearCartBtn"),
  finishSaleBtn: document.getElementById("finishSaleBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  productDialog: document.getElementById("productDialog"),
  productList: document.getElementById("productList"),
  productName: document.getElementById("productName"),
  productPrice: document.getElementById("productPrice"),
  productDeposit: document.getElementById("productDeposit"),
  addProductBtn: document.getElementById("addProductBtn")
};

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }
  try {
    return JSON.parse(saved);
  } catch {
    return defaultProducts;
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function money(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(value || 0);
}

function renderProducts() {
  els.productGrid.innerHTML = "";
  els.emptyProducts.classList.toggle("hidden", products.length > 0);

  products.forEach(product => {
    const btn = document.createElement("button");
    btn.className = "product-btn";
    btn.innerHTML = `
      <strong>${escapeHtml(product.name)}</strong>
      <span>${money(product.price)}${product.deposit ? ` + ${money(product.deposit)} Pfand` : ""}</span>
    `;
    btn.addEventListener("click", () => addToCart(product.id));
    els.productGrid.appendChild(btn);
  });
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

function totals() {
  let goods = 0;
  let deposit = 0;

  for (const [id, qty] of Object.entries(cart)) {
    const p = products.find(x => x.id === id);
    if (!p) continue;
    goods += p.price * qty;
    deposit += p.deposit * qty;
  }

  return { goods, deposit, total: goods + deposit };
}

function renderCart() {
  els.cart.innerHTML = "";
  const entries = Object.entries(cart);
  els.emptyCart.classList.toggle("hidden", entries.length > 0);

  entries.forEach(([id, qty]) => {
    const p = products.find(x => x.id === id);
    if (!p) return;

    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div>
        <div class="cart-name">${escapeHtml(p.name)}</div>
        <div class="cart-sub">${money((p.price + p.deposit) * qty)} · ${money(p.price)} + ${money(p.deposit)} Pfand je Stück</div>
      </div>
      <div class="qty">
        <button aria-label="Menge verringern">−</button>
        <strong>${qty}</strong>
        <button aria-label="Menge erhöhen">+</button>
      </div>
    `;
    const buttons = row.querySelectorAll("button");
    buttons[0].addEventListener("click", () => changeQty(id, -1));
    buttons[1].addEventListener("click", () => changeQty(id, 1));
    els.cart.appendChild(row);
  });

  const t = totals();
  els.goodsTotal.textContent = money(t.goods);
  els.depositTotal.textContent = money(t.deposit);
  els.grandTotal.textContent = money(t.total);
  updateChange();
}

function updateChange() {
  const given = Number(els.cashGiven.value || 0);
  const total = totals().total;
  const change = given - total;

  els.changeAmount.textContent = money(change > 0 ? change : 0);
}

function renderProductList() {
  els.productList.innerHTML = "";

  if (!products.length) {
    els.productList.innerHTML = '<div class="empty">Keine Produkte vorhanden.</div>';
    return;
  }

  products.forEach(product => {
    const item = document.createElement("div");
    item.className = "product-list-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <small>${money(product.price)} · Pfand ${money(product.deposit)}</small>
      </div>
      <button type="button" class="delete-btn">Löschen</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      delete cart[product.id];
      products = products.filter(p => p.id !== product.id);
      saveProducts();
      renderProducts();
      renderProductList();
      renderCart();
    });
    els.productList.appendChild(item);
  });
}

function addProduct() {
  const name = els.productName.value.trim();
  const price = Number(els.productPrice.value);
  const deposit = Number(els.productDeposit.value || 0);

  if (!name) {
    alert("Bitte einen Produktnamen eingeben.");
    return;
  }
  if (!Number.isFinite(price) || price < 0) {
    alert("Bitte einen gültigen Preis eingeben.");
    return;
  }
  if (!Number.isFinite(deposit) || deposit < 0) {
    alert("Bitte einen gültigen Pfandbetrag eingeben.");
    return;
  }

  products.push({
    id: crypto.randomUUID(),
    name,
    price,
    deposit
  });

  saveProducts();
  els.productName.value = "";
  els.productPrice.value = "";
  els.productDeposit.value = "";

  renderProducts();
  renderProductList();
}

function finishSale() {
  const total = totals().total;
  const given = Number(els.cashGiven.value || 0);

  if (total <= 0) {
    alert("Es ist noch keine Bestellung vorhanden.");
    return;
  }

  if (given < total) {
    alert(`Es fehlen noch ${money(total - given)}.`);
    return;
  }

  const change = given - total;
  alert(`Bezahlt. Rückgeld: ${money(change)}`);
  cart = {};
  els.cashGiven.value = "";
  renderCart();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

els.cashGiven.addEventListener("input", updateChange);

document.querySelectorAll("[data-cash]").forEach(btn => {
  btn.addEventListener("click", () => {
    els.cashGiven.value = btn.dataset.cash;
    updateChange();
  });
});

els.clearCartBtn.addEventListener("click", () => {
  cart = {};
  els.cashGiven.value = "";
  renderCart();
});

els.finishSaleBtn.addEventListener("click", finishSale);

els.settingsBtn.addEventListener("click", () => {
  renderProductList();
  els.productDialog.showModal();
});

els.addProductBtn.addEventListener("click", addProduct);

renderProducts();
renderCart();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}
