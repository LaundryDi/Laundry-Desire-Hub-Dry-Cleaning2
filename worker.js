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
    // HEALTH CHECK
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
          body.id ||
          "LDH" + Date.now().toString().slice(-8);

        const customerName =
          body.customerName ||
          body.name ||
          "";

        const mobile =
          body.mobile ||
          body.phone ||
          "";

        const address =
          body.address ||
          "";

        const service =
          body.service ||
          "";

        const kg =
          Number(
            body.kg ??
            body.quantity ??
            0
          );

        let amount = 0;

        if (service === "Wash & Fold") {
          amount = kg < 4 ? 269 : kg * 69;
        }

        if (service === "Wash & Iron") {
          amount = kg < 4 ? 369 : kg * 95;
        }

        if (service === "Dry Cleaning") {
          amount = Number(body.amount || 0);
        }

        const delivery =
          amount >= 300 ? 0 : 50;

        const total =
          amount + delivery;

        const createdAt =
          new Date().toISOString();

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
          order: {
            id,
            name: customerName,
            customerName,
            phone: mobile,
            mobile,
            address,
            service,
            quantity: kg,
            kg,
            amount,
            delivery,
            total,
            status: "Received",
            createdAt
          }
        }, 201);

      } catch (error) {
        return json({
          success: false,
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
          String(body.mobile || "")
            .replace(/\D/g, "");

        const result =
          await env.DB.prepare(`
            SELECT
              id,
              customer_name AS customerName,
              customer_name AS name,
              mobile,
              mobile AS phone,
              address,
              service,
              kg,
              kg AS quantity,
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

        return json(
          result.results || []
        );

      } catch (error) {
        return json({
          success: false,
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
        const body =
          await request.json();

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
          success: false,
          error: "Username ya password galat hai."
        }, 401);

      } catch (error) {
        return json({
          success: false,
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
        const result =
          await env.DB.prepare(`
            SELECT
              id,
              customer_name AS customerName,
              customer_name AS name,
              mobile,
              mobile AS phone,
              address,
              service,
              kg,
              kg AS quantity,
              amount,
              delivery,
              total,
              status,
              created_at AS createdAt
            FROM orders
            ORDER BY created_at DESC
          `)
            .all();

        return json(
          result.results || []
        );

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // =========================
    // CHANGE ORDER STATUS
    // =========================
    if (
      url.pathname.startsWith(
        "/api/admin/orders/"
      ) &&
      request.method === "PATCH"
    ) {
      try {
        const id =
          decodeURIComponent(
            url.pathname.split("/").pop()
          );

        const body =
          await request.json();

        const statuses = [
          "Received",
          "Picked Up",
          "Cleaning",
          "Ready",
          "Delivered",
          "Not Ready"
        ];

        if (
          !statuses.includes(
            body.status
          )
        ) {
          return json({
            success: false,
            error: "Invalid status"
          }, 400);
        }

        const result =
          await env.DB.prepare(`
            UPDATE orders
            SET status = ?
            WHERE id = ?
          `)
            .bind(
              body.status,
              id
            )
            .run();

        if (
          result.meta &&
          result.meta.changes === 0
        ) {
          return json({
            success: false,
            error: "Order not found"
          }, 404);
        }

        return json({
          success: true,
          id,
          status: body.status
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // =========================
    // DELETE ORDER
    // =========================
    if (
      url.pathname.startsWith(
        "/api/admin/orders/"
      ) &&
      request.method === "DELETE"
    ) {
      try {
        const id =
          decodeURIComponent(
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
          id
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // =========================
    // UNKNOWN API
    // =========================
    return json({
      success: false,
      error: "API endpoint not found"
    }, 404);
  }
};


function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
        "Cache-Control":
          "no-store"
      }
    }
  );
}
