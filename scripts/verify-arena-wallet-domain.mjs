import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Pass a local/preview origin to validate before merging; production is the default.
const origin = new URL(process.argv[2] ?? "https://docs.trenchers.ai");
assert.ok(
  origin.protocol === "https:" ||
    (origin.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)),
  "Use HTTPS, except for a local test server",
);

const expectedStatements = JSON.parse(
  await readFile(
    new URL("../public/.well-known/assetlinks.json", import.meta.url),
    "utf8",
  ),
);
const expected = expectedStatements.find(
  (statement) => statement.target?.package_name === "ai.trenchers.arena",
);
assert.ok(expected, "Local file must declare ai.trenchers.arena");

async function request(path, contentType) {
  const url = new URL(path, origin.origin);
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    200,
    `${url}: expected HTTP 200 without redirect`,
  );
  assert.match(
    response.headers.get("content-type") ?? "",
    contentType,
    `${url}: wrong content type`,
  );
  return response;
}

try {
  const response = await request(
    "/.well-known/assetlinks.json",
    /^application\/json(?:;|$)/i,
  );
  const statements = await response.json();
  assert.ok(Array.isArray(statements), "Association must be a JSON array");
  assert.ok(
    statements.some(
      (statement) =>
        statement?.target?.namespace === "android_app" &&
        statement.target.package_name === expected.target.package_name &&
        Array.isArray(statement.relation) &&
        statement.relation.includes(
          "delegate_permission/common.handle_all_urls",
        ) &&
        Array.isArray(statement.target.sha256_cert_fingerprints) &&
        expected.target.sha256_cert_fingerprints.every((fingerprint) =>
          statement.target.sha256_cert_fingerprints.includes(fingerprint),
        ),
    ),
    "Missing the expected package/signing-certificate association",
  );
  const icon = await request(
    "/icons/apple-touch-icon-180.png",
    /^image\/png(?:;|$)/i,
  );
  const bytes = Buffer.from(await icon.arrayBuffer());
  assert.ok(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "Icon must contain PNG data",
  );
  console.log(
    `Verified association and wallet icon on ${origin.origin}. Wallet approval still needs a phone test.`,
  );
} catch (error) {
  console.error(`Wallet domain verification failed: ${error.message}`);
  process.exitCode = 1;
}
