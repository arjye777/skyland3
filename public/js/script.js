// ============ GLOBAL VARIABLES ============
let currentUser = null;
let currentBookRoom = "";
let currentBookPrice = 0;

// ============ HELPER FUNCTIONS ============
function showPage(id) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

function toast(msg, type = "ok") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast " + type + " show";
  setTimeout(() => t.classList.remove("show"), 3500);
}

async function api(method, url, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const response = await fetch(url, opts);
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    return { ok: false, msg: "Network error" };
  }
}

// ============ AUTHENTICATION ============
async function doRegister() {
  const name = document.getElementById("r-name").value.trim();
  const email = document.getElementById("r-email").value.trim();
  const password = document.getElementById("r-pass").value;

  if (!name || !email || !password) {
    toast("Please fill all fields", "err");
    return;
  }

  const r = await api("POST", "/api/auth/register", {
    name,
    email,
    password,
  });
  if (r.ok) {
    toast(r.msg);
    showPage("p-login");
    document.getElementById("l-email").value = email;
  } else {
    toast(r.msg, "err");
  }
}

async function doLogin() {
  const email = document.getElementById("l-email").value.trim();
  const password = document.getElementById("l-pass").value;

  const r = await api("POST", "/api/auth/login", { email, password });
  if (r.ok && r.user) {
    currentUser = r.user;
    enterDashboard();
  } else {
    toast(r.msg || "Login failed", "err");
  }
}

async function doLogout() {
  await api("POST", "/api/auth/logout");
  currentUser = null;
  showPage("p-land");
  toast("Logged out successfully");
}

async function enterDashboard() {
  document.getElementById("nav-name").innerHTML = "👤 " + currentUser.name;
  document.getElementById("welcome-msg").innerHTML =
    "Welcome back, " + currentUser.name + "! 👋";
  showPage("p-dash");
  await loadMenu();
  await loadMyBookings();
  await loadMyRequests();
}

// ============ RESTAURANT ============
async function loadMenu() {
  const r = await api("GET", "/api/menu");
  const grid = document.getElementById("menu-items");
  const sel = document.getElementById("o-item");

  if (!r.ok || !r.items || r.items.length === 0) {
    grid.innerHTML =
      '<div class="empty"><div>🍽️</div><p>Menu coming soon!</p></div>';
    return;
  }

  grid.innerHTML = r.items
    .map(
      (m) => `
    <div class="menu-card">
      <div class="menu-icon">${m.icon || "🍽️"}</div>
      <h4>${m.name}</h4>
      <p>${m.description || ""}</p>
      <div class="menu-price">₱${Number(m.price).toLocaleString()}</div>
      <div class="mcat">${m.category || "Main"}</div>
    </div>
  `,
    )
    .join("");

  sel.innerHTML = r.items
    .map(
      (m) =>
        `<option value="${m.name}" data-price="${m.price}">${m.icon || "🍽️"} ${m.name} — ₱${m.price}</option>`,
    )
    .join("");
}

async function placeOrder() {
  if (!currentUser) {
    toast("Please login first", "err");
    showPage("p-login");
    return;
  }

  const item_name = document.getElementById("o-item").value;
  const quantity = parseInt(document.getElementById("o-qty").value);
  const location = document.getElementById("o-loc").value;
  const note = document.getElementById("o-note").value;

  const r = await api("POST", "/api/orders", {
    item_name,
    quantity,
    location,
    note,
  });
  if (r.ok) {
    toast(r.msg);
    document.getElementById("o-qty").value = 1;
    document.getElementById("o-note").value = "";
  } else {
    toast(r.msg || "Order failed", "err");
  }
}

// ============ BOOKINGS ============
function openBook(room, price) {
  if (!currentUser) {
    toast("Please login to book a room", "err");
    showPage("p-login");
    return;
  }

  currentBookRoom = room;
  currentBookPrice = price;
  document.getElementById("bm-room").textContent = room;
  document.getElementById("bm-price").value =
    "₱" + price.toLocaleString() + " / night";

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("bm-ci").min = today;
  document.getElementById("bm-ci").value = today;
  document.getElementById("bm-co").value = "";
  document.getElementById("bm-total").style.display = "none";
  document.getElementById("book-modal").classList.add("open");
}

function closeModal() {
  document.getElementById("book-modal").classList.remove("open");
}

function calcTotal() {
  const ci = document.getElementById("bm-ci").value;
  const co = document.getElementById("bm-co").value;
  const el = document.getElementById("bm-total");

  if (ci && co && new Date(co) > new Date(ci)) {
    const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
    const total = currentBookPrice * nights;
    el.textContent = `💰 Estimated Total: ₱${total.toLocaleString()} (${nights} night${nights > 1 ? "s" : ""})`;
    el.style.display = "block";
  } else {
    el.style.display = "none";
  }
}

