const API = "/api";

let allAdminOrders = [];

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

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

/* =========================
   SERVICE
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
   SHOW / HIDE ADMIN
========================= */

function showAdmin() {
  const panel = document.getElementById("adminPanel");

  if (!panel) return;

  panel.classList.remove("hidden");

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function hideAdmin() {
  const panel = document.getElementById("adminPanel");

  if (panel) {
    panel.classList.add("hidden");
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
      Number(
        document.getElementById("quantity").value
      );

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

    if (button) {
      button.disabled = true;
      button.innerHTML = "Placing Order...";
    }

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
            address,
            service,
            kg: quantity
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to place order."
        );
      }

      const order = data.order || data;

      showResult(`
        <strong>Order Successfully Placed! 🎉</strong>
        <br><br>

        Order ID:
        <b>${escapeHtml(order.id)}</b>

        <br>

        Customer:
        ${escapeHtml(order.customerName || order.name)}

        <br>

        Service:
        ${escapeHtml(order.service)}

        <br>

        Weight:
        ${escapeHtml(String(order.kg ?? order.quantity ?? 0))} KG

        <br>

        Amount:
        <b>₹${escapeHtml(String(order.amount ?? 0))}</b>

        <br>

        Delivery:
        <b>₹${escapeHtml(String(order.delivery ?? 0))}</b>

        <br>

        Total:
        <b>₹${escapeHtml(String(order.total ?? 0))}</b>

        <br>

        Status:
        <strong>${escapeHtml(order.status || "Received")}</strong>

        <br><br>

        Delivery: 2–3 days

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
      if (button) {
        button.disabled = false;
        button.innerHTML = `
          Place Order
          <span>→</span>
        `;
      }
    }
  });
}

/* =========================
   TRACK ORDER
========================= */

async function trackOrder() {
  const input =
    document.getElementById("trackPhone");

  const box =
    document.getElementById("trackingResult");

  if (!input || !box) return;

  const phone =
    input.value.replace(/\D/g, "");

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
    const response =
      await fetch(
        API + "/customer/orders",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            mobile: phone
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to find orders."
      );
    }

    if (!Array.isArray(data) || !data.length) {
      box.innerHTML = `
        <div class="result">
          No order found for this mobile number.
        </div>
      `;
      return;
    }

    box.innerHTML =
      data.map(order => `
        <div
          class="result"
          style="margin-top:10px"
        >
          <b>
            Order #${escapeHtml(order.id)}
          </b>

          <br>

          Customer:
          ${escapeHtml(order.customerName || "")}

          <br>

          Service:
          ${escapeHtml(order.service || "")}

          <br>

          Weight:
          ${escapeHtml(
            String(order.kg ?? order.quantity ?? 0)
          )} KG

          <br>

          Amount:
          ₹${escapeHtml(
            String(order.amount ?? 0)
          )}

          <br>

          Delivery:
          ₹${escapeHtml(
            String(order.delivery ?? 0)
          )}

          <br>

          Total:
          <b>
            ₹${escapeHtml(
              String(order.total ?? 0)
            )}
          </b>

          <br>

          Status:
          <strong>
            ${escapeHtml(
              order.status || "Received"
            )}
          </strong>
        </div>
      `)
      .join("");

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
   ADMIN LOGIN
========================= */

async function adminLogin() {
  const username =
    document.getElementById("adminUser")
      ?.value.trim();

  const password =
    document.getElementById("adminPass")
      ?.value;

  const errorBox =
    document.getElementById("loginError");

  if (!errorBox) return;

  errorBox.textContent = "";

  if (!username || !password) {
    errorBox.textContent =
      "Username aur password dono dalo.";
    return;
  }

  try {
    const response =
      await fetch(
        API + "/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            username,
            password
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Invalid admin login."
      );
    }

    document
      .getElementById("adminLogin")
      .classList.add("hidden");

    document
      .getElementById("adminContent")
      .classList.remove("hidden");

    await loadAdminOrders();

  } catch (error) {
    errorBox.textContent =
      error.message ||
      "Login failed.";
  }
}

/* =========================
   ADMIN LOGOUT
========================= */

function adminLogout() {
  document
    .getElementById("adminContent")
    .classList.add("hidden");

  document
    .getElementById("adminLogin")
    .classList.remove("hidden");

  document.getElementById("adminUser").value = "";
  document.getElementById("adminPass").value = "";
  document.getElementById("loginError").textContent = "";
}

/* =========================
   LOAD ADMIN ORDERS
========================= */

async function loadAdminOrders() {
  const list =
    document.getElementById("ordersList");

  if (!list) return;

  list.innerHTML = `
    <p>Loading orders...</p>
  `;

  try {
    const response =
      await fetch(
        API + "/admin/orders",
        {
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to load orders."
      );
    }

    allAdminOrders =
      Array.isArray(data)
        ? data
        : data.orders || [];

    updateAdminStats(allAdminOrders);
    renderAdminOrders();

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
  setText(
    "totalOrders",
    orders.length
  );

  setText(
    "receivedOrders",
    orders.filter(
      o => o.status === "Received"
    ).length
  );

  setText(
    "pickedUpOrders",
    orders.filter(
      o => o.status === "Picked Up"
    ).length
  );

  setText(
    "cleaningOrders",
    orders.filter(
      o => o.status === "Cleaning"
    ).length
  );

  setText(
    "readyOrders",
    orders.filter(
      o => o.status === "Ready"
    ).length
  );

  setText(
    "deliveredOrders",
    orders.filter(
      o => o.status === "Delivered"
    ).length
  );

  setText(
    "notReadyOrders",
    orders.filter(
      o => o.status === "Not Ready"
    ).length
  );
}

/* =========================
   FILTER + SEARCH
========================= */

function renderAdminOrders() {
  const list =
    document.getElementById(
      "ordersList"
    );

  if (!list) return;

  const filter =
    document.getElementById(
      "adminFilter"
    )?.value || "All";

  const search =
    document.getElementById(
      "adminSearch"
    )?.value
      .trim()
      .toLowerCase() || "";

  let orders = [
    ...allAdminOrders
  ];

  if (filter !== "All") {
    orders =
      orders.filter(
        order =>
          order.status === filter
      );
  }

  if (search) {
    orders =
      orders.filter(order => {
        const text = [
          order.id,
          order.customerName,
          order.mobile,
          order.service,
          order.address,
          order.status
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(search);
      });
  }

  if (!orders.length) {
    list.innerHTML = `
      <div class="result">
        No orders found.
      </div>
    `;
    return;
  }

  list.innerHTML =
    orders
      .map(renderAdminOrder)
      .join("");
}

/* =========================
   ADMIN ORDER CARD
========================= */

function renderAdminOrder(order) {
  const id =
    escapeHtml(order.id || "");

  const name =
    escapeHtml(
      order.customerName ||
      order.name ||
      "Customer"
    );

  const mobile =
    escapeHtml(
      order.mobile ||
      order.phone ||
      ""
    );

  const service =
    escapeHtml(
      order.service ||
      ""
    );

  const kg =
    escapeHtml(
      String(
        order.kg ??
        order.quantity ??
        0
      )
    );

  const amount =
    escapeHtml(
      String(
        order.amount ??
        0
      )
    );

  const delivery =
    escapeHtml(
      String(
        order.delivery ??
        0
      )
    );

  const total =
    escapeHtml(
      String(
        order.total ??
        0
      )
    );

  const address =
    escapeHtml(
      order.address ||
      "Address not available"
    );

  const status =
    order.status ||
    "Received";

  const created =
    order.createdAt
      ? new Date(
          order.createdAt
        ).toLocaleString()
      : "";

  const statuses = [
    "Received",
    "Picked Up",
    "Cleaning",
    "Ready",
    "Delivered",
    "Not Ready"
  ];

  const options =
    statuses.map(
      item => `
        <option
          value="${escapeHtml(item)}"
          ${item === status ? "selected" : ""}
        >
          ${escapeHtml(item)}
        </option>
      `
    ).join("");

  return `
    <div class="order-admin">

      <h3>
        Order #${id}
      </h3>

      <p>
        <b>Customer:</b>
        ${name}
      </p>

      <p>
        <b>Mobile:</b>
        ${mobile}
      </p>

      <p>
        <b>Service:</b>
        ${service}
      </p>

      <p>
        <b>Weight:</b>
        ${kg} KG
      </p>

      <p>
        <b>Amount:</b>
        ₹${amount}
      </p>

      <p>
        <b>Delivery:</b>
        ₹${delivery}
      </p>

      <p class="order-total">
        Total: ₹${total}
      </p>

      <p>
        <b>Address:</b>
        ${address}
      </p>

      ${
        created
          ? `
            <p>
              <b>Order Time:</b>
              ${escapeHtml(created)}
            </p>
          `
          : ""
      }

      <span class="status-badge">
        ${escapeHtml(status)}
      </span>

      <select
        onchange="changeStatus(
          '${escapeHtml(order.id)}',
          this.value
        )"
      >
        ${options}
      </select>

      <div class="order-actions">

        <button
          class="call-btn"
          onclick="callCustomer(
            '${escapeHtml(mobile)}'
          )"
        >
          📞 Call
        </button>

        <button
          class="whatsapp-btn"
          onclick="whatsappCustomer(
            '${escapeHtml(mobile)}',
            '${escapeHtml(order.id)}'
          )"
        >
          💬 WhatsApp
        </button>

      </div>

      <button
        style="
          width:100%;
          margin-top:8px;
          border:0;
          padding:11px;
          border-radius:11px;
          background:#fff1f1;
          color:#b42318;
          font-weight:800;
          cursor:pointer;
        "
        onclick="deleteOrder(
          '${escapeHtml(order.id)}'
        )"
      >
        🗑️ Delete Order
      </button>

    </div>
  `;
}

/* =========================
   CHANGE STATUS
========================= */

async function changeStatus(id, status) {
  try {
    const response =
      await fetch(
        API +
        "/admin/orders/" +
        encodeURIComponent(id),
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            status
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to update order."
      );
    }

    const order =
      allAdminOrders.find(
        item =>
          String(item.id) ===
          String(id)
      );

    if (order) {
      order.status = status;
    }

    updateAdminStats(
      allAdminOrders
    );

    renderAdminOrders();

  } catch (error) {
    alert(
      error.message ||
      "Status update failed."
    );
  }
}

/* =========================
   DELETE ORDER
========================= */

async function deleteOrder(id) {
  const confirmDelete =
    confirm(
      "Kya aap ye order permanently delete karna chahte ho?"
    );

  if (!confirmDelete) return;

  try {
    const response =
      await fetch(
        API +
        "/admin/orders/" +
        encodeURIComponent(id),
        {
          method: "DELETE"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to delete order."
      );
    }

    allAdminOrders =
      allAdminOrders.filter(
        order =>
          String(order.id) !==
          String(id)
      );

    updateAdminStats(
      allAdminOrders
    );

    renderAdminOrders();

  } catch (error) {
    alert(
      error.message ||
      "Delete failed."
    );
  }
}

/* =========================
   CALL CUSTOMER
========================= */

function callCustomer(phone) {
  if (!phone) {
    alert(
      "Mobile number available nahi hai."
    );
    return;
  }

  window.location.href =
    "tel:" + phone;
}

/* =========================
   WHATSAPP
========================= */

function whatsappCustomer(
  phone,
  orderId
) {
  if (!phone) {
    alert(
      "Mobile number available nahi hai."
    );
    return;
  }

  const cleanPhone =
    String(phone)
      .replace(/\D/g, "");

  const whatsappNumber =
    cleanPhone.length === 10
      ? "91" + cleanPhone
      : cleanPhone;

  const message =
    `Hello, Laundry Desire Hub se aapke Order ${orderId} ka update hai.`;

  window.open(
    "https://wa.me/" +
      whatsappNumber +
      "?text=" +
      encodeURIComponent(message),
    "_blank"
  );
}

/* =========================
   FILTER EVENT
========================= */

const adminFilter =
  document.getElementById(
    "adminFilter"
  );

if (adminFilter) {
  adminFilter.addEventListener(
    "change",
    renderAdminOrders
  );
}
