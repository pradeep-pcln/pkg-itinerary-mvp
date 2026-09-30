# Priceline Internal TLS Certificates

Priceline's internal services (gRPC, APIs running on `.dqs.pcln.com` or `.pcln.com` hosts) use certificates signed by Priceline's internal CA — not a public CA like DigiCert or Let's Encrypt. Node.js doesn't trust these by default, so any TLS connection to an internal host will fail with:

```
SELF_SIGNED_CERT_IN_CHAIN
```

The fix is to bundle the Priceline internal CA chain with the app and pass it to the TLS client explicitly.

**When scaffolding a new vibe-coded application, always download fresh certs as part of setup** — before writing any code that connects to an internal service.

---

## Source of Truth

The full Priceline CA bundle (122 certs, includes all internal and third-party CAs) is available at:

```
https://cacert.prod.pcln.com/pcln_cacert_automate/DownloadCertificate?format=CER
```

This is the authoritative source. Re-download from here if certs expire or are rotated.

The two certs needed for internal services are already extracted and committed at:

```
certs/pcln-internal-ca.pem
```

This file contains:
- **Priceline Root CA 2** — the root that anchors all internal Priceline certs
- **NW-CA-204-CA** — the intermediate CA that signs QA/DQS service certificates

---

## Using the Cert in a Node.js gRPC Client

Pass the cert bundle as `rootCerts` when creating SSL credentials:

```js
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PCLN_CA_CERT = readFileSync(join(__dirname, 'certs', 'pcln-internal-ca.pem'))

// Pass as rootCerts — grpc-js will trust this chain instead of (or in addition to) system CAs
const sslCreds = grpc.credentials.createSsl(PCLN_CA_CERT)
const client = new MyService(host, sslCreds)
```

---

## Copying Certs Into the Build

The cert file lives at `certs/pcln-internal-ca.pem` in the repo root. It must be copied to `dist/` so the container can find it at runtime. Add it to the `build-deps` script in `package.json`:

```json
"build-deps": "cp server.js dist/ && cp -r node_modules dist/ && cp -r proto dist/ && cp -r certs dist/"
```

After running `npm run build && npm run build-deps`, the cert will be at `dist/certs/pcln-internal-ca.pem`, which is where `server.js` expects it.

---

## Refreshing the Cert Bundle

If certs expire or a new intermediate CA is introduced:

1. Download the fresh bundle:
   ```bash
   curl -sk "https://cacert.prod.pcln.com/pcln_cacert_automate/DownloadCertificate?format=CER" -o /tmp/pcln-ca.cer
   ```

2. Extract the Priceline Root CA 2 and NW-CA-204-CA certs from the bundle:
   ```bash
   python3 -c "
   import re, subprocess
   with open('/tmp/pcln-ca.cer') as f:
       content = f.read()
   certs = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', content, re.DOTALL)
   for i, cert in enumerate(certs):
       r = subprocess.run(['openssl','x509','-noout','-subject'], input=cert, capture_output=True, text=True)
       if 'priceline' in r.stdout.lower() or 'pcln' in r.stdout.lower():
           print(f'[{i}] {r.stdout.strip()}')
   "
   ```

3. Update `certs/pcln-internal-ca.pem` with the new certs (Root CA 2 first, intermediate second).

4. Test locally, then commit and push.

---

## What NOT to Do

- **Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`** — grpc-js has its own TLS stack and ignores this env var. It also disables all TLS verification globally, which is a security risk even in QA.
- **Do not use `grpc.credentials.createInsecure()`** — internal services require TLS; insecure connections will be rejected.
