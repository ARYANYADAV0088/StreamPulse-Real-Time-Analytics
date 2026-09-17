const API_URL = "http://localhost:3001";

const products = [
  {id:"orbit-pack",name:"Orbit Carry Pack",desc:"Weatherproof everyday backpack",price:129,category:"travel",className:"tall",tone:"travel",badge:"New"},
  {id:"halo-headphones",name:"Halo Headphones",desc:"Wireless studio sound",price:179,category:"tech",className:"round",tone:"tech",badge:"Best seller"},
  {id:"arc-lamp",name:"Arc Desk Lamp",desc:"Warm light, minimal footprint",price:89,category:"desk",className:"tall",tone:"desk"},
  {id:"pulse-mouse",name:"Pulse Mouse",desc:"Quiet precision for long days",price:59,category:"tech",className:"round",tone:"tech"},
  {id:"grid-notebook",name:"Grid Notebook",desc:"120 pages of fountain-pen paper",price:24,category:"desk",className:"flat",tone:"desk"},
  {id:"terra-bottle",name:"Terra Bottle",desc:"Insulated stainless steel",price:34,category:"travel",className:"tall",tone:"travel"},
  {id:"keypad",name:"Keypad Mini",desc:"Compact mechanical keyboard",price:109,category:"desk",className:"flat",tone:"desk",badge:"New"},
  {id:"beam-charger",name:"Beam Charger",desc:"3-device wireless charging dock",price:79,category:"tech",className:"flat",tone:"tech"}
];

let cart = JSON.parse(localStorage.getItem("novaCart") || "[]");
let activeCategory = "all";
let searchTerm = "";

function getUserId() {
  let id = localStorage.getItem("demoUserId");
  if (!id) {
    id = `demo_user_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("demoUserId", id);
  }
  return id;
}

async function sendEvent(eventType, page, metadata = {}) {
  try {
    await fetch(`${API_URL}/events`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({eventType, userId:getUserId(), page, source:"novacart-demo", metadata})
    });
    console.log(`📤 ${eventType} → ${page}`, metadata);
  } catch (error) {
    console.warn("StreamPulse event failed:", error.message);
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const visible = products.filter(p =>
    (activeCategory === "all" || p.category === activeCategory) &&
    `${p.name} ${p.desc}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  grid.innerHTML = visible.length ? visible.map(p => `
    <article class="product-card" data-product="${p.id}">
      <div class="product-image ${p.tone}">
        ${p.badge ? `<span class="tag">${p.badge}</span>` : ""}
        <button class="wishlist" data-wish="${p.id}" aria-label="Save ${p.name}">♡</button>
        <div class="shape ${p.className}"></div>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3><p>${p.desc}</p>
        <div class="product-row"><span class="price">$${p.price}</span><button class="add-button" data-add="${p.id}">Add to bag</button></div>
      </div>
    </article>
  `).join("") : `<div class="empty" style="grid-column:1/-1">No products found. Try another search.</div>`;
}

function saveCart() { localStorage.setItem("novaCart", JSON.stringify(cart)); }

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById("cartCount").textContent = count;
  const items = document.getElementById("cartItems");
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById("cartTotal").textContent = `$${total.toFixed(2)}`;
  items.innerHTML = cart.length ? cart.map(item => `
    <div class="cart-item">
      <div class="mini-art ${item.tone}"></div>
      <div><h4>${item.name}</h4><small>$${item.price}</small></div>
      <div class="qty"><button data-dec="${item.id}">−</button><span>${item.qty}</span><button data-inc="${item.id}">+</button></div>
    </div>
  `).join("") : `<div class="empty">Your bag is empty.<br />Add something you like from the collection.</div>`;
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(p => p.id === id);
  existing ? existing.qty++ : cart.push({...product, qty:1});
  saveCart(); updateCart();
  sendEvent("click", `/product/${id}`, {action:"add_to_cart", productId:id, product:product.name});
  showToast(`${product.name} added to bag`);
}

