/* ═══════════════════════════════════════════════════════════════ */
/* [CONFIG] Store settings — EDIT THESE WITH YOUR REAL DETAILS     */
/* ═══════════════════════════════════════════════════════════════ */
const CONFIG = {
  storeName: "MAHADEV FASHION HUB",
  upiId: "yourname@okhdfcbank",       // ← CHANGE: your real UPI ID
  whatsappNumber: "919876543210"      // ← CHANGE: 91 + 10-digit number
};
/* [END CONFIG] */


/* ═══════════════════════════════════════════════════════════════ */
/* [CAROUSEL CONFIG] Slider behavior                               */
/* ═══════════════════════════════════════════════════════════════ */
const CAROUSEL_INTERVAL = 3000;   // ms between slides (3 seconds)
/* [END CAROUSEL CONFIG] */


/* ═══════════════════════════════════════════════════════════════ */
/* [STATE] Global app state                                        */
/* ═══════════════════════════════════════════════════════════════ */
let products = [];
let cart = [];
let pendingOrder = null;

let activeTag = "all";       // current filter chip
let activeCat = "all";       // current category pill

let carouselIndex = 0;
let carouselTimer = null;
let carouselSlides = [];
/* [END STATE] */


/* ═══════════════════════════════════════════════════════════════ */
/* [INIT] Boot the app                                             */
/* ═══════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
  setupListeners();
});
/* [END INIT] */


/* ═══════════════════════════════════════════════════════════════ */
/* [FETCH] Load products.json                                      */
/* ═══════════════════════════════════════════════════════════════ */
async function fetchProducts() {
  try {
    const res = await fetch(`products.json?_t=${Date.now()}`);
    products = await res.json();

    // Backwards compatibility: if a product has old single "tag"
    // but no "tags" array, convert it.
    products.forEach(p => {
      if (!Array.isArray(p.tags)) {
        p.tags = p.tag ? [String(p.tag).toLowerCase().replace(/\s+/g, "_")] : [];
      }
    });

    renderFiltered();
    initCarousel();
  } catch (e) {
    console.error("Could not load products.json", e);
  }
}
/* [END FETCH] */


/* ═══════════════════════════════════════════════════════════════ */
/* [SCRAMBLE] Sort products: bestsellers first, rest random        */
/* -------------------------------------------------------------- */
/* Order rules when nothing is filtered:                           */
/*   1. Products tagged "bestseller" (in original order)           */
/*   2. Products tagged "most_loved"                               */
/*   3. Everything else — shuffled randomly                        */
/* ═══════════════════════════════════════════════════════════════ */
function scrambleProducts(list) {
  const bestsellers = list.filter(p => p.tags.includes("bestseller"));
  const mostLoved   = list.filter(p => p.tags.includes("most_loved") && !p.tags.includes("bestseller"));
  const rest        = list.filter(p =>
    !p.tags.includes("bestseller") && !p.tags.includes("most_loved")
  );

  // Fisher–Yates shuffle on "rest"
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [...bestsellers, ...mostLoved, ...rest];
}
/* [END SCRAMBLE] */


/* ═══════════════════════════════════════════════════════════════ */
/* [FILTER LOGIC] Combine tag chip + category pill                 */
/* ═══════════════════════════════════════════════════════════════ */
function getFilteredProducts() {
  let list = [...products];

  // Category filter
  if (activeCat !== "all") {
    list = list.filter(p => p.category === activeCat);
  }

  // Tag filter
  if (activeTag !== "all") {
    list = list.filter(p => p.tags.includes(activeTag));
  }

  // Sort: only scramble when both filters are "all"
  if (activeTag === "all" && activeCat === "all") {
    list = scrambleProducts(list);
  }

  return list;
}

function renderFiltered() {
  renderProducts(getFilteredProducts());
}
/* [END FILTER LOGIC] */


/* ═══════════════════════════════════════════════════════════════ */
/* [RENDER] Draw product grid                                      */
/* ═══════════════════════════════════════════════════════════════ */
function renderProducts(items) {
  const container = document.getElementById("productsContainer");

  if (items.length === 0) {
    container.innerHTML = `<p style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:40px 0;">No products match this filter.</p>`;
    return;
  }

  container.innerHTML = items.map(p => {
    // Pick the first tag for the badge (prefer bestseller)
    const badge = p.tags.includes("bestseller") ? "Bestseller"
                : p.tags.includes("most_loved") ? "Most Loved"
                : p.tags.includes("trending")   ? "Trending"
                : p.tags.includes("new")        ? "New"
                : p.tags.includes("sale")       ? "Sale"
                : (p.tag || "");

    return `
    <div class="product-card" id="card-${p.id}">
      <div class="img-box">
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        ${badge ? `<span class="product-badge">${badge}</span>` : ""}
      </div>
      <div class="product-info">
        <div>
          <h4>${p.title}</h4>
          <div class="price-row">
            <span class="current-price">₹${p.price.toLocaleString("en-IN")}</span>
            <span class="mrp-price">₹${p.originalPrice.toLocaleString("en-IN")}</span>
          </div>
        </div>
        <button class="btn-add" onclick="addToCart('${p.id}')">Add to Bag</button>
      </div>
    </div>
  `;
  }).join("");
}
/* [END RENDER] */


