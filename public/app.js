const API = "/api";

/* =========================
   LOCAL BACKUP
========================= */

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
  return escapeHtml(value)
    .replace(/`/g, "&#096;");
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
   PRICE
========================= */

function calculateAmount(service, quantity) {

  quantity = Number(quantity);

  if (service === "Wash & Fold") {

    if (quantity < 4) {
      return 269;
    }

    return quantity * 69;
  }


  if (service === "Wash & Iron") {

    if (quantity < 4) {
      return 369;
    }

    return quantity * 95;
  }


  return 0;
}


/* =========================
   ORDER ID
========================= */

function generateOrderId() {

  return "LDH" +
    Date.now()
      .toString()
      .slice(-8);
}


/* =========================
   PLACE ORDER
========================= */

const orderForm = document.getElementById("orderForm");

if (orderForm) {

  orderForm.addEventListener(
    "submit",
    async function (e) {

      e.preventDefault();


      const name =
        document.getElementById("name")
          .value
          .trim();


      const phone =
        document.getElementById("phone")
          .value
          .replace(/\D/g, "");


      const service =
        document.getElementById("service")
          .value;


      const quantity =
        Number(
          document.getElementById("quantity")
            .value
        );


      const address =
        document.getElementById("address")
          .value
          .trim();


      if (!name) {
        showResult(
          "Please enter your name.",
          true
        );
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

        showResult(
          "Please select a service.",
          true
        );

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


      const amount =
        calculateAmount(
          service,
          quantity
        );


      const delivery =
        amount >= 300 ? 0 : 50;


      const order = {

        id: generateOrderId(),

        name: name,

        phone: phone,

        service: service,

        quantity: quantity,

        address: address,

        amount: amount,

        delivery: delivery,

        total: amount + delivery,

        status: "Received",

        createdAt:
          new Date().toISOString()

      };


      const button =
        document.querySelector(
          "#orderForm .place-order-btn"
        );


      if (button) {

        button.disabled = true;

        button.innerHTML =
          "Placing Order...";

      }


      try {

        const response =
          await fetch(
            API + "/orders",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify(order)
            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.error ||
            "Unable to place order."
          );

        }


        const savedOrder =
          data.order ||
          data;


        localOrders.push(
          savedOrder
        );


        localStorage.setItem(
          "laundryOrders",
          JSON.stringify(localOrders)
        );


        showResult(`

          <strong>
            Order Successfully Placed! 🎉
          </strong>

          <br><br>

          Order ID:
          <b>
            ${escapeHtml(
              savedOrder.id ||
              order.id
            )}
          </b>

          <br>

          Service:
          ${escapeHtml(
            savedOrder.service ||
            service
          )}

          <br>

          Total:
          <b>
            ₹${escapeHtml(
              String(
                savedOrder.total ??
                order.total
              )
            )}
          </b>

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

        /*
          Browser backup
          agar API unavailable ho
        */

        localOrders.push(order);

        localStorage.setItem(
          "laundryOrders",
          JSON.stringify(localOrders)
        );


        showResult(`

          <strong>
            Order Successfully Placed! 🎉
          </strong>

          <br><br>

          Order ID:
          <b>
            ${escapeHtml(order.id)}
          </b>

          <br>

          Service:
          ${escapeHtml(order.service)}

          <br>

          Total:
          <b>
            ₹${escapeHtml(
              String(order.total)
            )}
          </b>

          <br>

          Delivery:
          2–3 days

          <br><br>

          <strong>
            Is Order ID ko save karke rakho.
          </strong>

        `);


        orderForm.reset();

      } finally {

        if (button) {

          button.disabled = false;

          button.innerHTML = `
            Place Order
            <span>→</span>
          `;

        }

      }

    }
  );

}


/* =========================
   TRACK ORDER
========================= */

