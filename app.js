// === STORE CONFIGURATION (Update with your real details) ===
const CONFIG = {
  storeName: "Mahadev Fashion Hub",
  upiId: "yourname@okhdfcbank", // Your GPay/PhonePe UPI ID
  whatsappNumber: "919876543210" // Format: 91 + 10-digit number without +
};

let products = [];
let cart = [];
let pendingOrder = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
  setupListeners();
});

async function fetchProducts() {
  try {
    // Append timestamp to bypass caching during updates
    const res = await fetch(`products.json?_t=${Date.now()}`);
    products = await res.json();
    renderProducts(products);
  } catch (e) {
    console.error("Could not load products.json", e);
  }
}

function renderProducts(items) {
  const container = document.getElementById("productsContainer");
  container.innerHTML = items.map(p => `
    <div class="product-card">
      <div class="img-box">
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        ${p.tag ? `<span class="product-badge">${p.tag}</span>` : ""}
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
  `).join("");
}

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

function setupListeners() {
  // Cart Drawers
  document.getElementById("cartOpenBtn").onclick = () => document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartCloseBtn").onclick = () => document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("upiCloseBtn").onclick = () => document.getElementById("upiModal").classList.remove("open");

  // Category Filtering
  document.querySelectorAll(".cat-pill").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.cat;
      renderProducts(cat === "all" ? products : products.filter(p => p.category === cat));
    };
  });

  // Checkout Action -> Launches UPI Modal
  document.getElementById("checkoutBtn").onclick = () => {
    if (cart.length === 0) return alert("Your bag is empty!");
    const name = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const addr = document.getElementById("custAddress").value.trim();

    if (!name || !phone || !addr) return alert("Please fill in your name, phone, and address.");

    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const orderId = "AJ-" + Math.floor(1000 + Math.random() * 9000);

    pendingOrder = { orderId, name, phone, addr, total, items: [...cart] };
    openUpiModal(pendingOrder);
  };
}

function openUpiModal(order) {
  // Generate Standard NPCI UPI URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(CONFIG.upiId)}&pn=${encodeURIComponent(CONFIG.storeName)}&am=${order.total}&cu=INR&tn=${encodeURIComponent("Order " + order.orderId)}`;
  
  // Public QR Code API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

  document.getElementById("upiQrImg").src = qrUrl;
  document.getElementById("upiAmountLabel").innerText = `₹${order.total.toLocaleString("en-IN")}`;
  document.getElementById("upiIdLabel").innerText = CONFIG.upiId;
  document.getElementById("directUpiLink").href = upiUri;

  // Copy Button
  document.getElementById("copyUpiBtn").onclick = () => {
    navigator.clipboard.writeText(CONFIG.upiId);
    alert("UPI ID copied!");
  };

  // WhatsApp Trigger
  document.getElementById("proceedWhatsAppBtn").onclick = () => triggerWhatsApp(order);

  document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("upiModal").classList.add("open");
}

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