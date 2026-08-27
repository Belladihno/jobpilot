import * as dotenv from 'dotenv';
import * as path from 'path';

// Load backend/.env regardless of cwd (CLI vs VS Code extension from repo root)
const candidates = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const p of candidates) {
  dotenv.config({ path: p, quiet: true });
}
