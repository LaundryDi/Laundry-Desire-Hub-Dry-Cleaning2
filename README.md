# Laundry Desire Hub — Cloudflare Worker + D1

Cloudflare deployment-ready structure. IMPORTANT: the files in this package must be at the GitHub repository ROOT (public/, worker.js, wrangler.jsonc, package.json, schema.sql).

## Cloudflare setup
1. Create a D1 database named `laundry-desire-hub-db`.
2. Put the real D1 database ID into `wrangler.jsonc` replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.
3. Apply `schema.sql` to the D1 database.
4. In Cloudflare Workers deployment settings, use deploy command: `npx wrangler deploy`.
5. Do not set a separate build output directory. This is a Worker deployment with static assets.
6. For the admin password, use a Cloudflare secret if the Worker code supports it; do not expose production credentials in source control.
