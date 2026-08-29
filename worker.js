const API = "/api";

function selectService(service) {
  document.getElementById("service").value = service;
  document.getElementById("orderForm").scrollIntoView({
    behavior: "smooth"
  });
}

document.getElementById("orderForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const service = document.getElementById("service").value;
  const quantity = Number(document.getElementById("quantity").value);
  const address = document.getElementById("address").value.trim();

  if (!/^[0-9]{10}$/.test(phone)) {
    alert("10 digit mobile number dalo.");
    return;
  }

  try {
    const response = await fetch(API + "/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customerName: name,
        mobile: phone,
        service: service,
        kg: quantity,
        address: address
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Order place nahi hua.");
      return;
    }

    document.getElementById("orderResult").classList.remove("hidden");

    document.getElementById("orderResult").innerHTML = `
      <strong>🎉 Order Successfully Placed!</strong>
      <br><br>
      Order ID: <b>${data.id}</b>
      <br>
      Total: <b>₹${data.total}</b>
      <br>
      Delivery: 2–3 days
      <br><br>
      Order ID save karke rakho.
    `;

    document.getElementById("orderForm").reset();

  } catch (error) {
    alert("Server se connection nahi ho raha.");
  }
});


async function trackOrder() {

  const phone = document.getElementById("trackPhone").value.trim();
  const box = document.getElementById("trackingResult");

  if (!/^[0-9]{10}$/.test(phone)) {
    box.innerHTML = `<div class="result">10 digit mobile number dalo.</div>`;
    return;
  }

  try {

    const response = await fetch(API + "/customer/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mobile: phone
      })
    });

    const orders = await response.json();

    if (!response.ok || !orders.length) {
      box.innerHTML = `
        <div class="result">
          Koi order nahi mila.
        </div>
      `;
      return;
    }

    box.innerHTML = orders.map(order => `
      <div class="result" style="margin-top:10px">
        <b>${order.id}</b><br>
        ${order.service}<br>
        Quantity: ${order.kg} KG<br>
        Total: ₹${order.total}<br>
        Status: <strong>${order.status}</strong>
      </div>
    `).join("");

  } catch {
    box.innerHTML = `
      <div class="result">
        Server se connection nahi ho raha.
      </div>
    `;
  }
}


function showAdmin() {
  document.getElementById("adminPanel").classList.remove("hidden");

  document.getElementById("adminPanel").scrollIntoView({
    behavior: "smooth"
  });
}


function hideAdmin() {
  document.getElementById("adminPanel").classList.add("hidden");
}


async function adminLogin() {

  const username = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value;

  const error = document.getElementById("loginError");

  try {

    const response = await fetch(API + "/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      error.textContent = data.error || "Login failed.";
      return;
    }

    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("adminContent").classList.remove("hidden");

    loadAdminOrders();

  } catch {
    error.textContent = "Server se connection nahi ho raha.";
  }
}


async function loadAdminOrders() {

  const list = document.getElementById("ordersList");

  try {

    const response = await fetch(API + "/admin/orders", {
      method: "GET",
      credentials: "include"
    });

    const orders = await response.json();

    if (!response.ok) {
      list.innerHTML = `<p>Admin login required.</p>`;
      return;
    }

    document.getElementById("totalOrders").textContent =
      orders.length;

    document.getElementById("readyOrders").textContent =
      orders.filter(o => o.status === "Ready").length;

    if (!orders.length) {
      list.innerHTML = "<p>Abhi koi order nahi hai.</p>";
      return;
    }

    list.innerHTML = orders.map(order => `
      <div class="order-admin">

        <h3>${order.id}</h3>

        <p>
          <b>${escapeHTML(order.customerName)}</b>
          • ${escapeHTML(order.mobile)}
        </p>

        <p>
          ${escapeHTML(order.service)}
          • ${order.kg} KG
        </p>

        <p>
          Total: <b>₹${order.total}</b>
        </p>

        <p>
          Address: ${escapeHTML(order.address)}
        </p>

        <p>
          Status:
          <strong>${escapeHTML(order.status)}</strong>
        </p>

        <select onchange="changeStatus('${order.id}', this.value)">
          ${[
            "Received",
            "Picked Up",
            "Cleaning",
            "Ready",
            "Delivered"
          ].map(status => `
            <option
              value="${status}"
              ${order.status === status ? "selected" : ""}
            >
              ${status}
            </option>
          `).join("")}
        </select>

        <input
          style="margin-top:8px"
          placeholder="Signature"
          value="${escapeHTML(order.signature || "")}"
          onchange="changeSignature('${order.id}', this.value)"
        >

      </div>
    `).join("");

  } catch {
    list.innerHTML = `
      <p>Orders load nahi ho rahe.</p>
    `;
  }
}


async function changeStatus(id, status) {

  try {

    const response = await fetch(
      API + "/admin/orders/" + encodeURIComponent(id),
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: status,
          ready: status === "Ready"
        })
      }
    );

    if (!response.ok) {
      alert("Status update nahi hua.");
      return;
    }

    loadAdminOrders();

  } catch {
    alert("Server error.");
  }
}


async function changeSignature(id, signature) {

  try {

    await fetch(
      API + "/admin/orders/" + encodeURIComponent(id),
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          signature: signature
        })
      }
    );

  } catch {
    alert("Signature save nahi hua.");
  }
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
