import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as tomlLoad } from 'js-toml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configTomlPath = join(__dirname, '..', 'config.toml');

if (!existsSync(configTomlPath)) {
  console.error(`[${(new Date()).toLocaleString()}] config.toml not found at ${configTomlPath}`);
  process.exit(1);
}

const configRaw = readFileSync(configTomlPath, 'utf8');
export const CONFIG = tomlLoad(configRaw);

console.log(`[${(new Date()).toLocaleString()}] Loaded config.toml.`);