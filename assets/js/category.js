const CONFIG = { storeName: "MAHADEV FASHION HUB", upiId: "yourname@okhdfcbank", whatsappNumber: "919876543210" };

const SAVED_CUSTOMER_KEY = "ma_fashion_customer";
const FREE_SHIPPING_ABOVE = 999;

const SHIPPING_ZONES = [
  { from: 600001, to: 643999, fee:  60, name: "Tamil Nadu" },
  { from: 560001, to: 591999, fee:  80, name: "Karnataka" },
  { from: 670001, to: 695999, fee:  80, name: "Kerala" },
  { from: 500001, to: 539999, fee:  80, name: "Andhra / Telangana" },
  { from: 400001, to: 445999, fee:  90, name: "Maharashtra / Goa" },
  { from: 360001, to: 396999, fee:  90, name: "Gujarat" },
  { from: 110001, to: 122099, fee: 120, name: "Delhi NCR" }
];

function getShippingZone(pincode) {
  const pin = parseInt(pincode, 10);
  if (!pincode || isNaN(pin) || pin < 100000 || pin > 855999) return null;
  return SHIPPING_ZONES.find(z => pin >= z.from && pin <= z.to)
      || { fee: 150, name: "Rest of India" };
}

function loadCustomerDetails() {
  try { return JSON.parse(localStorage.getItem(SAVED_CUSTOMER_KEY) || "null"); } catch(e) { return null; }
}
function saveCustomerDetails(d) {
  try { localStorage.setItem(SAVED_CUSTOMER_KEY, JSON.stringify(d)); } catch(e) {}
}

let products = [];
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let activeCat = "all";
let searchQuery = "";
let activeSubCat = "all";

const DEFAULT_SUBCATS = {
  "Necklaces": ["Choker", "Long", "Pendant", "Set"],
  "Earrings": ["Jhumka", "Studs", "Drops", "Hoops"],
  "Bangles": ["Kada", "Set", "Bracelet"],
  "Rings": ["Adjustable", "Statement"],
  "Sarees": ["Silk", "Cotton", "Designer"],
  "Ornaments": ["Maang Tikka", "Hair Pin"],
  "Accessories": ["Bags", "Clutches", "Belts"]
};

document.addEventListener("DOMContentLoaded", async () => {
  activeCat = new URLSearchParams(location.search).get("cat") || "all";
  document.getElementById("catPageTitle").innerText = activeCat === "all" ? "All Products" : activeCat;

  try {
    const res = await fetch(`products.json?_t=${Date.now()}`);
    products = await res.json();
  } catch (e) { console.error(e); return; }

  renderProducts();
  renderSubcategories();
  setupSidebar();
  setupSearch();
  setupCart();
  setupCartDrawer();
  restoreSavedCustomer();
  updateCartUI();
});

function renderSubcategories() {
  const bar = document.getElementById("subcategoryBar");
  if (!bar) return;
  if (activeCat === "all") { bar.innerHTML = ""; return; }
  
  const subs = DEFAULT_SUBCATS[activeCat] || ["General"];
  bar.innerHTML = `<button class="sub-btn ${activeSubCat === 'all' ? 'active' : ''}" onclick="setSubCat('all')">All</button>` + 
    subs.map(s => `<button class="sub-btn ${activeSubCat === s ? 'active' : ''}" onclick="setSubCat('${s}')">${s}</button>`).join("");
}

function setSubCat(sub) {
  activeSubCat = sub;
  renderSubcategories();
  renderProducts();
}

function renderProducts() {
  let list = products;
  if (activeCat !== "all") list = list.filter(p => p.category === activeCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q));
  }
  
  // Alphabetical sort
  list.sort((a, b) => a.title.localeCompare(b.title));
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
            <div class="category-label">${p.category}</div>
            <div class="price-row">
              <span class="current-price">₹${p.price.toLocaleString("en-IN")}</span>
              <span class="mrp-price">₹${(p.originalPrice||p.price).toLocaleString("en-IN")}</span>
            </div>
          </div>
          <button class="btn-wa-card" onclick="checkoutSingleProduct('${p.id}')">Send Order on WhatsApp</button>
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



