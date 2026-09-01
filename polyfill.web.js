// polyfill.web.js — web-only polyfills.
//
// The native patches (get-random-values, quick-crypto, URL polyfill,
// craftzdog Buffer + prototype patches) live in polyfill.js and are NOT
// loaded on web — Metro resolves this file instead when platform === 'web'.
//
// Browsers already provide crypto.getRandomValues, crypto.subtle, URL and
// URLSearchParams. The only gap for the Solana SDKs is Buffer.
import { Buffer } from 'buffer'

global.Buffer = Buffer
