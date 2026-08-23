const STORAGE_KEY = "event-kasse-products-v2";
const OLD_STORAGE_KEY = "event-kasse-products-v1";
const PAGE_SIZE = 10;

const defaultProducts = [
  { id: crypto.randomUUID(), name: "Bier", price: 3.5, deposit: 1.0, icon: "🍺" },
  { id: crypto.randomUUID(), name: "Cola", price: 2.5, deposit: 1.0, icon: "🥤" },
  { id: crypto.randomUUID(), name: "Wasser", price: 2.0, deposit: 1.0, icon: "💧" },
  { id: crypto.randomUUID(), name: "Bratwurst", price: 4.0, deposit: 0, icon: "🌭" }
];

let products = loadProducts();
let cart = {};
let returnMode = false;
let currentPage = 0;

const els = {
  productGrid: document.getElementById("productGrid"),
  emptyProducts: document.getElementById("emptyProducts"),
  pageInfo: document.getElementById("pageInfo"),
  productPager: document.getElementById("productPager"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  returnModeBtn: document.getElementById("returnModeBtn"),
  returnModeBanner: document.getElementById("returnModeBanner"),
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
  productIcon: document.getElementById("productIcon"),
  productPrice: document.getElementById("productPrice"),
  productDeposit: document.getElementById("productDeposit"),
  addProductBtn: document.getElementById("addProductBtn")
};

function suggestedIcon(name) {
  const n = name.toLowerCase();
  if (n.includes("bier")) return "🍺";
  if (n.includes("wein")) return "🍷";
  if (n.includes("sekt")) return "🥂";
  if (n.includes("cola") || n.includes("limo") || n.includes("sprite") || n.includes("fanta")) return "🥤";
  if (n.includes("wasser")) return "💧";
  if (n.includes("kaffee")) return "☕";
  if (n.includes("tee")) return "🍵";
  if (n.includes("wurst") || n.includes("hotdog")) return "🌭";
  if (n.includes("burger")) return "🍔";
  if (n.includes("pommes")) return "🍟";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("brezel")) return "🥨";
  if (n.includes("kuchen")) return "🍰";
  if (n.includes("eis")) return "🍦";
  return "🛒";
}

function normalizeProducts(list) {
  return list.map(p => ({
    ...p,
    icon: p.icon || suggestedIcon(p.name || "")
  }));
}

function loadProducts() {
  let saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      try {
        const migrated = normalizeProducts(JSON.parse(old));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      } catch {}
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }

  try {
    return normalizeProducts(JSON.parse(saved));
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

  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  if (currentPage >= pageCount) currentPage = pageCount - 1;

  const start = currentPage * PAGE_SIZE;
  const pageProducts = products.slice(start, start + PAGE_SIZE);

  pageProducts.forEach(product => {
    const btn = document.createElement("button");
    btn.className = "product-btn";

    const returnText = product.deposit > 0
      ? `Pfand ${money(product.deposit)}`
      : "Kein Pfand";

    btn.innerHTML = `
      <span class="product-icon" aria-hidden="true">${escapeHtml(product.icon || suggestedIcon(product.name))}</span>
      <strong>${escapeHtml(product.name)}</strong>
      <span class="product-price">${money(product.price)}</span>
      <span class="product-deposit">${returnText}</span>
    `;

    if (returnMode) {
      btn.classList.add("return-tile");
      if (!product.deposit) btn.classList.add("no-deposit");
    }

    btn.addEventListener("click", () => handleProductTap(product.id));
    els.productGrid.appendChild(btn);
  });

  const hasPages = products.length > PAGE_SIZE;
  els.productPager.classList.toggle("hidden", !hasPages);
  els.pageInfo.textContent = hasPages ? `Seite ${currentPage + 1}/${pageCount}` : "";
  els.prevPageBtn.disabled = currentPage === 0;
  els.nextPageBtn.disabled = currentPage >= pageCount - 1;
}

function handleProductTap(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (returnMode) {
    if (!product.deposit) {
      alert("Für dieses Produkt ist kein Pfand hinterlegt.");
      return;
    }
    addToCart(id, "return");
  } else {
    addToCart(id, "sale");
  }
}

function cartKey(id, type) {
  return `${type}:${id}`;
}

function addToCart(id, type = "sale") {
  const key = cartKey(id, type);
  cart[key] = (cart[key] || 0) + 1;
  renderCart();
}

function changeQty(key, delta) {
  cart[key] = (cart[key] || 0) + delta;
  if (cart[key] <= 0) delete cart[key];
  renderCart();
}

function parseCartKey(key) {
  const idx = key.indexOf(":");
  return {
    type: key.slice(0, idx),
    id: key.slice(idx + 1)
  };
}

