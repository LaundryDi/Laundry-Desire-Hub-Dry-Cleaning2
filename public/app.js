const API = "/api";

let localOrders = JSON.parse(
  localStorage.getItem("laundryOrders") || "[]"
);

/* =========================
   HELPERS
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function showResult(message, error = false) {
  const box = document.getElementById("orderResult");

  if (!box) return;

  box.classList.remove("hidden");
  box.innerHTML = message;

  if (error) {
    box.style.background = "#fff1f1";
    box.style.color = "#b42318";
    box.style.borderColor = "#ffd5d5";
  } else {
    box.style.background = "#eef8f0";
    box.style.color = "#17651d";
    box.style.borderColor = "#d6ecd9";
  }
}

/* =========================
   SERVICE SELECT
========================= */

function selectService(service) {
  const select = document.getElementById("service");
  const form = document.getElementById("orderForm");

  if (select) {
    select.value = service;
  }

  if (form) {
    form.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

/* =========================
   PLACE ORDER
========================= */

const orderForm = document.getElementById("orderForm");

if (orderForm) {
  orderForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name =
      document.getElementById("name").value.trim();

    const phone =
      document.getElementById("phone").value
        .replace(/\D/g, "");

    const service =
      document.getElementById("service").value;

    const quantity =
      Number(document.getElementById("quantity").value);

    const address =
      document.getElementById("address").value.trim();

    if (!name) {
      showResult("Please enter your name.", true);
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      showResult(
        "Please enter a valid 10-digit mobile number.",
        true
      );
      return;
    }

    if (!service) {
      showResult("Please select a service.", true);
      return;
    }

    if (!quantity || quantity <= 0) {
      showResult(
        "Please enter quantity / weight.",
        true
      );
      return;
    }

    if (!address) {
      showResult(
        "Please enter your pickup address.",
        true
      );
      return;
    }

    const button =
      document.querySelector(
        "#orderForm .place-order-btn"
      );

    button.disabled = true;
    button.innerHTML = "Placing Order...";

    try {

      const response = await fetch(
        API + "/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            customerName: name,
            mobile: phone,
            address: address,
            service: service,
            kg: quantity,
            pickupDate: ""
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to place order."
        );
      }

      showResult(`
        <strong>Order Successfully Placed! 🎉</strong>
        <br><br>
        Order ID:
        <b>${escapeHtml(data.id)}</b>
        <br>
        Service:
        ${escapeHtml(data.service)}
        <br>
        Total:
        <b>₹${escapeHtml(String(data.total))}</b>
        <br>
        Delivery:
        2–3 days
        <br><br>
        <strong>
          Is Order ID ko save karke rakho.
        </strong>
      `);

      orderForm.reset();

    } catch (error) {

      showResult(
        escapeHtml(
          error.message ||
          "Something went wrong."
        ),
        true
      );

    } finally {

      button.disabled = false;

      button.innerHTML = `
        Place Order
        <span>→</span>
      `;
    }
  });
}

/* =========================
   TRACK ORDER
========================= */

async function trackOrder() {

  const phone =
    document.getElementById("trackPhone")
      .value
      .replace(/\D/g, "");

  const box =
    document.getElementById("trackingResult");

  if (!/^[0-9]{10}$/.test(phone)) {

    box.innerHTML = `
      <div class="result">
        Please enter a valid 10-digit mobile number.
      </div>
    `;

    return;
  }

  box.innerHTML = `
    <div class="result">
      Checking your orders...
    </div>
  `;

  try {

    const response = await fetch(
      API + "/customer/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mobile: phone
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to find orders."
      );
    }

    if (!data.length) {

      box.innerHTML = `
        <div class="result">
          No order found for this mobile number.
        </div>
      `;

      return;
    }

    box.innerHTML = data.map(order => {

      return `
        <div class="result" style="margin-top:10px">

          <b>${escapeHtml(order.id)}</b>

          <br>

          ${escapeHtml(order.service)}

          <br>

          Weight:
          ${escapeHtml(String(order.kg || 0))} KG

          <br>

          Status:
          <strong>
            ${escapeHtml(order.status || "Received")}
          </strong>

          <br>

          Total:
          <b>₹${escapeHtml(String(order.total || 0))}</b>

        </div>
      `;

    }).join("");

  } catch (error) {

    box.innerHTML = `
      <div class="result">
        ${escapeHtml(
          error.message ||
          "Something went wrong."
        )}
      </div>
    `;
  }
}

/* =========================
   ADMIN OPEN / CLOSE
========================= */

function showAdmin() {

  const panel =
    document.getElementById("adminPanel");

  panel.classList.remove("hidden");

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function hideAdmin() {

  document.getElementById("adminPanel")
    .classList.add("hidden");
}

/* =========================
   ADMIN LOGIN
========================= */

async function adminLogin() {

  const username =
    document.getElementById("adminUser")
      .value.trim();

  const password =
    document.getElementById("adminPass")
      .value;

  const errorBox =
    document.getElementById("loginError");

  errorBox.textContent = "";

  if (!username || !password) {

    errorBox.textContent =
      "Username aur password dono dalo.";

    return;
  }

  try {

    const response = await fetch(
      API + "/admin/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Invalid admin login."
      );
    }

    document.getElementById("adminLogin")
      .classList.add("hidden");

    document.getElementById("adminContent")
      .classList.remove("hidden");

    await loadAdminOrders();

  } catch (error) {

    errorBox.textContent =
      error.message || "Login failed.";
  }
}

