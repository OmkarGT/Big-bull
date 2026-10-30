// Loads server/.env into process.env.
//
// Deliberately resolves the file relative to this module rather than using
// `import 'dotenv/config'`, which looks in the current working directory.
// `npm run dev`, `npm --prefix server start` and a host's start command do not
// all agree on cwd, and a missing .env would otherwise look like a missing
// environment variable.
//
// On Railway (or any host) server/.env does not exist - every value comes from
// the process environment instead, and this call is a no-op.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(here, '..', '..', '.env') });
