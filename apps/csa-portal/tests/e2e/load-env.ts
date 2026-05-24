/**
 * Tiny .env loader for the Playwright harness.
 *
 * Astro loads .env for the app build, but Playwright's own config +
 * global-setup run in a plain Node context that does NOT. Rather than add
 * a `dotenv` dependency, we parse the portal's .env files ourselves.
 *
 * Precedence (later wins, but we never CLOBBER an already-set process.env
 * value — real CI secrets always take priority):
 *   .env            (committed-absent local dev secrets)
 *   .env.test       (optional test-only overrides, e.g. E2E_TEST_EMAIL)
 *
 * Only `KEY=value` lines are parsed. `#` comments and blank lines are
 * skipped. Surrounding single/double quotes are stripped. No interpolation.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function parseEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    // Don't override values already present in the environment (CI secrets).
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function config(): void {
  const root = new URL('../../', import.meta.url);
  parseEnvFile(fileURLToPath(new URL('.env', root)));
  parseEnvFile(fileURLToPath(new URL('.env.test', root)));
}
