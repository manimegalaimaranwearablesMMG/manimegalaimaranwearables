const CONFIG = {
  storeName: "MANIMEGALAI MARAN WEARABLES",
  upiId: "yourname@okhdfcbank",
  whatsappNumber: "919876543210"
};

let products = [];
let currentProduct = null;
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { document.getElementById("pdTitle").innerText = "Product not found"; return; }
  try {
    const res = await fetch(`products.json?_t=${Date.now()}`);
    products = await res.json();
  } catch (e) { document.getElementById("pdTitle").innerText = "Could not load products"; return; }
  currentProduct = products.find(p => p.id === id);
  if (!currentProduct) { document.getElementById("pdTitle").innerText = "Product not found"; return; }
  renderProduct();
  renderAlsoLike();
  updateCartUI();
  setupListeners();
});

function renderProduct() {
  const p = currentProduct;
  const imgs = (p.images && p.images.length) ? p.images : [p.image];
  document.title = p.title + " | Mahadev Fashion Hub";
  document.getElementById("pdHeaderTitle").innerText = p.title;
  document.getElementById("pdTitle").innerText = p.title;
  document.getElementById("pdPrice").innerText = "₹" + p.price.toLocaleString("en-IN");
  document.getElementById("pdMrp").innerText = "₹" + (p.originalPrice || p.price).toLocaleString("en-IN");
  document.getElementById("pdDesc").innerText = p.description || "";
  const tag = (p.tags && p.tags[0]) ? p.tags[0].replace("_"," ") : (p.tag || "");
  const tagEl = document.getElementById("pdTag");
  if (tag) { tagEl.innerText = tag; tagEl.style.display = "inline-block"; }
  const gallery = document.getElementById("pdGallery");
  gallery.innerHTML = imgs.map(u => `<img src="${u}" alt="${p.title}">`).join("");
  const thumbs = document.getElementById("pdThumbs");
  if (imgs.length > 1) {
    thumbs.innerHTML = imgs.map((u,i) => `<button class="pd-thumb${i===0?" active":""}" data-idx="${i}"><img src="${u}"></button>`).join("");
    thumbs.querySelectorAll(".pd-thumb").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.idx);
        gallery.scrollTo({ left: gallery.clientWidth * i, behavior: "smooth" });
      });
    });
  } else { thumbs.innerHTML = ""; }
  gallery.onscroll = () => {
    const i = Math.round(gallery.scrollLeft / gallery.clientWidth);
    thumbs.querySelectorAll(".pd-thumb").forEach((b,idx) => b.classList.toggle("active", idx === i));
  };
}

function renderAlsoLike() {
  const others = products.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id).slice(0, 6);
  if (!others.length) return;
  document.getElementById("pdAlso").style.display = "block";
  document.getElementById("pdAlsoGrid").innerHTML = others.map(p => `
    <a class="pd-also-card" href="product.html?id=${p.id}">
      <img src="${p.image}" alt="${p.title}">
      <div class="pd-also-title">${p.title}</div>
      <div class="pd-also-price">₹${p.price.toLocaleString("en-IN")}</div>
    </a>`).join("");
}

function addToCart(id) {
  const item = products.find(p => p.id === id);
  if (!item) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty += 1; else cart.push({ ...item, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const countEl = document.getElementById("cartCount");
  if (countEl) countEl.innerText = cart.reduce((s,i) => s + i.qty, 0);
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
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const totalEl = document.getElementById("cartTotalDisplay");
  if (totalEl) totalEl.innerText = "₹" + total.toLocaleString("en-IN");
}

function setupListeners() {
  document.getElementById("cartOpenBtn").onclick = () => document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartCloseBtn").onclick = () => document.getElementById("cartOverlay").classList.remove("open");
  document.getElementById("pdAddBtn").onclick = () => { addToCart(currentProduct.id); document.getElementById("cartOverlay").classList.add("open"); };
  document.getElementById("pdWaBtn").onclick = () => {
    const p = currentProduct;
    const msg = `🛍️ *Product Enquiry*\n---------------------------------\n• ${p.title} - ₹${p.price}\n---------------------------------\nHi, I want to order this. Please confirm availability.`;
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  document.getElementById("checkoutBtn").onclick = () => {
    if (cart.length === 0) return alert("Your bag is empty!");
    const name = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const addr = document.getElementById("custAddress").value.trim();
    if (!name || !phone || !addr) return alert("Please fill in your name, phone, and address.");
    const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
    const orderId = "AJ-" + Math.floor(1000 + Math.random() * 9000);
    const itemList = cart.map(i => `• ${i.title} (x${i.qty}) - ₹${i.price * i.qty}`).join("\n");
    const msg = `🛍️ *NEW ORDER: #${orderId}*\n---------------------------------\n${itemList}\n---------------------------------\n💰 *Total:* ₹${total}\n💳 *Payment:* UPI (${CONFIG.upiId})\n\n📍 *Delivery:*\nName: ${name}\nPhone: ${phone}\nAddress: ${addr}\n\n✅ Attaching payment screenshot below.`;
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
    cart = [];
    localStorage.setItem("cart", "[]");
    updateCartUI();
    document.getElementById("cartOverlay").classList.remove("open");
  };
}