async function trackOrder() {

  const input =
    document.getElementById(
      "trackPhone"
    );


  const box =
    document.getElementById(
      "trackingResult"
    );


  const phone =
    input.value
      .replace(/\D/g, "");


  if (!/^[0-9]{10}$/.test(phone)) {

    box.innerHTML = `

      <div class="result">

        Please enter a valid
        10-digit mobile number.

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


    if (!data.length) {

      box.innerHTML = `

        <div class="result">

          No order found for
          this mobile number.

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
            ${escapeHtml(order.id)}
          </b>

          <br>

          Service:
          ${escapeHtml(order.service)}

          <br>

          Weight:
          ${escapeHtml(
            String(order.kg ?? order.quantity ?? "")
          )} KG

          <br>

          Status:
          <strong>
            ${escapeHtml(
              order.status || "Received"
            )}
          </strong>

          <br>

          Total:
          <b>
            ₹${escapeHtml(
              String(order.total ?? 0)
            )}
          </b>

        </div>

      `).join("");


  } catch (error) {

    /*
      Local backup tracking
    */

    const orders =
      localOrders.filter(
        order =>
          order.phone === phone ||
          order.mobile === phone
      );


    if (!orders.length) {

      box.innerHTML = `

        <div class="result">

          No order found
          for this mobile number.

        </div>

      `;

      return;
    }


    box.innerHTML =
      orders
        .slice()
        .reverse()
        .map(order => `

          <div
            class="result"
            style="margin-top:10px"
          >

            <b>
              ${escapeHtml(order.id)}
            </b>

            <br>

            Service:
            ${escapeHtml(order.service)}

            <br>

            Status:
            <strong>
              ${escapeHtml(
                order.status
              )}
            </strong>

            <br>

            Total:
            <b>
              ₹${escapeHtml(
                String(order.total)
              )}
            </b>

          </div>

        `)
        .join("");

  }

}


/* =========================
   SHOW / HIDE ADMIN
========================= */

function showAdmin() {

  const panel =
    document.getElementById(
      "adminPanel"
    );


  panel.classList.remove(
    "hidden"
  );


  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


function hideAdmin() {

  document.getElementById(
    "adminPanel"
  ).classList.add(
    "hidden"
  );

}


/* =========================
   ADMIN LOGIN
========================= */

async function adminLogin() {

  const username =
    document.getElementById(
      "adminUser"
    ).value.trim();


  const password =
    document.getElementById(
      "adminPass"
    ).value;


  const errorBox =
    document.getElementById(
      "loginError"
    );


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
            username: username,
            password: password
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


    document.getElementById(
      "adminLogin"
    ).classList.add(
      "hidden"
    );


    document.getElementById(
      "adminContent"
    ).classList.remove(
      "hidden"
    );


    await loadAdminOrders();


  } catch (error) {

    /*
      Temporary local admin login
      if backend login is unavailable
    */

    if (
      username === "Laundry" &&
      password === "4321"
    ) {

      document.getElementById(
        "adminLogin"
      ).classList.add(
        "hidden"
      );


      document.getElementById(
        "adminContent"
      ).classList.remove(
        "hidden"
      );


      await loadAdminOrders();

      return;
    }


    errorBox.textContent =
      error.message ||
      "Login failed.";

  }

}


/* =========================
   LOAD ADMIN ORDERS
========================= */

async function loadAdminOrders() {

  const list =
    document.getElementById(
      "ordersList"
    );


  if (!list) return;


  list.innerHTML = `

    <p>
      Loading orders...
    </p>

  `;


  let orders = [];


  try {

    const response =
      await fetch(
        API + "/admin/orders"
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
        "Unable to load orders."
      );

    }


    orders =
      Array.isArray(data)
        ? data
        : data.orders || [];


  } catch (error) {

    /*
      Local backup
    */

    orders =
      [...localOrders];

  }


  const filter =
    document.getElementById(
      "adminFilter"
    )?.value || "All";


  if (filter !== "All") {

    orders =
      orders.filter(
        order =>
          (order.status || "Received")
          === filter
      );

  }


  /* =========================
     STATS
  ========================= */

  const totalOrders =
    document.getElementById(
      "totalOrders"
    );


  const readyOrders =
    document.getElementById(
      "readyOrders"
    );


  if (totalOrders) {

    totalOrders.textContent =
      orders.length;

  }


  if (readyOrders) {

    readyOrders.textContent =
      orders.filter(
        order =>
          order.status === "Ready"
      ).length;

  }


  /* =========================
     EMPTY
  ========================= */

  if (!orders.length) {

    list.innerHTML = `

      <div class="result">

        No orders found.

      </div>

    `;

    return;
  }


  /* =========================
     ORDER CARDS
  ========================= */

  list.innerHTML =
    orders
      .slice()
      .reverse()
      .map(order => {

        const id =
          order.id || "Unknown";


        const name =
          order.name ||
          order.customerName ||
          "Customer";


        const phone =
          order.phone ||
          order.mobile ||
          "";


        const service =
          order.service ||
          "Service";


        const quantity =
          order.quantity ??
          order.kg ??
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

          <div
            class="order-admin"
          >

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
              ${escapeHtml(
                String(quantity)
              )}
              KG
            </p>


            <p>
              <b>Address:</b>
              ${escapeHtml(address)}
            </p>


            <p class="order-total">
              Total:
              ₹${escapeHtml(
                String(total)
              )}
            </p>


            ${
              created
                ? `
                  <p>
                    <b>Order Time:</b>
                    ${escapeHtml(
                      new Date(created)
                        .toLocaleString()
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

              ${statuses.map(
                currentStatus => `

                  <option
                    value="${escapeAttribute(
                      currentStatus
                    )}"
                    ${
                      status === currentStatus
                        ? "selected"
                        : ""
                    }
                  >
                    ${currentStatus}
                  </option>

                `
              ).join("")}

            </select>


            <div
              class="order-actions"
            >

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

                💬 WhatsApp

              </button>

            </div>

          </div>

        `;

      })
      .join("");

}


/* =========================
   CHANGE STATUS
========================= */

async function changeStatus(
  id,
  status
) {

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
            status: status
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


  } catch (error) {

    /*
      Local backup
    */

    const order =
      localOrders.find(
        o => o.id === id
      );


    if (order) {

      order.status =
        status;


      localStorage.setItem(
        "laundryOrders",
        JSON.stringify(
          localOrders
        )
      );

    }

  }


  await loadAdminOrders();

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