/* ═══════════════════════════════════════════════════════════════ */
/* [CAROUSEL] Auto-sliding hero with dots                          */
/* -------------------------------------------------------------- */
/* Slide order: one product from each category, round-robin.       */
/* Example with 3 categories and 3 products each:                  */
/*   CatA#1 → CatB#1 → CatC#1 → CatA#2 → CatB#2 → CatC#2 → ...    */
/* ═══════════════════════════════════════════════════════════════ */
function buildCarouselOrder() {
  // Group products by category
  const byCategory = {};
  products.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  });

  const categories = Object.keys(byCategory);
  const maxLen = Math.max(...categories.map(c => byCategory[c].length));
  const ordered = [];

  // Round-robin: pick 1st from each category, then 2nd, then 3rd…
  for (let i = 0; i < maxLen; i++) {
    categories.forEach(cat => {
      if (byCategory[cat][i]) ordered.push(byCategory[cat][i]);
    });
  }

  return ordered;
}

function initCarousel() {
  const track = document.getElementById("carouselTrack");
  const dots  = document.getElementById("carouselDots");
  if (!track || !dots) return;

  carouselSlides = buildCarouselOrder();

  if (carouselSlides.length === 0) {
    track.innerHTML = `<div class="carousel-loading">No products yet</div>`;
    return;
  }

  // Build slides
  track.innerHTML = carouselSlides.map(p => `
    <div class="carousel-slide" data-product-id="${p.id}">
      <img src="${p.image}" alt="${p.title}" loading="eager">
      <div class="carousel-slide-caption">
        <h3>${p.title}</h3>
        <div class="slide-price">₹${p.price.toLocaleString("en-IN")}</div>
      </div>
    </div>
  `).join("");

  // Build dots
  dots.innerHTML = carouselSlides.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? " active" : ""}" data-slide="${i}" aria-label="Slide ${i+1}"></button>`
  ).join("");

  carouselIndex = 0;
  updateCarouselPosition();

  // Slide click → scroll to product card
  track.querySelectorAll(".carousel-slide").forEach(slide => {
    slide.addEventListener("click", () => {
      const id = slide.dataset.productId;
      scrollToProduct(id);
    });
  });

  // Dot click → jump to slide
  dots.querySelectorAll(".carousel-dot").forEach(dot => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      carouselIndex = Number(dot.dataset.slide);
      updateCarouselPosition();
      restartCarouselTimer();
    });
  });

  // Pause on hover / touch
  const carousel = document.getElementById("heroCarousel");
  carousel.addEventListener("mouseenter", stopCarouselTimer);
  carousel.addEventListener("mouseleave", startCarouselTimer);
  carousel.addEventListener("touchstart", stopCarouselTimer, { passive: true });
  carousel.addEventListener("touchend",   startCarouselTimer, { passive: true });

  startCarouselTimer();
}

function updateCarouselPosition() {
  const track = document.getElementById("carouselTrack");
  if (!track) return;
  track.style.transform = `translateX(-${carouselIndex * 100}%)`;

  document.querySelectorAll(".carousel-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === carouselIndex);
  });
}

function startCarouselTimer() {
  stopCarouselTimer();
  if (carouselSlides.length < 2) return;
  carouselTimer = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % carouselSlides.length;
    updateCarouselPosition();
  }, CAROUSEL_INTERVAL);
}

function stopCarouselTimer() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

function restartCarouselTimer() {
  stopCarouselTimer();
  startCarouselTimer();
}

function scrollToProduct(productId) {
  // If the product isn't visible under the current filter, reset filters
  const visible = getFilteredProducts().some(p => p.id === productId);
  if (!visible) {
    activeTag = "all";
    activeCat = "all";
    document.querySelectorAll(".filter-chip").forEach(c =>
      c.classList.toggle("active", c.dataset.tag === "all")
    );
    document.querySelectorAll(".cat-pill").forEach(c =>
      c.classList.toggle("active", c.dataset.cat === "all")
    );
    renderFiltered();
  }

  const card = document.getElementById(`card-${productId}`);
  if (!card) return;

  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.remove("highlight");
  void card.offsetWidth;          // force reflow to restart animation
  card.classList.add("highlight");
  setTimeout(() => card.classList.remove("highlight"), 1900);
}
/* [END CAROUSEL] */


