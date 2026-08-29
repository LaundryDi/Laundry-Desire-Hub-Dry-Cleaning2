export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Website
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // Health check
    if (url.pathname === "/api/health") {
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

        const customerName = body.customerName || "";
        const mobile = body.mobile || "";
        const address = body.address || "";
        const service = body.service || "";
        const kg = Number(body.kg || 0);

        let amount = 0;

        if (service === "Wash & Fold") {
          amount = kg < 4 ? 269 : kg * 69;
        }

        if (service === "Wash & Iron") {
          amount = kg < 4 ? 369 : kg * 95;
        }

        const delivery = amount >= 300 ? 0 : 50;
        const total = amount + delivery;

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
            new Date().toISOString()
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
          status: "Received"
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
        const mobile = body.mobile || "";

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
    // ADMIN ORDERS
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
          "Delivered",
          "Not Ready"
        ];

        if (!statuses.includes(body.status)) {
          return json({
            error: "Invalid status"
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
        "Content-Type": "application/json"
      }
    }
  );
      }
