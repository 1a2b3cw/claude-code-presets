#!/usr/bin/env node

import { validateProject } from '../lib/validate.js';

try {
  await validateProject();
} catch {
  process.exit(1);
}