function updateCartUI() {
  const el = document.getElementById("cartCount");
  if (el) el.innerText = cart.reduce((s,i) => s + i.qty, 0);

  const list = document.getElementById("cartItemsList");
  if (!list) return;
  if (cart.length === 0) {
    list.innerHTML = `<p class="empty-msg">Your shopping bag is empty.</p>`;
  } else {
    list.innerHTML = cart.map((i, idx) => `
      <div class="cart-item">
        <div><strong>${i.title}</strong><div>₹${i.price} × ${i.qty}</div></div>
        <button onclick="removeFromCart(${idx})" style="background:none;border:none;color:red;cursor:pointer;">✕</button>
      </div>`).join("");
  }
  updateShippingTotals();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

function updateShippingTotals() {
  const subtotalEl = document.getElementById("cartSubtotalDisplay");
  const shippingEl = document.getElementById("cartShippingDisplay");
  const totalEl    = document.getElementById("cartTotalDisplay");
  const pinEl      = document.getElementById("custPincode");
  if (!totalEl) return;

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  let shipping = 0;
  let zoneName = "";

  if (subtotal >= FREE_SHIPPING_ABOVE) {
    shipping = 0;
    zoneName = "Free";
  } else if (pinEl && pinEl.value.trim().length === 6) {
    const zone = getShippingZone(pinEl.value.trim());
    if (zone) { shipping = zone.fee; zoneName = zone.name; }
  }

  const grand = subtotal + shipping;
  if (subtotalEl) subtotalEl.innerText = `₹${subtotal.toLocaleString("en-IN")}`;
  if (shippingEl) shippingEl.innerText = shipping === 0
    ? "Free"
    : `₹${shipping.toLocaleString("en-IN")}${zoneName ? " (" + zoneName + ")" : ""}`;
  totalEl.innerText = `₹${grand.toLocaleString("en-IN")}`;
  return { subtotal, shipping, grand, zoneName };
}

function restoreSavedCustomer() {
  const c = loadCustomerDetails();
  if (!c) return;
  const fields = {
    custName: c.name, custPhone: c.phone,
    custHouse: c.house, custArea: c.area,
    custDistrict: c.district, custState: c.state,
    custPincode: c.pincode
  };
  for (const id in fields) {
    const el = document.getElementById(id);
    if (el && fields[id]) el.value = fields[id];
  }
  const sv = document.getElementById("saveDetails");
  if (sv) sv.checked = true;
}

function openCheckout() {
  document.getElementById("cartOverlay").classList.add("open");
}

function setupCartDrawer() {
  const cartBtn = document.getElementById("cartOpenBtn");
  if (cartBtn) cartBtn.onclick = openCheckout;
  const closeBtn = document.getElementById("cartCloseBtn");
  if (closeBtn) closeBtn.onclick = () => document.getElementById("cartOverlay").classList.remove("open");

  const pinEl = document.getElementById("custPincode");
  if (pinEl) pinEl.addEventListener("input", updateShippingTotals);

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) checkoutBtn.onclick = () => {
    if (cart.length === 0) return alert("Your bag is empty!");

    const name     = document.getElementById("custName").value.trim();
    const phone    = document.getElementById("custPhone").value.trim();
    const house    = (document.getElementById("custHouse")    || {}).value || "";
    const area     = (document.getElementById("custArea")     || {}).value || "";
    const district = (document.getElementById("custDistrict") || {}).value || "";
    const state    = (document.getElementById("custState")    || {}).value || "";
    const pincode  = (document.getElementById("custPincode")  || {}).value || "";
    const save     = (document.getElementById("saveDetails")  || {}).checked;

    if (!name || !phone || !house || !area || !district || !state) {
      return alert("Please fill in all required fields.");
    }
    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
      return alert("Pincode must be 6 digits.");
    }

    const fullAddr = `${house}, ${area}, ${district}, ${state} - ${pincode}`.trim();

    if (save) saveCustomerDetails({ name, phone, house, area, district, state, pincode: pincode.trim() });

    const totals = updateShippingTotals();
    const orderId = "AJ-" + Math.floor(1000 + Math.random() * 9000);

    const order = {
      orderId, name, phone,
      addr: fullAddr,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.grand,
      zone: totals.zoneName,
      items: [...cart]
    };

    triggerWhatsApp(order);
  };
}

function checkoutSingleProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...p, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  const drawer = document.getElementById("cartOverlay");
  if (drawer) drawer.classList.add("open");
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
  const lb = document.getElementById("loginBtn");
  if (lb) lb.addEventListener("click", () => { if (typeof openLoginModal === "function") openLoginModal(); });
  const sl = document.getElementById("sidebarLogin");
  if (sl) sl.addEventListener("click", e => { e.preventDefault(); if (typeof openLoginModal === "function") openLoginModal(); });


}



function triggerWhatsApp(order) {
  const itemList = order.items.map(i => `• ${i.title} (x${i.qty}) - ₹${i.price * i.qty}`).join("\n");
  const shipLine = order.shipping === 0
    ? `🚚 Shipping: Free`
    : `🚚 Shipping: ₹${order.shipping}${order.zone ? " (" + order.zone + ")" : ""}`;
  const msg = `🛍️ *NEW ORDER: #${order.orderId}*\n` +
              `---------------------------------\n${itemList}\n---------------------------------\n` +
              `🧾 Subtotal: ₹${order.subtotal}\n${shipLine}\n` +
              `💰 *Grand Total: ₹${order.total}*\n` +
              `💳 *Payment:* UPI (${CONFIG.upiId})\n\n` +
              `📍 *Delivery:*\nName: ${order.name}\nPhone: ${order.phone}\nAddress: ${order.addr}\n\n` +
              `✅ *Attaching payment screenshot below.*`;
  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  document.getElementById("upiModal").classList.remove("open");
  cart = [];
  localStorage.setItem("cart", "[]");
  updateCartUI();
}