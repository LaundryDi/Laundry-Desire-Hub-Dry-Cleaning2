export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    try {

      // =========================
      // HEALTH CHECK
      // =========================

      if (path === "/api/health" && method === "GET") {
        return json({
          success: true,
          message: "Laundry Desire Hub API is working"
        });
      }


      // =========================
      // ADMIN LOGIN
      // =========================

      if (path === "/api/admin/login" && method === "POST") {

        const body = await request.json();

        const username = String(body.username || "").trim();
        const password = String(body.password || "");

        if (!username || !password) {
          return json(
            { error: "Username and password required." },
            400
          );
        }

        const admin = await env.DB
          .prepare(`
            SELECT id, username
            FROM admins
            WHERE username = ? AND password = ?
            LIMIT 1
          `)
          .bind(username, password)
          .first();

        if (!admin) {
          return json(
            { error: "Invalid username or password." },
            401
          );
        }

        return json({
          success: true,
          message: "Admin login successful",
          admin: {
            id: admin.id,
            username: admin.username
          }
        });
      }


      // =========================
      // CREATE ORDER
      // =========================

      if (path === "/api/orders" && method === "POST") {

        const body = await request.json();

        const name =
          String(
            body.customerName ||
            body.name ||
            ""
          ).trim();

        const mobile =
          String(
            body.mobile ||
            body.phone ||
            ""
          ).replace(/\D/g, "");

        const address =
          String(body.address || "").trim();

        const service =
          String(body.service || "").trim();

        const kg =
          Number(
            body.kg ??
            body.quantity ??
            0
          );

        const pickupDate =
          String(body.pickupDate || "");

        if (!name) {
          return json(
            { error: "Customer name is required." },
            400
          );
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
          return json(
            { error: "Valid 10 digit mobile number required." },
            400
          );
        }

        if (!address) {
          return json(
            { error: "Pickup address is required." },
            400
          );
        }

        if (!service) {
          return json(
            { error: "Service is required." },
            400
          );
        }

        if (!kg || kg <= 0) {
          return json(
            { error: "Valid quantity / KG required." },
            400
          );
        }


        // PRICE CALCULATION

        let amount = 0;

        if (service === "Wash & Fold") {
          amount = kg < 4 ? 269 : kg * 69;
        }

        else if (service === "Wash & Iron") {
          amount = kg < 4 ? 369 : kg * 95;
        }

        else {
          return json(
            { error: "Invalid service selected." },
            400
          );
        }


        const freeDeliveryMinimum = 300;

        const deliveryCharge =
          amount >= freeDeliveryMinimum
            ? 0
            : 50;

        const discount =
          Number(body.discount || 0);

        const total =
          Math.max(
            0,
            amount + deliveryCharge - discount
          );


        const id =
          "LDH" +
          Date.now().toString().slice(-8);

        const createdAt =
          new Date().toISOString();


        // SAVE ORDER

        await env.DB
          .prepare(`
            INSERT INTO orders (
              id,
              customer_name,
              mobile,
              address,
              service,
              kg,
              amount,
              delivery_charge,
              discount,
              total,
              payment_method,
              payment_status,
              status,
              pickup_date,
              delivery_date,
              admin_note,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            id,
            name,
            mobile,
            address,
            service,
            kg,
            amount,
            deliveryCharge,
            discount,
            total,
            "Cash",
            "Unpaid",
            "Received",
            pickupDate,
            "",
            "",
            createdAt
          )
          .run();


        // UPDATE / CREATE CUSTOMER

        const existingCustomer =
          await env.DB
            .prepare(`
              SELECT mobile
              FROM customers
              WHERE mobile = ?
              LIMIT 1
            `)
            .bind(mobile)
            .first();


        if (existingCustomer) {

          await env.DB
            .prepare(`
              UPDATE customers
              SET
                name = ?,
                address = ?,
                total_orders = total_orders + 1,
                total_spent = total_spent + ?,
                updated_at = ?
              WHERE mobile = ?
            `)
            .bind(
              name,
              address,
              total,
              createdAt,
              mobile
            )
            .run();

        } else {

          await env.DB
            .prepare(`
              INSERT INTO customers (
                mobile,
                name,
                address,
                total_orders,
                total_spent,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              mobile,
              name,
              address,
              1,
              total,
              createdAt,
              createdAt
            )
            .run();
        }


        return json({
          success: true,
          id,
          customerName: name,
          mobile,
          address,
          service,
          kg,
          amount,
          deliveryCharge,
          discount,
          total,
          paymentMethod: "Cash",
          paymentStatus: "Unpaid",
          status: "Received",
          pickupDate,
          createdAt
        }, 201);
      }


      // =========================
      // CUSTOMER ORDERS
      // =========================

      if (
        path === "/api/customer/orders" &&
        method === "POST"
      ) {

        const body = await request.json();

        const mobile =
          String(body.mobile || "")
            .replace(/\D/g, "");

        if (!/^[0-9]{10}$/.test(mobile)) {
          return json(
            { error: "Valid mobile number required." },
            400
          );
        }

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                customer_name AS customerName,
                mobile,
                address,
                service,
                kg,
                amount,
                delivery_charge AS deliveryCharge,
                discount,
                total,
                payment_method AS paymentMethod,
                payment_status AS paymentStatus,
                status,
                pickup_date AS pickupDate,
                delivery_date AS deliveryDate,
                admin_note AS adminNote,
                created_at AS createdAt
              FROM orders
              WHERE mobile = ?
              ORDER BY created_at DESC
            `)
            .bind(mobile)
            .all();

        return json(result.results || []);
      }


      // =========================
      // GET ALL ORDERS
      // =========================

      if (
        path === "/api/orders" &&
        method === "GET"
      ) {

        const phone =
          url.searchParams.get("phone");

        let result;

        if (phone) {

          result =
            await env.DB
              .prepare(`
                SELECT
                  id,
                  customer_name AS customerName,
                  mobile,
                  address,
                  service,
                  kg,
                  amount,
                  delivery_charge AS deliveryCharge,
                  discount,
                  total,
                  payment_method AS paymentMethod,
                  payment_status AS paymentStatus,
                  status,
                  pickup_date AS pickupDate,
                  delivery_date AS deliveryDate,
                  admin_note AS adminNote,
                  created_at AS createdAt
                FROM orders
                WHERE mobile = ?
                ORDER BY created_at DESC
              `)
              .bind(
                phone.replace(/\D/g, "")
              )
              .all();

        } else {

          result =
            await env.DB
              .prepare(`
                SELECT
                  id,
                  customer_name AS customerName,
                  mobile,
                  address,
                  service,
                  kg,
                  amount,
                  delivery_charge AS deliveryCharge,
                  discount,
                  total,
                  payment_method AS paymentMethod,
                  payment_status AS paymentStatus,
                  status,
                  pickup_date AS pickupDate,
                  delivery_date AS deliveryDate,
                  admin_note AS adminNote,
                  created_at AS createdAt
                FROM orders
                ORDER BY created_at DESC
              `)
              .all();
        }

        return json({
          orders: result.results || []
        });
      }


      // =========================
      // ADMIN ORDERS
      // =========================

      if (
        path === "/api/admin/orders" &&
        method === "GET"
      ) {

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                customer_name AS customerName,
                mobile,
                address,
                service,
                kg,
                amount,
                delivery_charge AS deliveryCharge,
                discount,
                total,
                payment_method AS paymentMethod,
                payment_status AS paymentStatus,
                status,
                pickup_date AS pickupDate,
                delivery_date AS deliveryDate,
                admin_note AS adminNote,
                created_at AS createdAt
              FROM orders
              ORDER BY created_at DESC
            `)
            .all();

        return json(result.results || []);
      }


      // =========================
      // UPDATE ORDER STATUS
      // =========================

      if (
        path.startsWith("/api/admin/orders/") &&
        method === "PATCH"
      ) {

        const id =
          decodeURIComponent(
            path.replace("/api/admin/orders/", "")
          );

        const body =
          await request.json();

        const status =
          String(body.status || "").trim();

        const allowedStatuses = [
          "Received",
          "Picked Up",
          "Cleaning",
          "Ready",
          "Delivered",
          "Not Ready",
          "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
          return json(
            { error: "Invalid order status." },
            400
          );
        }

        const result =
          await env.DB
            .prepare(`
              UPDATE orders
              SET status = ?
              WHERE id = ?
            `)
            .bind(
              status,
              id
            )
            .run();

        if (!result.meta.changes) {
          return json(
            { error: "Order not found." },
            404
          );
        }

        return json({
          success: true,
          id,
          status
        });
      }


      // =========================
      // OLD UPDATE ENDPOINT
      // =========================

      if (
        path.startsWith("/api/orders/") &&
        method === "PUT"
      ) {

        const id =
          decodeURIComponent(
            path.replace("/api/orders/", "")
          );

        const body =
          await request.json();

        const status =
          String(body.status || "").trim();

        const allowedStatuses = [
          "Received",
          "Picked Up",
          "Cleaning",
          "Ready",
          "Delivered",
          "Not Ready",
          "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
          return json(
            { error: "Invalid status." },
            400
          );
        }

        const result =
          await env.DB
            .prepare(`
              UPDATE orders
              SET status = ?
              WHERE id = ?
            `)
            .bind(status, id)
            .run();

        if (!result.meta.changes) {
          return json(
            { error: "Order not found." },
            404
          );
        }

        return json({
          success: true,
          id,
          status
        });
      }


      // =========================
      // GET SINGLE ORDER
      // =========================

      if (
        path.startsWith("/api/order/") &&
        method === "GET"
      ) {

        const id =
          decodeURIComponent(
            path.replace("/api/order/", "")
          );

        const order =
          await env.DB
            .prepare(`
              SELECT
                id,
                customer_name AS customerName,
                mobile,
                address,
                service,
                kg,
                amount,
                delivery_charge AS deliveryCharge,
                discount,
                total,
                payment_method AS paymentMethod,
                payment_status AS paymentStatus,
                status,
                pickup_date AS pickupDate,
                delivery_date AS deliveryDate,
                admin_note AS adminNote,
                created_at AS createdAt
              FROM orders
              WHERE id = ?
              LIMIT 1
            `)
            .bind(id)
            .first();

        if (!order) {
          return json(
            { error: "Order not found." },
            404
          );
        }

        return json(order);
      }


      // =========================
      // UPDATE PAYMENT
      // =========================

      if (
        path.startsWith("/api/admin/orders/") &&
        path.endsWith("/payment") &&
        method === "PATCH"
      ) {

        const id =
          decodeURIComponent(
            path
              .replace("/api/admin/orders/", "")
              .replace("/payment", "")
          );

        const body =
          await request.json();

        const paymentStatus =
          String(
            body.paymentStatus || "Unpaid"
          );

        const paymentMethod =
          String(
            body.paymentMethod || "Cash"
          );

        const allowedPaymentStatus = [
          "Paid",
          "Unpaid",
          "Partial"
        ];

        if (
          !allowedPaymentStatus.includes(
            paymentStatus
          )
        ) {
          return json(
            { error: "Invalid payment status." },
            400
          );
        }

        await env.DB
          .prepare(`
            UPDATE orders
            SET
              payment_status = ?,
              payment_method = ?
            WHERE id = ?
          `)
          .bind(
            paymentStatus,
            paymentMethod,
            id
          )
          .run();

        return json({
          success: true,
          id,
          paymentStatus,
          paymentMethod
        });
      }


      // =========================
      // ADMIN NOTE
      // =========================

      if (
        path.startsWith("/api/admin/orders/") &&
        path.endsWith("/note") &&
        method === "PATCH"
      ) {

        const id =
          decodeURIComponent(
            path
              .replace("/api/admin/orders/", "")
              .replace("/note", "")
          );

        const body =
          await request.json();

        const note =
          String(body.note || "");

        await env.DB
          .prepare(`
            UPDATE orders
            SET admin_note = ?
            WHERE id = ?
          `)
          .bind(
            note,
            id
          )
          .run();

        return json({
          success: true,
          id,
          note
        });
      }


      // =========================
      // EDIT ORDER
      // =========================

      if (
        path.startsWith("/api/admin/orders/") &&
        method === "PUT"
      ) {

        const id =
          decodeURIComponent(
            path.replace("/api/admin/orders/", "")
          );

        const body =
          await request.json();

        const name =
          String(body.customerName || "").trim();

        const mobile =
          String(body.mobile || "")
            .replace(/\D/g, "");

        const address =
          String(body.address || "").trim();

        const service =
          String(body.service || "").trim();

        const kg =
          Number(body.kg || 0);

        const discount =
          Number(body.discount || 0);

        const paymentMethod =
          String(
            body.paymentMethod || "Cash"
          );

        const paymentStatus =
          String(
            body.paymentStatus || "Unpaid"
          );

        if (!name || !mobile || !address || !service || !kg) {
          return json(
            { error: "All required fields must be filled." },
            400
          );
        }

        let amount = 0;

        if (service === "Wash & Fold") {
          amount = kg < 4 ? 269 : kg * 69;
        }

        if (service === "Wash & Iron") {
          amount = kg < 4 ? 369 : kg * 95;
        }

        const deliveryCharge =
          amount >= 300 ? 0 : 50;

        const total =
          Math.max(
            0,
            amount + deliveryCharge - discount
          );

        await env.DB
          .prepare(`
            UPDATE orders
            SET
              customer_name = ?,
              mobile = ?,
              address = ?,
              service = ?,
              kg = ?,
              amount = ?,
              delivery_charge = ?,
              discount = ?,
              total = ?,
              payment_method = ?,
              payment_status = ?
            WHERE id = ?
          `)
          .bind(
            name,
            mobile,
            address,
            service,
            kg,
            amount,
            deliveryCharge,
            discount,
            total,
            paymentMethod,
            paymentStatus,
            id
          )
          .run();

        return json({
          success: true,
          id,
          total
        });
      }


      // =========================
      // DELETE ORDER
      // =========================

      if (
        path.startsWith("/api/admin/orders/") &&
        method === "DELETE"
      ) {

        const id =
          decodeURIComponent(
            path.replace("/api/admin/orders/", "")
          );

        const result =
          await env.DB
            .prepare(`
              DELETE FROM orders
              WHERE id = ?
            `)
            .bind(id)
            .run();

        if (!result.meta.changes) {
          return json(
            { error: "Order not found." },
            404
          );
        }

        return json({
          success: true,
          message: "Order deleted."
        });
      }


      // =========================
      // CUSTOMERS
      // =========================

      if (
        path === "/api/admin/customers" &&
        method === "GET"
      ) {

        const result =
          await env.DB
            .prepare(`
              SELECT
                mobile,
                name,
                address,
                total_orders AS totalOrders,
                total_spent AS totalSpent,
                created_at AS createdAt,
                updated_at AS updatedAt
              FROM customers
              ORDER BY updated_at DESC
            `)
            .all();

        return json(result.results || []);
      }


      // =========================
      // CUSTOMER HISTORY
      // =========================

      if (
        path.startsWith("/api/admin/customers/") &&
        path.endsWith("/orders") &&
        method === "GET"
      ) {

        const mobile =
          decodeURIComponent(
            path
              .replace("/api/admin/customers/", "")
              .replace("/orders", "")
          );

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                customer_name AS customerName,
                mobile,
                address,
                service,
                kg,
                total,
                payment_status AS paymentStatus,
                status,
                created_at AS createdAt
              FROM orders
              WHERE mobile = ?
              ORDER BY created_at DESC
            `)
            .bind(mobile)
            .all();

        return json(result.results || []);
      }


      // =========================
      // DASHBOARD STATS
      // =========================

      if (
        path === "/api/admin/stats" &&
        method === "GET"
      ) {

        const total =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS count
              FROM orders
            `)
            .first();

        const revenue =
          await env.DB
            .prepare(`
              SELECT COALESCE(SUM(total), 0) AS total
              FROM orders
            `)
            .first();

        const paid =
          await env.DB
            .prepare(`
              SELECT COALESCE(SUM(total), 0) AS total
              FROM orders
              WHERE payment_status = 'Paid'
            `)
            .first();

        const unpaid =
          await env.DB
            .prepare(`
              SELECT COALESCE(SUM(total), 0) AS total
              FROM orders
              WHERE payment_status = 'Unpaid'
            `)
            .first();

        const pending =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS count
              FROM orders
              WHERE status NOT IN ('Delivered', 'Cancelled')
            `)
            .first();

        const ready =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS count
              FROM orders
              WHERE status = 'Ready'
            `)
            .first();

        const delivered =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS count
              FROM orders
              WHERE status = 'Delivered'
            `)
            .first();

        const cancelled =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS count
              FROM orders
              WHERE status = 'Cancelled'
            `)
            .first();

        return json({
          totalOrders: Number(total?.count || 0),
          totalRevenue: Number(revenue?.total || 0),
          paidAmount: Number(paid?.total || 0),
          unpaidAmount: Number(unpaid?.total || 0),
          pendingOrders: Number(pending?.count || 0),
          readyOrders: Number(ready?.count || 0),
          deliveredOrders: Number(delivered?.count || 0),
          cancelledOrders: Number(cancelled?.count || 0)
        });
      }


      // =========================
      // REPORTS
      // =========================

      if (
        path === "/api/admin/reports" &&
        method === "GET"
      ) {

        const daily =
          await env.DB
            .prepare(`
              SELECT
                substr(created_at, 1, 10) AS date,
                COUNT(*) AS orders,
                COALESCE(SUM(total), 0) AS revenue
              FROM orders
              GROUP BY substr(created_at, 1, 10)
              ORDER BY date DESC
              LIMIT 90
            `)
            .all();

        const services =
          await env.DB
            .prepare(`
              SELECT
                service,
                COUNT(*) AS orders,
                COALESCE(SUM(total), 0) AS revenue
              FROM orders
              GROUP BY service
              ORDER BY revenue DESC
            `)
            .all();

        return json({
          daily: daily.results || [],
          services: services.results || []
        });
      }


      // =========================
      // SETTINGS GET
      // =========================

      if (
        path === "/api/admin/settings" &&
        method === "GET"
      ) {

        const result =
          await env.DB
            .prepare(`
              SELECT key, value
              FROM settings
              ORDER BY key
            `)
            .all();

        const settings = {};

        for (
          const row of result.results || []
        ) {
          settings[row.key] = row.value;
        }

        return json(settings);
      }


      // =========================
      // SETTINGS UPDATE
      // =========================

      if (
        path === "/api/admin/settings" &&
        method === "PUT"
      ) {

        const body =
          await request.json();

        for (
          const [key, value]
          of Object.entries(body)
        ) {

          await env.DB
            .prepare(`
              INSERT INTO settings (key, value)
              VALUES (?, ?)
              ON CONFLICT(key)
              DO UPDATE SET value = excluded.value
            `)
            .bind(
              String(key),
              String(value)
            )
            .run();
        }

        return json({
          success: true,
          message: "Settings updated."
        });
      }


      // =========================
      // INVOICE DATA
      // =========================

      if (
        path.startsWith("/api/admin/invoice/") &&
        method === "GET"
      ) {

        const id =
          decodeURIComponent(
            path.replace("/api/admin/invoice/", "")
          );

        const order =
          await env.DB
            .prepare(`
              SELECT
                id,
                customer_name AS customerName,
                mobile,
                address,
                service,
                kg,
                amount,
                delivery_charge AS deliveryCharge,
                discount,
                total,
                payment_method AS paymentMethod,
                payment_status AS paymentStatus,
                status,
                pickup_date AS pickupDate,
                delivery_date AS deliveryDate,
                created_at AS createdAt
              FROM orders
              WHERE id = ?
              LIMIT 1
            `)
            .bind(id)
            .first();

        if (!order) {
          return json(
            { error: "Invoice/order not found." },
            404
          );
        }

        return json({
          invoiceNumber: "INV-" + order.id,
          businessName: "Laundry Desire Hub",
          order
        });
      }


      // =========================
      // 404
      // =========================

      if (path.startsWith("/api/")) {

        return json(
          {
            error: "API route not found.",
            path
          },
          404
        );
      }


      // =========================
      // STATIC WEBSITE
      // =========================

      return env.ASSETS.fetch(request);

    } catch (error) {

      console.error(error);

      return json(
        {
          error:
            error?.message ||
            "Internal server error."
        },
        500
      );
    }
  }
};


// =========================
// JSON RESPONSE
// =========================

function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        ...corsHeaders()
      }
    }
  );
}


// =========================
// CORS
// =========================

function corsHeaders() {

  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type"
  };
}