/* =========================
   LOAD ADMIN ORDERS
========================= */

async function loadAdminOrders() {

  const list =
    document.getElementById("ordersList");

  if (!list) return;

  list.innerHTML = `
    <div class="result">
      Loading orders...
    </div>
  `;

  try {

    const response = await fetch(
      API + "/admin/orders"
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Admin login required."
      );
    }

    const orders = Array.isArray(data)
      ? data
      : (data.orders || []);

    updateAdminStats(orders);

    if (!orders.length) {

      list.innerHTML = `
        <div class="result">
          No orders yet.
        </div>
      `;

      return;
    }

    list.innerHTML = orders
      .slice()
      .reverse()
      .map(renderAdminOrder)
      .join("");

  } catch (error) {

    list.innerHTML = `
      <div class="result">
        ${escapeHtml(
          error.message ||
          "Unable to load orders."
        )}
      </div>
    `;
  }
}

/* =========================
   ADMIN STATS
========================= */

function updateAdminStats(orders) {

  const total =
    document.getElementById("totalOrders");

  const ready =
    document.getElementById("readyOrders");

  const received =
    document.getElementById("receivedOrders");

  const cleaning =
    document.getElementById("cleaningOrders");

  if (total) {
    total.textContent = orders.length;
  }

  if (ready) {
    ready.textContent =
      orders.filter(
        o => o.status === "Ready"
      ).length;
  }

  if (received) {
    received.textContent =
      orders.filter(
        o => o.status === "Received"
      ).length;
  }

  if (cleaning) {
    cleaning.textContent =
      orders.filter(
        o => o.status === "Cleaning"
      ).length;
  }
}

/* =========================
   ADMIN ORDER CARD
========================= */

function renderAdminOrder(order) {

  const id =
    order.id || "";

  const name =
    order.customerName ||
    order.name ||
    "Customer";

  const phone =
    order.mobile ||
    order.phone ||
    "";

  const service =
    order.service ||
    "Service";

  const quantity =
    order.kg ??
    order.quantity ??
    0;

  const address =
    order.address ||
    "Address not available";

  const total =
    order.total ??
    0;

  const status =
    order.status ||
    "Received";

  const created =
    order.createdAt ||
    order.created_at ||
    "";

  const statuses = [
    "Received",
    "Picked Up",
    "Cleaning",
    "Ready",
    "Delivered",
    "Not Ready"
  ];

  return `
    <div class="order-admin">

      <h3>
        Order #${escapeHtml(id)}
      </h3>

      <p>
        <b>Customer:</b>
        ${escapeHtml(name)}
      </p>

      <p>
        <b>Mobile:</b>
        ${escapeHtml(phone)}
      </p>

      <p>
        <b>Service:</b>
        ${escapeHtml(service)}
      </p>

      <p>
        <b>Quantity:</b>
        ${escapeHtml(String(quantity))}
        KG
      </p>

      <p>
        <b>Address:</b>
        ${escapeHtml(address)}
      </p>

      <p class="order-total">
        <b>Total:</b>
        ₹${escapeHtml(String(total))}
      </p>

      ${
        created
          ? `
            <p>
              <b>Order Time:</b>
              ${escapeHtml(
                new Date(created).toLocaleString()
              )}
            </p>
          `
          : ""
      }

      <span class="status-badge">
        ${escapeHtml(status)}
      </span>

      <select
        onchange="changeStatus(
          '${escapeAttribute(id)}',
          this.value
        )"
      >

        ${statuses.map(item => `
          <option
            value="${escapeAttribute(item)}"
            ${status === item ? "selected" : ""}
          >
            ${item}
          </option>
        `).join("")}

      </select>

      <div class="order-actions">

        <button
          class="call-btn"
          onclick="callCustomer(
            '${escapeAttribute(phone)}'
          )"
        >
          📞 Call
        </button>

        <button
          class="whatsapp-btn"
          onclick="whatsappCustomer(
            '${escapeAttribute(phone)}',
            '${escapeAttribute(id)}'
          )"
        >
          WhatsApp
        </button>

      </div>

    </div>
  `;
}

/* =========================
   CHANGE STATUS
========================= */

async function changeStatus(id, status) {

  try {

    const response = await fetch(
      API + "/admin/orders/" +
      encodeURIComponent(id),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Unable to update order."
      );
    }

    await loadAdminOrders();

  } catch (error) {

    alert(
      error.message ||
      "Status update failed."
    );
  }
}

/* =========================
   CALL CUSTOMER
========================= */

function callCustomer(phone) {

  if (!phone) {
    alert("Mobile number available nahi hai.");
    return;
  }

  window.location.href =
    "tel:" + phone;
}

/* =========================
   WHATSAPP
========================= */

function whatsappCustomer(phone, orderId) {

  if (!phone) {
    alert("Mobile number available nahi hai.");
    return;
  }

  const message =
    `Hello, Laundry Desire Hub se aapke Order ${orderId} ka update hai.`;

  window.open(
    "https://wa.me/91" +
    phone +
    "?text=" +
    encodeURIComponent(message),
    "_blank"
  );
}
