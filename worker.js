export default {
  async fetch(request, env) {

    const url = new URL(request.url);
    const path = url.pathname;

    /*
    ========================================
    CORS
    ========================================
    */

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }


    /*
    ========================================
    JSON RESPONSE HELPER
    ========================================
    */

    function json(data, status = 200) {

      return new Response(
        JSON.stringify(data),
        {
          status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );

    }


    /*
    ========================================
    ADMIN LOGIN
    ========================================
    */

    if (
      path === "/api/admin/login" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();

        const username =
          String(body.username || "").trim();

        const password =
          String(body.password || "");

        if (!username || !password) {

          return json(
            {
              error: "Username and password required."
            },
            400
          );

        }


        const admin =
          await env.DB.prepare(
            `
            SELECT id, username
            FROM admins
            WHERE username = ?
            AND password = ?
            LIMIT 1
            `
          )
          .bind(username, password)
          .first();


        if (!admin) {

          return json(
            {
              error: "Invalid admin login."
            },
            401
          );

        }


        return json({
          success: true,
          username: admin.username
        });

      } catch (error) {

        return json(
          {
            error: error.message
          },
          500
        );

      }

    }


    /*
    ========================================
    PLACE ORDER
    ========================================
    */

    if (
      path === "/api/orders" &&
      request.method === "POST"
    ) {

      try {

        const body = await request.json();


        const customerName =
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
          )
          .replace(/\D/g, "");


        const address =
          String(
            body.address || ""
          ).trim();


        const service =
          String(
            body.service || ""
          ).trim();


        const kg =
          Number(
            body.kg ||
            body.quantity ||
            0
          );


        if (!customerName) {

          return json(
            {
              error: "Customer name is required."
            },
            400
          );

        }


        if (!/^[0-9]{10}$/.test(mobile)) {

          return json(
            {
              error: "Valid 10 digit mobile number required."
            },
            400
          );

        }


        if (!address) {

          return json(
            {
              error: "Pickup address is required."
            },
            400
          );

        }


        if (!service) {

          return json(
            {
              error: "Service is required."
            },
            400
          );

        }


        if (!kg || kg <= 0) {

          return json(
            {
              error: "Quantity / weight is required."
            },
            400
          );

        }


        /*
        ========================================
        PRICE CALCULATION
        ========================================
        */

        let amount = 0;


        if (service === "Wash & Fold") {

          if (kg < 4) {
            amount = 269;
          } else {
            amount = kg * 69;
          }

        }


        else if (service === "Wash & Iron") {

          if (kg < 4) {
            amount = 369;
          } else {
            amount = kg * 95;
          }

        }


        else if (service === "Dry Cleaning") {

          amount = 0;

        }


        const delivery =
          amount >= 300 ? 0 : 50;


        const total =
          amount + delivery;


        /*
        ========================================
        ORDER ID
        ========================================
        */

        const id =
          "LDH" +
          Date.now()
            .toString()
            .slice(-8);


        const createdAt =
          new Date().toISOString();


        /*
        ========================================
        SAVE ORDER
        ========================================
        */

        await env.DB.prepare(
          `
          INSERT INTO orders (
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
          `
        )
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

        return json(
          {
            error:
              error.message ||
              "Unable to place order."
          },
          500
        );

      }

    }


    /*
    ========================================
    CUSTOMER TRACKING
    ========================================
    */

    if (
      path === "/api/customer/orders" &&
      request.method === "POST"
    ) {

      try {

        const body =
          await request.json();


        const mobile =
          String(
            body.mobile || ""
          )
          .replace(/\D/g, "");


        if (!/^[0-9]{10}$/.test(mobile)) {

          return json(
            {
              error:
                "Valid 10 digit mobile number required."
            },
            400
          );

        }


        const result =
          await env.DB.prepare(
            `
            SELECT
              id,
              service,
              kg,
              total,
              status,
              created_at
            FROM orders
            WHERE mobile = ?
            ORDER BY created_at DESC
            `
          )
          .bind(mobile)
          .all();


        const orders =
          (result.results || [])
          .map(order => ({

            id: order.id,

            service: order.service,

            kg: order.kg,

            total: order.total,

            status: order.status,

            createdAt: order.created_at

          }));


        return json(orders);


      } catch (error) {

        return json(
          {
            error: error.message
          },
          500
        );

      }

    }


    /*
    ========================================
    ADMIN — ALL ORDERS
    ========================================
    */

    if (
      path === "/api/admin/orders" &&
      request.method === "GET"
    ) {

      try {

        const result =
          await env.DB.prepare(
            `
            SELECT
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
            FROM orders
            ORDER BY created_at DESC
            `
          )
          .all();


        const orders =
          (result.results || [])
          .map(order => ({

            id: order.id,

            customerName:
              order.customer_name,

            mobile:
              order.mobile,

            address:
              order.address,

            service:
              order.service,

            kg:
              order.kg,

            amount:
              order.amount,

            delivery:
              order.delivery,

            total:
              order.total,

            status:
              order.status,

            createdAt:
              order.created_at

          }));


        return json(orders);


      } catch (error) {

        return json(
          {
            error: error.message
          },
          500
        );

      }

    }


    /*
    ========================================
    CHANGE ORDER STATUS
    ========================================
    */

    if (
      path.startsWith("/api/admin/orders/") &&
      request.method === "PATCH"
    ) {

      try {

        const id =
          decodeURIComponent(
            path.replace(
              "/api/admin/orders/",
              ""
            )
          );


        const body =
          await request.json();


        const status =
          String(
            body.status || ""
          ).trim();


        const allowedStatuses = [

          "Received",

          "Picked Up",

          "Cleaning",

          "Ready",

          "Delivered",

          "Not Ready"

        ];


        if (!allowedStatuses.includes(status)) {

          return json(
            {
              error:
                "Invalid order status."
            },
            400
          );

        }


        const result =
          await env.DB.prepare(
            `
            UPDATE orders
            SET status = ?
            WHERE id = ?
            `
          )
          .bind(
            status,
            id
          )
          .run();


        if (!result.success) {

          return json(
            {
              error:
                "Unable to update order."
            },
            500
          );

        }


        return json({

          success: true,

          id,

          status

        });


      } catch (error) {

        return json(
          {
            error:
              error.message ||
              "Unable to update order."
          },
          500
        );

      }

    }


    /*
    ========================================
    STATIC WEBSITE
    ========================================
    */

    return env.ASSETS.fetch(request);

  }
};
