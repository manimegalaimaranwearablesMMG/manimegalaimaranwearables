const CONFIG = { storeName: "MAHADEV FASHION HUB", upiId: "yourname@okhdfcbank", whatsappNumber: "919876543210" };
let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let activeCat = "all";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", async () => {
  activeCat = new URLSearchParams(location.search).get("cat") || "all";
  document.getElementById("catPageTitle").innerText = activeCat === "all" ? "All Products" : activeCat;

  try {
    const res = await fetch(`products.json?_t=${Date.now()}`);
    products = await res.json();
  } catch (e) { console.error(e); return; }

  renderProducts();
  setupSidebar();
  setupSearch();
  setupCart();
});

function renderProducts() {
  let list = products;
  if (activeCat !== "all") list = list.filter(p => p.category === activeCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q));
  }
  const c = document.getElementById("productsContainer");
  if (!list.length) { c.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">No products.</p>`; return; }
  c.innerHTML = list.map(p => {
    const thumb = (p.images && p.images[0]) || p.image || "";
    const badge = (p.tags && p.tags[0]) ? p.tags[0].replace("_"," ") : "";
    return `
      <div class="product-card">
        <div class="img-box" onclick="location.href='product.html?id=${p.id}'" style="cursor:pointer;">
          <img src="${thumb}" alt="${p.title}" loading="lazy">
          ${badge ? `<span class="product-badge">${badge}</span>` : ""}
        </div>
        <div class="product-info">
          <div>
            <h4>${p.title}</h4>
            <div class="price-row">
              <span class="current-price">₹${p.price.toLocaleString("en-IN")}</span>
              <span class="mrp-price">₹${(p.originalPrice||p.price).toLocaleString("en-IN")}</span>
            </div>
          </div>
          <button class="btn-add" onclick="addToCart('${p.id}')">Add to Cart</button>
          <button class="btn-wa-card" onclick="orderOnWhatsApp('${p.id}')">📲 Checkout on WhatsApp</button>
        </div>
      </div>`;
  }).join("");
}

function addToCart(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty += 1; else cart.push({ ...p, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

function orderOnWhatsApp(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  const msg = `🛍️ *Product Enquiry*\n---------------------------------\n• ${p.title} - ₹${p.price}\n---------------------------------\nHi, I want to order this.`;
  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
}

function updateCartUI() {
  const el = document.getElementById("cartCount");
  if (el) el.innerText = cart.reduce((s,i) => s + i.qty, 0);
}

function setupSidebar() {
  const s = document.getElementById("sidebar"), b = document.getElementById("sidebarBackdrop"), h = document.getElementById("hamburgerBtn");
  if (!s) return;
  const open = () => { s.classList.add("open"); b.classList.add("open"); };
  const close = () => { s.classList.remove("open"); b.classList.remove("open"); };
  h.addEventListener("click", () => s.classList.contains("open") ? close() : open());
  b.addEventListener("click", close);
}

function setupSearch() {
  const t = document.getElementById("searchToggle"), bar = document.getElementById("searchBar"), inp = document.getElementById("searchInput"), c = document.getElementById("searchClose");
  t.addEventListener("click", () => { bar.classList.toggle("open"); if (bar.classList.contains("open")) inp.focus(); });
  c.addEventListener("click", () => { bar.classList.remove("open"); inp.value = ""; searchQuery = ""; renderProducts(); });
  inp.addEventListener("input", () => { searchQuery = inp.value.trim(); renderProducts(); });
}

function setupCart() {
  document.getElementById("cartOpenBtn")?.addEventListener("click", () => alert("Cart drawer coming soon."));
  document.getElementById("loginBtn")?.addEventListener("click", openLoginModal);
  document.getElementById("sidebarLogin")?.addEventListener("click", e => { e.preventDefault(); openLoginModal(); });
}