document.getElementById("bm-ci")?.addEventListener("change", calcTotal);
document.getElementById("bm-co")?.addEventListener("change", calcTotal);

async function confirmBooking() {
  const checkin = document.getElementById("bm-ci").value;
  const checkout = document.getElementById("bm-co").value;
  const guests = parseInt(document.getElementById("bm-guests").value);
  const special_request = document.getElementById("bm-special").value;

  if (!checkin || !checkout) {
    toast("Please select check-in and check-out dates", "err");
    return;
  }

  const r = await api("POST", "/api/bookings", {
    room: currentBookRoom,
    price_per_night: currentBookPrice,
    checkin,
    checkout,
    guests,
    special_request,
  });

  if (r.ok) {
    closeModal();
    toast(r.msg + " 🎉");
    document.getElementById("bm-special").value = "";
    await loadMyBookings();
    // Switch to My Bookings tab
    const mybkTab = document.querySelectorAll(".tab")[2];
    if (mybkTab) switchTab(mybkTab, "mybk");
  } else {
    toast(r.msg || "Booking failed", "err");
  }
}

async function loadMyBookings() {
  if (!currentUser) return;

  const r = await api("GET", "/api/bookings");
  const el = document.getElementById("my-bookings");

  if (!r.ok || !r.bookings || r.bookings.length === 0) {
    el.innerHTML =
      '<div class="empty"><div>📋</div><p>No bookings yet. Click "Book Now" on any room!</p></div>';
    return;
  }

  el.innerHTML = r.bookings
    .map(
      (b) => `
    <div class="bk-item">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div>
          <h4 style="color:var(--gold);font-size:1.1rem">${b.room}</h4>
          <span class="chip" style="font-size:.72rem">${b.id || b._id}</span>
        </div>
        <span class="sb sb-${b.status === "Confirmed" ? "confirmed" : "pending"}">${b.status || "Pending"}</span>
      </div>
      <div class="bk-grid">
        <div class="bk-field"><label>📅 Check-in</label><p>${b.checkin}</p></div>
        <div class="bk-field"><label>📅 Check-out</label><p>${b.checkout}</p></div>
        <div class="bk-field"><label>👥 Guests</label><p>${b.guests}</p></div>
        <div class="bk-field"><label>💰 Total</label><p style="color:var(--gold);font-weight:700">₱${Number(b.total_price).toLocaleString()}</p></div>
      </div>
      ${b.special_request ? `<p style="margin-top:10px;color:var(--muted);font-size:.85rem;background:var(--darker);padding:8px 12px;border-radius:8px">📝 ${b.special_request}</p>` : ""}
    </div>
  `,
    )
    .join("");
}

// ============ REQUESTS ============
async function submitRequest() {
  if (!currentUser) {
    toast("Please login first", "err");
    showPage("p-login");
    return;
  }

  const type = document.getElementById("req-type").value;
  const detail = document.getElementById("req-detail").value;

  if (!detail.trim()) {
    toast("Please provide request details", "err");
    return;
  }

  const r = await api("POST", "/api/requests", { type, detail });
  if (r.ok) {
    toast(r.msg);
    document.getElementById("req-detail").value = "";
    await loadMyRequests();
  } else {
    toast(r.msg || "Request failed", "err");
  }
}

async function loadMyRequests() {
  if (!currentUser) return;

  const r = await api("GET", "/api/requests");
  const el = document.getElementById("my-reqs");

  if (!r.ok || !r.requests || r.requests.length === 0) {
    el.innerHTML =
      '<div class="empty"><div>📝</div><p>No requests yet. Need something? Submit a request above!</p></div>';
    return;
  }

  el.innerHTML = r.requests
    .map(
      (req) => `
    <div class="req-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h4 style="color:var(--gold)">${req.type}</h4>
        <span class="sb ${req.status === "Resolved" ? "sb-confirmed" : "sb-pending"}">${req.status || "Pending"}</span>
      </div>
      <p style="margin-top:8px;color:var(--muted);font-size:.9rem">${req.detail}</p>
      ${req.admin_note ? `<p style="margin-top:6px;color:var(--accent);font-size:.85rem">💬 Admin: ${req.admin_note}</p>` : ""}
      <p style="margin-top:6px;font-size:.75rem;color:var(--muted)">📅 ${req.created_at}</p>
    </div>
  `,
    )
    .join("");
}

// ============ TAB MANAGEMENT ============
function switchTab(el, tabName) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("tab-" + tabName).classList.add("active");

  if (tabName === "rest") loadMenu();
  if (tabName === "mybk") loadMyBookings();
  if (tabName === "reqs") loadMyRequests();
}