function openCart() { document.getElementById("cartDrawer").classList.add("open"); document.getElementById("overlay").classList.add("open"); }
function closeOverlays() { document.getElementById("cartDrawer").classList.remove("open"); document.getElementById("accountModal").classList.remove("open"); document.getElementById("overlay").classList.remove("open"); }

// Initial page view: this is the first event StreamPulse sees from this user.
sendEvent("view", "/home", {action:"landing"});
renderProducts();
updateCart();

document.querySelectorAll(".nav-links a, .brand").forEach(link => link.addEventListener("click", () => {
  sendEvent("view", link.dataset.page || "/home", {action:"navigation"});
}));

document.querySelectorAll("[data-scroll]").forEach(button => button.addEventListener("click", () => {
  const target = document.getElementById(button.dataset.scroll);
  sendEvent(button.dataset.track || "click", button.dataset.page || `/${button.dataset.scroll}`, {action:"cta"});
  target?.scrollIntoView({behavior:"smooth"});
}));

document.getElementById("filters").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
  sendEvent("view", `/shop/${activeCategory}`, {action:"filter", category:activeCategory});
});

document.getElementById("productGrid").addEventListener("click", event => {
  const add = event.target.closest("[data-add]");
  const wish = event.target.closest("[data-wish]");
  const card = event.target.closest("[data-product]");
  if (add) { addToCart(add.dataset.add); return; }
  if (wish) { sendEvent("click", `/product/${wish.dataset.wish}`, {action:"wishlist", productId:wish.dataset.wish}); showToast("Saved to your wishlist"); wish.textContent="♥"; return; }
  if (card) { sendEvent("view", `/product/${card.dataset.product}`, {action:"product_view", productId:card.dataset.product}); }
});

document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  searchTerm = document.getElementById("searchInput").value.trim();
  renderProducts();
  document.getElementById("shop").scrollIntoView({behavior:"smooth"});
  sendEvent("click", "/search", {action:"search", query:searchTerm || ""});
});

document.getElementById("cartButton").addEventListener("click", () => { sendEvent("view", "/cart", {action:"open_cart"}); openCart(); });
document.getElementById("closeCart").addEventListener("click", closeOverlays);
document.getElementById("overlay").addEventListener("click", closeOverlays);
document.getElementById("accountButton").addEventListener("click", () => { sendEvent("view", "/account", {action:"open_account"}); document.getElementById("accountModal").classList.add("open"); document.getElementById("overlay").classList.add("open"); });
document.getElementById("closeAccount").addEventListener("click", closeOverlays);

document.getElementById("cartItems").addEventListener("click", event => {
  const inc = event.target.closest("[data-inc]");
  const dec = event.target.closest("[data-dec]");
  const id = inc?.dataset.inc || dec?.dataset.dec;
  if (!id) return;
  const item = cart.find(p => p.id === id);
  if (!item) return;
  if (inc) item.qty++;
  if (dec) item.qty--;
  cart = cart.filter(p => p.qty > 0);
  saveCart(); updateCart();
  sendEvent("click", "/cart", {action:inc ? "increase_quantity" : "decrease_quantity", productId:id});
});

document.getElementById("checkoutButton").addEventListener("click", () => {
  if (!cart.length) { showToast("Your bag is empty"); return; }
  sendEvent("click", "/checkout", {action:"checkout_start", items:cart.reduce((n,p)=>n+p.qty,0)});
  cart = []; saveCart(); updateCart(); closeOverlays(); showToast("Demo checkout complete — no payment processed");
});

document.getElementById("signupForm").addEventListener("submit", event => {
  event.preventDefault();
  sendEvent("signup", "/signup", {action:"account_created"});
  closeOverlays(); showToast("Welcome to NovaCart — signup event sent");
});

document.getElementById("newsletterForm").addEventListener("submit", event => {
  event.preventDefault();
  sendEvent("signup", "/newsletter", {action:"newsletter_signup"});
  event.target.reset(); showToast("You're on the list");
});