function totals() {
  let goods = 0;
  let deposit = 0;

  for (const [key, qty] of Object.entries(cart)) {
    const { type, id } = parseCartKey(key);
    const p = products.find(x => x.id === id);
    if (!p) continue;

    if (type === "return") {
      deposit -= p.deposit * qty;
    } else {
      goods += p.price * qty;
      deposit += p.deposit * qty;
    }
  }

  return { goods, deposit, total: goods + deposit };
}

function renderCart() {
  els.cart.innerHTML = "";
  const entries = Object.entries(cart);
  els.emptyCart.classList.toggle("hidden", entries.length > 0);

  entries.forEach(([key, qty]) => {
    const { type, id } = parseCartKey(key);
    const p = products.find(x => x.id === id);
    if (!p) return;

    const isReturn = type === "return";
    const rowTotal = isReturn ? -(p.deposit * qty) : ((p.price + p.deposit) * qty);

    const row = document.createElement("div");
    row.className = `cart-row${isReturn ? " return-row" : ""}`;

    row.innerHTML = `
      <div>
        <div class="cart-name">
          ${isReturn ? "♻️ " : ""}${escapeHtml(p.name)}
          ${isReturn ? '<span class="return-label">Pfand zurück</span>' : ""}
        </div>
        <div class="cart-sub">
          ${money(rowTotal)}
          ${isReturn
            ? ` · ${money(p.deposit)} Pfand je Stück`
            : ` · ${money(p.price)} + ${money(p.deposit)} Pfand je Stück`}
        </div>
      </div>
      <div class="qty">
        <button aria-label="Menge verringern">−</button>
        <strong>${qty}</strong>
        <button aria-label="Menge erhöhen">+</button>
      </div>
    `;

    const buttons = row.querySelectorAll("button");
    buttons[0].addEventListener("click", () => changeQty(key, -1));
    buttons[1].addEventListener("click", () => changeQty(key, 1));
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

  // If total is negative, the till owes the customer money even without cash being entered.
  if (total < 0) {
    els.changeAmount.textContent = money(Math.abs(total) + given);
    return;
  }

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
      <div class="product-manage-info">
        <span class="manage-icon">${escapeHtml(product.icon || suggestedIcon(product.name))}</span>
        <div>
          <strong>${escapeHtml(product.name)}</strong>
          <small>${money(product.price)} · Pfand ${money(product.deposit)}</small>
        </div>
      </div>
      <button type="button" class="delete-btn">Löschen</button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      Object.keys(cart).forEach(key => {
        if (parseCartKey(key).id === product.id) delete cart[key];
      });
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
  const icon = els.productIcon.value.trim() || suggestedIcon(name);

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
    deposit,
    icon
  });

  saveProducts();
  currentPage = Math.floor((products.length - 1) / PAGE_SIZE);

  els.productName.value = "";
  els.productIcon.value = "";
  els.productPrice.value = "";
  els.productDeposit.value = "";

  renderProducts();
  renderProductList();
}

function finishSale() {
  const total = totals().total;
  const given = Number(els.cashGiven.value || 0);

  if (Object.keys(cart).length === 0) {
    alert("Es ist noch keine Bestellung vorhanden.");
    return;
  }

  if (total > 0 && given < total) {
    alert(`Es fehlen noch ${money(total - given)}.`);
    return;
  }

  const payout = total < 0 ? Math.abs(total) : Math.max(0, given - total);
  const message = total < 0
    ? `Pfandrückgabe abgeschlossen. Auszahlen: ${money(payout)}`
    : `Bezahlt. Rückgeld: ${money(payout)}`;

  alert(message);
  cart = {};
  els.cashGiven.value = "";
  setReturnMode(false);
  renderCart();
}

function setReturnMode(enabled) {
  returnMode = enabled;
  els.returnModeBtn.classList.toggle("active", returnMode);
  els.returnModeBtn.textContent = returnMode ? "✓ Pfand-Modus aktiv" : "♻️ Pfand zurück";
  els.returnModeBanner.classList.toggle("hidden", !returnMode);
  renderProducts();
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

els.returnModeBtn.addEventListener("click", () => {
  setReturnMode(!returnMode);
});

els.prevPageBtn.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    renderProducts();
  }
});

els.nextPageBtn.addEventListener("click", () => {
  const pageCount = Math.ceil(products.length / PAGE_SIZE);
  if (currentPage < pageCount - 1) {
    currentPage++;
    renderProducts();
  }
});

els.clearCartBtn.addEventListener("click", () => {
  cart = {};
  els.cashGiven.value = "";
  setReturnMode(false);
  renderCart();
});

els.finishSaleBtn.addEventListener("click", finishSale);

els.settingsBtn.addEventListener("click", () => {
  renderProductList();
  els.productDialog.showModal();
});

els.productName.addEventListener("input", () => {
  if (!els.productIcon.value.trim()) {
    els.productIcon.placeholder = `z. B. ${suggestedIcon(els.productName.value)}`;
  }
});

els.addProductBtn.addEventListener("click", addProduct);

renderProducts();
renderCart();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  });
}
