export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =========================
    // WEBSITE
    // =========================
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // =========================
    // HEALTH
    // =========================
    if (
      url.pathname === "/api/health" &&
      request.method === "GET"
    ) {
      return json({
        success: true,
        message: "Laundry Desire Hub API is working"
      });
    }

    // =========================
    // PLACE ORDER
    // =========================
    if (
      url.pathname === "/api/orders" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        const id =
          "LDH" + Date.now().toString().slice(-8);

        const customerName = String(body.customerName || "").trim();
        const mobile = String(body.mobile || "").replace(/\D/g, "");
        const address = String(body.address || "").trim();
        const service = String(body.service || "").trim();
        const kg = Number(body.kg || 0);

        if (!customerName) {
          return json({ error: "Customer name required." }, 400);
        }

        if (!/^[0-9]{10}$/.test(mobile)) {
          return json({ error: "Valid 10 digit mobile required." }, 400);
        }

        if (!address) {
          return json({ error: "Address required." }, 400);
        }

        if (!kg || kg <= 0) {
          return json({ error: "Valid quantity required." }, 400);
        }

        let amount = 0;

        if (service === "Wash & Fold") {
          amount = kg < 4 ? 269 : kg * 69;
        } else if (service === "Wash & Iron") {
          amount = kg < 4 ? 369 : kg * 95;
        } else {
          return json({ error: "Invalid service." }, 400);
        }

        const delivery = amount >= 300 ? 0 : 50;
        const total = amount + delivery;

        const createdAt = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO orders
          (
            id,
            customer_name,
            mobile,
            address,
            service,
            kg,
            amount,
            delivery,
            total,
            status,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            id,
            customerName,
            mobile,
            address,
            service,
            kg,
            amount,
            delivery,
            total,
            "Received",
            createdAt
          )
          .run();

        return json({
          success: true,
          id,
          customerName,
          mobile,
          address,
          service,
          kg,
          amount,
          delivery,
          total,
          status: "Received",
          createdAt
        }, 201);

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // CUSTOMER TRACKING
    // =========================
    if (
      url.pathname === "/api/customer/orders" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        const mobile =
          String(body.mobile || "").replace(/\D/g, "");

        const result = await env.DB.prepare(`
          SELECT
            id,
            customer_name AS customerName,
            mobile,
            address,
            service,
            kg,
            amount,
            delivery,
            total,
            status,
            created_at AS createdAt
          FROM orders
          WHERE mobile = ?
          ORDER BY created_at DESC
        `)
          .bind(mobile)
          .all();

        return json(result.results || []);

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // ADMIN LOGIN
    // =========================
    if (
      url.pathname === "/api/admin/login" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        if (
          body.username === "Laundry" &&
          body.password === "4321"
        ) {
          return json({
            success: true,
            message: "Admin login successful"
          });
        }

        return json({
          error: "Username ya password galat hai."
        }, 401);

      } catch {
        return json({
          error: "Invalid request"
        }, 400);
      }
    }

    // =========================
    // ADMIN DASHBOARD STATS
    // =========================
    if (
      url.pathname === "/api/admin/stats" &&
      request.method === "GET"
    ) {
      try {
        const total = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
        `).first();

        const received = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE status = 'Received'
        `).first();

        const pickedUp = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE status = 'Picked Up'
        `).first();

        const cleaning = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE status = 'Cleaning'
        `).first();

        const ready = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE status = 'Ready'
        `).first();

        const delivered = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE status = 'Delivered'
        `).first();

        const notReady = await env.DB.prepare(`
          SELECT COUNT(*) AS count
          FROM orders
          WHERE status = 'Not Ready'
        `).first();

        const revenue = await env.DB.prepare(`
          SELECT COALESCE(SUM(total), 0) AS total
          FROM orders
          WHERE status != 'Not Ready'
        `).first();

        return json({
          totalOrders: Number(total?.count || 0),
          received: Number(received?.count || 0),
          pickedUp: Number(pickedUp?.count || 0),
          cleaning: Number(cleaning?.count || 0),
          ready: Number(ready?.count || 0),
          delivered: Number(delivered?.count || 0),
          notReady: Number(notReady?.count || 0),
          revenue: Number(revenue?.total || 0)
        });

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // ADMIN ALL ORDERS
    // =========================
    if (
      url.pathname === "/api/admin/orders" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.DB.prepare(`
          SELECT
            id,
            customer_name AS customerName,
            mobile,
            address,
            service,
            kg,
            amount,
            delivery,
            total,
            status,
            created_at AS createdAt
          FROM orders
          ORDER BY created_at DESC
        `).all();

        return json(result.results || []);

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // GET SINGLE ORDER
    // =========================
    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      request.method === "GET"
    ) {
      try {
        const id = decodeURIComponent(
          url.pathname.split("/").pop()
        );

        const order = await env.DB.prepare(`
          SELECT
            id,
            customer_name AS customerName,
            mobile,
            address,
            service,
            kg,
            amount,
            delivery,
            total,
            status,
            created_at AS createdAt
          FROM orders
          WHERE id = ?
        `)
          .bind(id)
          .first();

        if (!order) {
          return json({
            error: "Order not found."
          }, 404);
        }

        return json(order);

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // UPDATE ORDER
    // =========================
    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      request.method === "PUT"
    ) {
      try {
        const id = decodeURIComponent(
          url.pathname.split("/").pop()
        );

        const body = await request.json();

        const customerName =
          String(body.customerName || "").trim();

        const mobile =
          String(body.mobile || "").replace(/\D/g, "");

        const address =
          String(body.address || "").trim();

        const service =
          String(body.service || "").trim();

        const kg = Number(body.kg || 0);

        if (!customerName || !/^[0-9]{10}$/.test(mobile)) {
          return json({
            error: "Invalid customer details."
          }, 400);
        }

        if (!address || !kg || kg <= 0) {
          return json({
            error: "Invalid order details."
          }, 400);
        }

        let amount = 0;

        if (service === "Wash & Fold") {
          amount = kg < 4 ? 269 : kg * 69;
        } else if (service === "Wash & Iron") {
          amount = kg < 4 ? 369 : kg * 95;
        } else {
          return json({
            error: "Invalid service."
          }, 400);
        }

        const delivery = amount >= 300 ? 0 : 50;
        const total = amount + delivery;

        await env.DB.prepare(`
          UPDATE orders
          SET
            customer_name = ?,
            mobile = ?,
            address = ?,
            service = ?,
            kg = ?,
            amount = ?,
            delivery = ?,
            total = ?
          WHERE id = ?
        `)
          .bind(
            customerName,
            mobile,
            address,
            service,
            kg,
            amount,
            delivery,
            total,
            id
          )
          .run();

        return json({
          success: true,
          message: "Order updated successfully."
        });

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // CHANGE STATUS
    // =========================
    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      request.method === "PATCH"
    ) {
      try {
        const id = decodeURIComponent(
          url.pathname.split("/").pop()
        );

        const body = await request.json();

        const statuses = [
          "Received",
          "Picked Up",
          "Cleaning",
          "Ready",
          "Out for Delivery",
          "Delivered",
          "Not Ready",
          "Cancelled"
        ];

        if (!statuses.includes(body.status)) {
          return json({
            error: "Invalid status."
          }, 400);
        }

        await env.DB.prepare(`
          UPDATE orders
          SET status = ?
          WHERE id = ?
        `)
          .bind(body.status, id)
          .run();

        return json({
          success: true,
          id,
          status: body.status
        });

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    // =========================
    // DELETE ORDER
    // =========================
    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      request.method === "DELETE"
    ) {
      try {
        const id = decodeURIComponent(
          url.pathname.split("/").pop()
        );

        await env.DB.prepare(`
          DELETE FROM orders
          WHERE id = ?
        `)
          .bind(id)
          .run();

        return json({
          success: true,
          message: "Order deleted successfully.",
          id
        });

      } catch (error) {
        return json({
          error: error.message
        }, 500);
      }
    }

    return json({
      error: "API endpoint not found"
    }, 404);
  }
};


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
          }
