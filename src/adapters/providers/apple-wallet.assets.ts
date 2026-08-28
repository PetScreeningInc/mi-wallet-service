import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_DIR = join(__dirname, 'apple-assets');

// PassKit rejects a bundle without icon.png; logo.png is what the device shows on the pass.
const ASSET_FILES = ['icon.png', 'icon@2x.png', 'logo.png'];

let cached: Record<string, Buffer> | undefined;

export function loadApplePassImages(): Record<string, Buffer> {
  if (cached === undefined) {
    cached = Object.fromEntries(
      ASSET_FILES.map((name) => [name, readFileSync(join(ASSET_DIR, name))]),
    );
  }
  return cached;
}
