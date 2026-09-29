# Trenchers Arena wallet identity

The selected identity origin is **https://docs.trenchers.ai**. Serve these public files directly:

- `/.well-known/assetlinks.json`: Android Digital Asset Links association for `ai.trenchers.arena`.
- `/icons/apple-touch-icon-180.png`: wallet icon, copied unchanged from the existing public icon at `https://trenchers.ai/icons/apple-touch-icon-180.png`.

Next.js serves `public/` at the root. The existing referral proxy excludes paths containing a dot, so both assets already bypass its rewrite. No API route, DNS change, proxy edit, credentials, or database access is needed. Next.js public assets default to `Cache-Control: public, max-age=0`.

## Coordinate with the mobile change

The mobile MWA provider must use `uri: 'https://docs.trenchers.ai'` and relative `icon: 'icons/apple-touch-icon-180.png'`. Hosting this file on the docs subdomain does **not** verify an app still identifying as `https://trenchers.ai`. Authorization caches should be scoped by identity origin and network; keep the preview on Solana devnet.

Merge/deploy the website PR first, verify the public endpoints, then ship the matching mobile identity change. This PR does not deploy or merge itself. The repository's existing main-branch Vercel workflow handles deployment after merge. Vercel project-level redirects, access protection, or caching still require a live check even when the local app serves correctly.

## Temporary development certificate

The association trusts this current preview signer:

`FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`

It was checked against the local preview APK with Android SDK `apksigner verify --print-certs`. It is a **development signing certificate**, not the production signing identity. Trust it only for temporary devnet testing. Remove it after testing and replace it with the protected certificate that signs the distributed production APK before public release. Anyone with the same development key can sign the matching package. The certificate fingerprint is public; no signing key belongs in this repository.

If an association for another app is added later, retain its statement when replacing this preview fingerprint.

## Verification

With Node 22, run against the local app, a public preview, or production:

```sh
node scripts/verify-arena-wallet-domain.mjs http://127.0.0.1:3107
node scripts/verify-arena-wallet-domain.mjs https://your-preview.vercel.app
node scripts/verify-arena-wallet-domain.mjs
```

The checker requires HTTP 200 without redirects, JSON content type, the exact package/certificate association, and a valid PNG icon. HTML responses, login challenges, and redirects fail. Production defaults to `https://docs.trenchers.ai`.

After the live check passes, the owner should connect, reject, approve, disconnect, and reconnect in an MWA-compatible Android wallet. Connection testing requires no transaction. Endpoint verification alone does not prove physical wallet approval or cached wallet identity refresh.

References: [Solana Mobile identity setup](https://docs.solanamobile.com/get-started/react-native/setup), [Android website associations](https://developer.android.com/training/app-links/configure-assetlinks).
