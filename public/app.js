const API = "/api";

function selectService(service) {
  const select = document.getElementById("service");
  const form = document.getElementById("orderForm");

  if (select) select.value = service;
  if (form) {
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showResult(message, error = false) {
  const box = document.getElementById("orderResult");

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
   PLACE ORDER
========================= */

document.getElementById("orderForm").addEventListener(
  "submit",
  async function (e) {

    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value
      .replace(/\D/g, "");

    const service = document.getElementById("service").value;

    const quantity = Number(
      document.getElementById("quantity").value
    );

    const address = document.getElementById("address").value.trim();

    if (!name) {
      showResult("Please enter your name.", true);
      return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      showResult("Please enter a valid 10-digit mobile number.", true);
      return;
    }

    if (!service) {
      showResult("Please select a service.", true);
      return;
    }

    if (!quantity || quantity <= 0) {
      showResult("Please enter quantity / weight.", true);
      return;
    }

    if (!address) {
      showResult("Please enter your pickup address.", true);
      return;
    }


    const button = document.querySelector(
      "#orderForm .place-order-btn"
    );

    button.disabled = true;
    button.innerHTML = "Placing Order...";


    try {

      const response = await fetch(API + "/orders", {
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
      });


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
        <b>₹${data.total}</b>

        <br>

        Delivery:
        2–3 days

        <br><br>

        <strong>
          Is Order ID ko save karke rakho.
        </strong>
      `);


      document.getElementById("orderForm").reset();


    } catch (error) {

      showResult(
        escapeHtml(error.message || "Something went wrong."),
        true
      );

    } finally {

      button.disabled = false;

      button.innerHTML = `
        Place Order
        <span>→</span>
      `;
    }
  }
);


/* =========================
   TRACK ORDER
========================= */

async function trackOrder() {

  const phone = document.getElementById("trackPhone")
    .value
    .replace(/\D/g, "");

  const box = document.getElementById("trackingResult");


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
          ${escapeHtml(String(order.kg))} KG

          <br>

          Status:
          <strong>
            ${escapeHtml(order.status)}
          </strong>

          <br>

          Total:
          <b>₹${escapeHtml(String(order.total))}</b>

        </div>
      `;

    }).join("");


  } catch (error) {

    box.innerHTML = `
      <div class="result">
        ${escapeHtml(
          error.message || "Something went wrong."
        )}
      </div>
    `;

  }
}


/* =========================
   ADMIN
========================= */

function showAdmin() {

  document.getElementById("adminPanel")
    .classList.remove("hidden");

  document.getElementById("adminPanel")
    .scrollIntoView({
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
    document.getElementById("adminUser").value.trim();

  const password =
    document.getElementById("adminPass").value;


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
          username: username,
          password: password
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

  list.innerHTML = `
    <p>Loading orders...</p>
  `;


  try {

    const response = await fetch(
      API + "/admin/orders"
    );


    const data = await response.json();


    if (!response.ok) {

      throw new Error(
        data.error || "Admin login required."
      );
    }


    document.getElementById("totalOrders")
      .textContent = data.length;


    document.getElementById("readyOrders")
      .textContent =
      data.filter(
        order => order.status === "Ready"
      ).length;


    if (!data.length) {

      list.innerHTML = `
        <p>No orders yet.</p>
      `;

      return;
    }


    list.innerHTML = data.map(order => {

      const statuses = [
        "Received",
        "Picked Up",
        "Cleaning",
        "Ready",
        "Delivered"
      ];


      return `
        <div class="order-admin">

          <h3>
            ${escapeHtml(order.id)}
          </h3>

          <p>
            <b>
              ${escapeHtml(order.customerName || "")}
            </b>
            •
            ${escapeHtml(order.mobile || "")}
          </p>

          <p>
            ${escapeHtml(order.service || "")}
            •
            ${escapeHtml(String(order.kg || ""))} KG
          </p>

          <p>
            Total:
            <b>₹${escapeHtml(String(order.total || 0))}</b>
          </p>

          <p>
            Address:
            ${escapeHtml(order.address || "")}
          </p>

          <select
            onchange="changeStatus(
              '${escapeAttribute(order.id)}',
              this.value
            )"
          >

            ${statuses.map(status => `
              <option
                value="${escapeAttribute(status)}"
                ${order.status === status ? "selected" : ""}
              >
                ${status}
              </option>
            `).join("")}

          </select>

        </div>
      `;

    }).join("");


  } catch (error) {

    list.innerHTML = `
      <div class="result">
        ${escapeHtml(
          error.message || "Unable to load orders."
        )}
      </div>
    `;

  }
}


/* =========================
   CHANGE ORDER STATUS
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
          status: status
        })
      }
    );


    const data = await response.json();


    if (!response.ok) {

      throw new Error(
        data.error || "Unable to update order."
      );
    }


    await loadAdminOrders();


  } catch (error) {

    alert(
      error.message || "Status update failed."
    );

  }
}


/* =========================
   SECURITY HELPERS
========================= */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

  return escapeHtml(value)
    .replace(/`/g, "&#096;");
}
