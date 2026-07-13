import { execSync } from 'node:child_process';
import dns from 'node:dns/promises';
import { setServers } from 'node:dns';
import mongoose from 'mongoose';
import { config } from './index';

/**
 * ─────────────────────────────────────────────────────────────
 *  MongoDB Connection with Multi-Layer SRV Fallback
 * ─────────────────────────────────────────────────────────────
 *
 * PROBLEM: Node.js on some Windows machines cannot resolve
 * `mongodb+srv://` SRV records (`querySrv ECONNREFUSED`) due
 * to c-ares DNS resolver incompatibility.
 *
 * SOLUTION: Three-layer fallback chain:
 *   1. dns.setServers() → mongoose.connect() with SRV URI
 *   2. Manual dns.resolveSrv() → direct replica-set URI
 *   3. nslookup shell command → direct replica-set URI
 *
 * Layer 3 works because `nslookup` uses the Windows system DNS
 * resolver which handles SRV records correctly.
 */

// ─── Helpers ────────────────────────────────────────────────

/** Parse credentials and base hostname from a `mongodb+srv://` URI */
function parseSrvUri(srvUri: string): { credentials: string; baseHostname: string; queryParams: string } | null {
  try {
    const url = new URL(srvUri.replace('mongodb+srv://', 'mongodb://'));
    const credentials = url.password
      ? `${url.username}:${url.password}`
      : url.username;
    return {
      credentials,
      baseHostname: url.hostname,
      queryParams: url.search,
    };
  } catch {
    return null;
  }
}

/** Build a replica-set `mongodb://` URI from an array of host:port strings */
function buildReplicaSetUri(
  credentials: string,
  hosts: string[],
  originalQueryParams: string,
): string {
  const params = new URLSearchParams(originalQueryParams);
  if (!params.has('ssl')) params.set('ssl', 'true');
  if (!params.has('authSource')) params.set('authSource', 'admin');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');
  return `mongodb://${credentials}@${hosts.join(',')}/?${params.toString()}`;
}

/**
 * Layer 2: Resolve SRV records via Node.js `dns.resolveSrv()`.
 * Requires `setServers()` to have been called first.
 */
async function resolveViaNodeDns(srvUri: string): Promise<string | null> {
  const parsed = parseSrvUri(srvUri);
  if (!parsed) return null;
  try {
    const records = await dns.resolveSrv(`_mongodb._tcp.${parsed.baseHostname}`);
    if (records.length === 0) return null;
    records.sort((a, b) => a.priority - b.priority || b.weight - a.weight);
    const hosts = records.map(r => `${r.name}:${r.port}`);
    return buildReplicaSetUri(parsed.credentials, hosts, parsed.queryParams);
  } catch {
    return null;
  }
}

/**
 * Layer 3: Resolve SRV records via `nslookup` shell command.
 * This is the ultimate fallback — works on Windows when
 * Node.js's native DNS resolver cannot handle SRV lookups.
 */
async function resolveViaNslookup(srvUri: string): Promise<string | null> {
  const parsed = parseSrvUri(srvUri);
  if (!parsed) return null;
  try {
    const output = execSync(
      `nslookup -querytype=SRV _mongodb._tcp.${parsed.baseHostname}`,
      { timeout: 5000, encoding: 'utf-8' },
    );
    // Parse nslookup output for SRV records
    // Format: "svr hostname   = ac-xxxx-shard-00-00.xxxx.mongodb.net"
    const hosts: string[] = [];
    const srvLineRegex = /svr hostname\s*=\s*(\S+)/gi;
    let match;
    while ((match = srvLineRegex.exec(output)) !== null) {
      const hostname = match[1].trim();
      if (!hosts.includes(hostname)) {
        hosts.push(`${hostname}:27017`);
      }
    }
    if (hosts.length === 0) return null;
    return buildReplicaSetUri(parsed.credentials, hosts, parsed.queryParams);
  } catch {
    return null;
  }
}

/**
 * Attempt to connect with a given URI.
 * Returns `true` on success, `false` on failure.
 */
async function tryConnect(uri: string, dbName: string, label: string): Promise<boolean> {
  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
    });
    console.log(`✅ MongoDB connected${label} — database: "${dbName}"`);
    return true;
  } catch {
    return false;
  }
}

// ─── Main Connection Function ───────────────────────────────

export async function connectDatabase(): Promise<void> {
  if (!config.mongodb.uri) {
    console.warn('⚠️  MONGODB_URI not set — skipping database connection.');
    return;
  }

  // Step 0: Force Node.js to use public DNS servers
  // This fixes SRV lookups on many systems (but not all Windows configs)
  setServers(['1.1.1.1', '8.8.8.8']);

  const isSrvUri = config.mongodb.uri.startsWith('mongodb+srv://');

  // ── Layer 1: Standard SRV connection ──────────────────
  if (await tryConnect(config.mongodb.uri, config.mongodb.dbName, '')) return;
  console.warn('⚠️  Layer 1 (SRV) failed — trying Layer 2 (Node DNS resolve)...');

  // ── Layer 2: Manual SRV resolve via Node dns ──────────
  if (isSrvUri) {
    const directUri = await resolveViaNodeDns(config.mongodb.uri);
    if (directUri && (await tryConnect(directUri, config.mongodb.dbName, ' via Node DNS'))) return;
    console.warn('⚠️  Layer 2 (Node DNS) failed — trying Layer 3 (nslookup)...');
  }

  // ── Layer 3: SRV resolve via nslookup shell command ───
  if (isSrvUri) {
    const directUri = await resolveViaNslookup(config.mongodb.uri);
    if (directUri && (await tryConnect(directUri, config.mongodb.dbName, ' via nslookup'))) return;
    console.error('❌ Layer 3 (nslookup) also failed.');
  }

  console.warn('⚠️  All connection methods failed.');
  console.warn('⚠️  Server will continue without a database — orders will NOT persist.');
}

// ─── Event Listeners ────────────────────────────────────────

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected gracefully');
  }
}
