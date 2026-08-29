
const API = "/api";

let localOrders = JSON.parse(
  localStorage.getItem("laundryOrders") || "[]"
);

function selectService(service) {
  document.getElementById("service").value = service;
  document.getElementById("orderForm").scrollIntoView({
    behavior: "smooth"
  });
}

function calculateAmount(service, quantity) {
  quantity = Number(quantity);

  if (service === "Wash & Fold") {
    if (quantity < 4) return 269;
    return quantity * 69;
  }

  if (service === "Wash & Iron") {
    if (quantity < 4) return 369;
    return quantity * 95;
  }

  return 0;
}

function generateOrderId() {
  return "LDH" + Date.now().toString().slice(-8);
}

document.getElementById("orderForm").addEventListener(
  "submit",
  async function(e) {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const service = document.getElementById("service").value;
    const quantity = document.getElementById("quantity").value;
    const address = document.getElementById("address").value.trim();

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("10 digit mobile number dalo.");
      return;
    }

    const amount = calculateAmount(service, quantity);

    const delivery = amount >= 300 ? 0 : 50;

    const order = {
      id: generateOrderId(),
      name,
      phone,
      service,
      quantity: Number(quantity),
      address,
      amount,
      delivery,
      total: amount + delivery,
      status: "Received",
      createdAt: new Date().toISOString()
    };

    try {

      const response = await fetch(API + "/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(order)
      });

      if (response.ok) {
        const saved = await response.json();
        localOrders.push(saved.order || order);
      } else {
        throw new Error("API unavailable");
      }

    } catch (error) {

      // Temporary browser fallback
      localOrders.push(order);

      localStorage.setItem(
        "laundryOrders",
        JSON.stringify(localOrders)
      );
    }

    document.getElementById("orderResult").classList.remove("hidden");

    document.getElementById("orderResult").innerHTML = `
      <strong>Order Successfully Placed! 🎉</strong>
      <br><br>
      Order ID: <b>${order.id}</b>
      <br>
      Total: <b>₹${order.total}</b>
      <br>
      Delivery: 2–3 days
      <br><br>
      Is Order ID ko save karke rakho.
    `;

    document.getElementById("orderForm").reset();
  }
);

async function trackOrder() {

  const phone = document.getElementById("trackPhone").value.trim();
  const box = document.getElementById("trackingResult");

  if (!/^[0-9]{10}$/.test(phone)) {
    box.innerHTML = "<p>Valid 10 digit number dalo.</p>";
    return;
  }

  let orders = [];

  try {

    const response = await fetch(
      API + "/orders?phone=" + encodeURIComponent(phone)
    );

    if (response.ok) {
      const data = await response.json();
      orders = data.orders || [];
    } else {
      throw new Error();
    }

  } catch {

    orders = localOrders.filter(
      o => o.phone === phone
    );

  }

  if (!orders.length) {
    box.innerHTML = `
      <div class="result">
        Koi order nahi mila.
      </div>
    `;
    return;
  }

  box.innerHTML = orders
    .reverse()
    .map(order => `
      <div class="result" style="margin-top:10px">
        <b>${order.id}</b><br>
        ${order.service}<br>
        Status: <strong>${order.status}</strong><br>
        Total: ₹${order.total}
      </div>
    `)
    .join("");
}

function showAdmin() {
  document.getElementById("adminPanel")
    .classList.remove("hidden");

  document.getElementById("adminPanel")
    .scrollIntoView({ behavior: "smooth" });
}

function hideAdmin() {
  document.getElementById("adminPanel")
    .classList.add("hidden");
}

function adminLogin() {

  const user = document.getElementById("adminUser").value;
  const pass = document.getElementById("adminPass").value;

  if (user === "Laundry" && pass === "4321") {

    document.getElementById("adminLogin")
      .classList.add("hidden");

    document.getElementById("adminContent")
      .classList.remove("hidden");

    loadAdminOrders();

  } else {

    document.getElementById("loginError").textContent =
      "Username ya password galat hai.";

  }
}

async function loadAdminOrders() {

  let orders = [];

  try {

    const response = await fetch(API + "/orders");

    if (response.ok) {
      const data = await response.json();
      orders = data.orders || [];
    } else {
      throw new Error();
    }

  } catch {

    orders = localOrders;

  }

  document.getElementById("totalOrders").textContent =
    orders.length;

  document.getElementById("readyOrders").textContent =
    orders.filter(o => o.status === "Ready").length;

  const list = document.getElementById("ordersList");

  if (!orders.length) {
    list.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  list.innerHTML = orders
    .slice()
    .reverse()
    .map(order => `
      <div class="order-admin">

        <h3>${order.id}</h3>

        <p>
          <b>${order.name}</b> • ${order.phone}
        </p>

        <p>
          ${order.service} • ${order.quantity}
        </p>

        <p>
          Total: <b>₹${order.total}</b>
        </p>

        <p>
          Address: ${order.address}
        </p>

        <select
          onchange="changeStatus('${order.id}', this.value)"
        >
          ${[
            "Received",
            "Picked Up",
            "Cleaning",
            "Ready",
            "Delivered",
            "Not Ready"
          ].map(status => `
            <option
              ${order.status === status ? "selected" : ""}
            >${status}</option>
          `).join("")}
        </select>

      </div>
    `)
    .join("");
}

async function changeStatus(id, status) {

  try {

    const response = await fetch(
      API + "/orders/" + encodeURIComponent(id),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      }
    );

    if (!response.ok) throw new Error();

  } catch {

    const order = localOrders.find(o => o.id === id);

    if (order) {
      order.status = status;

      localStorage.setItem(
        "laundryOrders",
        JSON.stringify(localOrders)
      );
    }
  }

  loadAdminOrders();
}