/* ═══════════════════════════════════════════════════════════════ */
/* [CART] Add / remove / update                                    */
/* ═══════════════════════════════════════════════════════════════ */
function addToCart(productId) {
  const item = products.find(p => p.id === productId);
  if (!item) return;

  const inCart = cart.find(c => c.id === productId);
  if (inCart) {
    inCart.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  document.getElementById("cartCount").innerText = cart.reduce((sum, i) => sum + i.qty, 0);

  const cartList = document.getElementById("cartItemsList");
  if (cart.length === 0) {
    cartList.innerHTML = `<p class="empty-msg">Your shopping bag is empty.</p>`;
  } else {
    cartList.innerHTML = cart.map((i, index) => `
      <div class="cart-item">
        <div>
          <strong>${i.title}</strong>
          <div>₹${i.price} × ${i.qty}</div>
        </div>
        <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer;">✕</button>
      </div>
    `).join("");
  }

  const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  document.getElementById("cartTotalDisplay").innerText = `₹${total.toLocaleString("en-IN")}`;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}
/* [END CART] */


/* ═══════════════════════════════════════════════════════════════ */
/* [LISTENERS] Wire up all UI events                               */
/* ═══════════════════════════════════════════════════════════════ */
function setupListeners() {
  // Cart drawers
  document.getElementById("cartOpenBtn").onclick  = () => document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartCloseBtn").onclick = () => document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("upiCloseBtn").onclick  = () => document.getElementById("upiModal").classList.remove("open");

  // Filter chips
  document.querySelectorAll(".filter-chip").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTag = btn.dataset.tag;
      renderFiltered();
    };
  });

  // Category pills
  document.querySelectorAll(".cat-pill").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeCat = btn.dataset.cat;
      renderFiltered();
    };
  });

  // Checkout
  document.getElementById("checkoutBtn").onclick = () => {
    if (cart.length === 0) return alert("Your bag is empty!");
    const name  = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const addr  = document.getElementById("custAddress").value.trim();

    if (!name || !phone || !addr) return alert("Please fill in your name, phone, and address.");

    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const orderId = "AJ-" + Math.floor(1000 + Math.random() * 9000);

    pendingOrder = { orderId, name, phone, addr, total, items: [...cart] };
    openUpiModal(pendingOrder);
  };
}
/* [END LISTENERS] */


/* ═══════════════════════════════════════════════════════════════ */
/* [UPI] Payment modal                                             */
/* ═══════════════════════════════════════════════════════════════ */
function openUpiModal(order) {
  const upiUri = `upi://pay?pa=${encodeURIComponent(CONFIG.upiId)}&pn=${encodeURIComponent(CONFIG.storeName)}&am=${order.total}&cu=INR&tn=${encodeURIComponent("Order " + order.orderId)}`;
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

  document.getElementById("upiQrImg").src            = qrUrl;
  document.getElementById("upiAmountLabel").innerText = `₹${order.total.toLocaleString("en-IN")}`;
  document.getElementById("upiIdLabel").innerText     = CONFIG.upiId;
  document.getElementById("directUpiLink").href       = upiUri;

  document.getElementById("copyUpiBtn").onclick = () => {
    navigator.clipboard.writeText(CONFIG.upiId);
    alert("UPI ID copied!");
  };

  document.getElementById("proceedWhatsAppBtn").onclick = () => triggerWhatsApp(order);

  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("upiModal").classList.add("open");
}
/* [END UPI] */


/* ═══════════════════════════════════════════════════════════════ */
/* [WHATSAPP] Order confirmation                                   */
/* ═══════════════════════════════════════════════════════════════ */
function triggerWhatsApp(order) {
  const itemList = order.items.map(i => `• ${i.title} (x${i.qty}) - ₹${i.price * i.qty}`).join("\n");
  const msg = `🛍️ *NEW ORDER: #${order.orderId}*\n` +
              `---------------------------------\n` +
              `${itemList}\n` +
              `---------------------------------\n` +
              `💰 *Total Amount:* ₹${order.total}\n` +
              `💳 *Payment Method:* UPI (${CONFIG.upiId})\n\n` +
              `📍 *Delivery Details:*\n` +
              `Name: ${order.name}\n` +
              `Phone: ${order.phone}\n` +
              `Address: ${order.addr}\n\n` +
              `✅ *I am attaching my payment screenshot below.*`;

  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  document.getElementById("upiModal").classList.remove("open");
  cart = [];
  updateCartUI();
}
/* [END WHATSAPP] */