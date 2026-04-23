# gigienergy-worker

A Cloudflare Worker that demonstrates:

- Cloudflare Access authentication
- country detection using Cloudflare request metadata
- flag retrieval from R2
- flag retrieval from D1

When a user visits the Worker through the Access-protected hostname, the Worker displays the authenticated email, request timestamp, and visitor country. It also provides links to retrieve that country’s flag from both R2 and D1.

## Features

- `/` returns a simple HTML page showing:
  - authenticated user email
  - current timestamp
  - detected country code
  - link to flag from R2
  - link to flag from D1
- `/flags/:country` fetches the flag image from an R2 bucket
- `/flags-d1/:country` fetches the flag image from a D1 database

## Project files

- `index.js` – main Worker logic
- `wrangler.jsonc` – Cloudflare Worker configuration and bindings
- `package.json` – Node project metadata and scripts
- `schema.sql` – D1 schema for the `flags` table
- `generate-flags-sql.js` – helper script to generate SQL inserts for flag images
- `import-flags.sql` – generated SQL import file for D1

## Requirements

- Node.js and npm installed
- Cloudflare account
- Wrangler CLI
- An R2 bucket containing flag images
- A D1 database containing flag records
- A Cloudflare Access application protecting your chosen hostname

Wrangler is the CLI used to develop and deploy Workers locally and remotely. Cloudflare Workers use bindings to connect the Worker to resources such as R2 and D1. [web:445][web:644]

## Install dependencies

```bash
npm install
```

## Configure the Worker

Update `wrangler.jsonc` with your own resource bindings.

### Example R2 binding

```jsonc
"r2_buckets": [
  {
    "binding": "FLAGS",
    "bucket_name": "flags-private"
  }
]
```

The Worker uses the `FLAGS` binding to read flag objects from R2. [web:431][web:440]

### Example D1 binding

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "flags-db",
    "database_id": "YOUR_DATABASE_ID",
    "remote": true
  }
]
```

The Worker uses the `DB` binding to query the D1 database through `env.DB`. [web:577][web:644]

## D1 schema

Create the D1 table using `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS flags (
  country_code TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  image_data BLOB NOT NULL
);
```

Then execute:

```bash
npx wrangler d1 execute flags-db --remote --file=schema.sql
```

Cloudflare supports running SQL against D1 using `wrangler d1 execute`. [web:454][web:577]

## Import flags into D1

If you already have local flag images, use `generate-flags-sql.js` to generate `import-flags.sql`, then import it into D1:

```bash
node generate-flags-sql.js
npx wrangler d1 execute flags-db --remote --file=import-flags.sql
```

For large files, smaller flag assets are recommended so the SQL statements stay within D1 limits. [web:577][web:454]

## Run locally

Start local development with:

```bash
npm run dev
```

Cloudflare Workers can be run locally with Wrangler during development. [web:485]

Then test routes such as:

```bash
http://localhost:8787/
http://localhost:8787/flags/sg
http://localhost:8787/flags-d1/sg
```

## Deploy

Deploy the Worker with:

```bash
npx wrangler deploy
```

Wrangler is the standard way to deploy Cloudflare Workers. [web:445][web:454]

## Route the Worker to a hostname

To serve the Worker from a real hostname, add a route such as:

```text
tunnel.gigienergy.me/*
```

This causes requests on that hostname to execute the Worker. Workers routes map incoming URL patterns to your Worker. [web:447]

## Access authentication

This project is intended to be used behind Cloudflare Access. The Worker reads the authenticated email from the request header:

```js
cf-access-authenticated-user-email
```

If the request reaches the Worker through the Access-protected hostname, the Worker can display the authenticated user’s email. Cloudflare Access passes identity context to the application after successful authentication. [web:436]

## How it works

### `/`
The root route returns an HTML page that:
- reads the authenticated user email from Cloudflare Access
- reads the visitor country from `request.cf.country`
- generates links to the R2 and D1 flag endpoints

### `/flags/:country`
This route:
- converts the country code into a filename like `sg.png`
- retrieves the image from the R2 bucket using `env.FLAGS.get(...)`
- returns the image with `Content-Type: image/png`

R2 bucket bindings are accessed through the Worker `env` object. [web:431]

### `/flags-d1/:country`
This route:
- extracts the country code from the URL
- queries D1 using a prepared SQL statement
- retrieves `content_type` and `image_data`
- returns the binary image response

D1 queries in Workers are done through `env.DB.prepare(...).bind(...).first()`. [web:577][web:596]

## Notes

- The R2 route assumes flag files are stored as `.png`
- The D1 route stores the MIME type in the database so the response can return the correct `Content-Type`
- If `/` shows `unknown@example.com`, the Worker was likely accessed outside the Access-protected hostname

## Example usage

After deployment and routing, open:

```text
https://tunnel.gigienergy.me/
```

Then try:

```text
https://tunnel.gigienergy.me/flags/sg
https://tunnel.gigienergy.me/flags-d1/sg
```

## Author

Jacobhwc
