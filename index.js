export default {
  async fetch(request, env, ctx) {
	// parse the request URL
    const url = new URL(request.url);
	
	// authenticated user email from Access header, or fallback to unknown
    if (url.pathname === "/") {
      const email =
        request.headers.get("cf-access-authenticated-user-email") ||
        "unknown@example.com";
		
	// country code from Cloudflare's request.cf.country, or fallback to "XX"
      const country = (request.cf && request.cf.country
        ? request.cf.country
        : "XX").toLowerCase();
		
	// current timestamp in ISO format
      const timestamp = new Date().toISOString();
	  
	// simple HTML response showing authenticated email, timestamp, and links to flags
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Secure Home</title>
  </head>
  <body>
    <p>
      ${email} authenticated at ${timestamp} from
      <a href="/flags/${country}">${country.toUpperCase()}</a>
    </p>
    <p>
      D1 flag:
      <a href="/flags-d1/${country}">${country.toUpperCase()}</a>
    </p>
  </body>
</html>`;

	// return the HTML response with appropriate content type
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

	// handle requests to /flags-d1/:country and /flags/:country
    if (url.pathname.startsWith("/flags-d1/")) {

	// extract country code from URL path
      const country = url.pathname.split("/")[2]?.toLowerCase();

      if (!country) {
        return new Response("Missing country code", {
          status: 400,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

	  // query D1 database for content type and image data based on country code
      const result = await env.DB
        .prepare("SELECT content_type, image_data FROM flags WHERE country_code = ?")
        .bind(country)
        .first();

      if (!result) {
        return new Response("Flag not found in D1", {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

	  // ensure image data is in ArrayBuffer format for the response body
      const body =
        result.image_data instanceof ArrayBuffer
          ? result.image_data
          : new Uint8Array(result.image_data).buffer;

		// return the image data with the appropriate content type from the database
      return new Response(body, {
        headers: {
          "Content-Type": result.content_type || "application/octet-stream",
        },
      });
    }

	// handle requests to /flags/:country by fetching from R2 storage
    if (url.pathname.startsWith("/flags/")) {
      const country = url.pathname.split("/")[2]?.toLowerCase();

      if (!country) {
        return new Response("Missing country code", {
          status: 400,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

	// construct the key for R2 storage and attempt to retrieve the object
      const key = `${country}.png`;
      const object = await env.FLAGS.get(key);

      if (!object) {
        return new Response("Flag not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

	  // return the image data from R2 with the appropriate content type
      return new Response(object.body, {
        headers: {
          "Content-Type": "image/png",
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  },
};