// ============ AI CHATBOT ============
function toggleChat() {
  document.getElementById("chatbot").classList.toggle("open");
}

function addChatMessage(text, type) {
  const container = document.getElementById("chat-msgs");
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg " + type;
  msgDiv.innerHTML = text.replace(/\n/g, "<br>");
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById("chat-in");
  const message = input.value.trim();
  if (!message) return;

  addChatMessage(message, "user");
  input.value = "";

  // Simple AI responses based on keywords
  const msg = message.toLowerCase();
  let response = "";

  if (
    msg.includes("book") &&
    (msg.includes("room") ||
      msg.includes("normal") ||
      msg.includes("suite") ||
      msg.includes("deluxe") ||
      msg.includes("king"))
  ) {
    if (!currentUser) {
      response =
        "🔐 Please login first to book a room! Click 'Sign In' in the top right corner.";
    } else {
      response =
        "✨ I can help you book a room!\n\nWhich room would you like?\n• Normal Room (₱1,500/night)\n• Suite Room (₱3,500/night)\n• Deluxe Room (₱2,800/night)\n• King's Room (₱5,500/night)\n\nClick 'Book Now' on any room in the Book Rooms tab!";
    }
  } else if (msg.includes("available") || msg.includes("any room")) {
    response =
      "🏨 **Available Rooms:**\n\n• Normal Room - ₱1,500/night\n• Suite Room - ₱3,500/night\n• Deluxe Room - ₱2,800/night\n• King's Room - ₱5,500/night\n\nAll rooms come with free WiFi, AC, and 24/7 service! Click 'Book Now' to reserve.";
  } else if (msg.includes("my booking") || msg.includes("my reservation")) {
    if (!currentUser) {
      response = "🔐 Please login to view your bookings!";
    } else {
      response = "📋 Go to the 'My Bookings' tab to see all your reservations!";
    }
  } else if (msg.includes("checkin") || msg.includes("check in")) {
    response =
      "✅ **Check-in:** 2:00 PM\n**Check-out:** 12:00 PM (noon)\n\nEarly check-in and late check-out available upon request!";
  } else if (msg.includes("pool")) {
    response =
      "🏊 **Infinity Pool**\n📍 10th floor\n⏰ Open 6:00 AM - 9:00 PM\nPool towels provided!";
  } else if (msg.includes("wifi")) {
    response =
      "📶 **Free WiFi** throughout the hotel!\nNetwork: 'Skyland_Guest'\nNo password needed!";
  } else if (msg.includes("restaurant") || msg.includes("food")) {
    response =
      "🍽️ **Skyland Restaurant**\n⏰ 6:00 AM - 10:00 PM\n📍 2nd floor\n\nGo to the Restaurant tab to see our menu and place orders!";
  } else if (msg.includes("price") || msg.includes("cost")) {
    response =
      "💰 **Room Rates (per night):**\n• Normal Room: ₱1,500\n• Suite Room: ₱3,500\n• Deluxe Room: ₱2,800\n• King's Room: ₱5,500\n\nTaxes and fees included!";
  } else if (msg.includes("cancel")) {
    response =
      "❌ To cancel a booking, go to the 'My Bookings' tab and contact front desk at +63 2 8000 1234";
  } else if (msg.includes("thank")) {
    response = "You're very welcome! 😊 Enjoy your stay at Skyland Hotel! ✨";
  } else {
    response =
      "🤖 **Skyland Assistant**\n\nI can help you with:\n• 🛏️ Room bookings & prices\n• 🍽️ Restaurant & food orders\n• 📋 View your bookings\n• 🏊 Amenities & facilities\n• ⏰ Check-in/out times\n\nWhat would you like to know?\n\n📞 Call +63 2 8000 1234 for immediate assistance!";
  }

  addChatMessage(response, "bot");
}

// ============ INITIALIZATION ============
window.addEventListener("load", async () => {
  // Check if user is logged in
  const r = await api("GET", "/api/auth/me");
  if (r.ok && r.user) {
    currentUser = r.user;
    enterDashboard();
  }

  // Set min date for booking
  const today = new Date().toISOString().split("T")[0];
  const ciInput = document.getElementById("bm-ci");
  if (ciInput) ciInput.min = today;
});

// Make functions globally available
window.showPage = showPage;
window.switchTab = switchTab;
window.doRegister = doRegister;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.openBook = openBook;
window.closeModal = closeModal;
window.confirmBooking = confirmBooking;
window.placeOrder = placeOrder;
window.submitRequest = submitRequest;
window.toggleChat = toggleChat;
window.sendChat = sendChat;
