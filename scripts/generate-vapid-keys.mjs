#!/usr/bin/env node
// Generate the VAPID key pair used by Web Push (RFC 8292).
//
// Output format matches what @block65/webcrypto-web-push expects:
//   - VAPID_PUBLIC_KEY: the 65-byte uncompressed P-256 point, base64url
//   - VAPID_PRIVATE_KEY: the 32-byte private scalar, base64url
//
// The public key is exposed to browsers (it is not a secret); the private key
// must only live in the Worker environment:
//   npx wrangler secret put VAPID_PRIVATE_KEY

import { generateKeyPairSync } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

const spki = publicKey.export({ format: 'der', type: 'spki' });

// SPKI ends with the SEC1 uncompressed point: 0x04 || X (32 bytes) || Y (32 bytes).
const point = spki.subarray(spki.length - 65);
if (point[0] !== 0x04) {
  throw new Error('Unexpected EC public key encoding');
}

// The JWK export already gives the raw 32-byte private scalar as base64url.
// Slicing the PKCS#8 DER instead would be wrong: the scalar is followed by
// optional public-key fields, so "the last 32 bytes" is not the scalar.
const { d: scalar } = privateKey.export({ format: 'jwk' });
if (!scalar) {
  throw new Error('Could not export the private scalar');
}

console.log('# Add VAPID_PUBLIC_KEY to your build environment and the client build.');
console.log('# Add both keys to the Worker environment (wrangler secret put ...).');
console.log(`VAPID_PUBLIC_KEY=${point.toString('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${scalar}`);
console.log('VAPID_SUBJECT=mailto:contact@your-domain.example');
