/* eslint-disable */
/**
 * Convert resources/icon.svg + splash.svg into the PNG sources that
 * @capacitor/assets expects, then invoke the assets CLI to generate
 * every iOS / Android resolution.
 *
 * Run with: npm run assets
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, 'assets');
mkdirSync(out, { recursive: true });

async function svgToPng(svgPath, pngPath, size, background = null) {
  const svg = readFileSync(svgPath);
  let img = sharp(svg, { density: 384 }).resize(size, size, { fit: 'cover' });
  if (background) img = img.flatten({ background });
  await img.png().toFile(pngPath);
  console.log(`  ✓ ${pngPath} (${size}x${size})`);
}

console.log('Converting SVG sources to PNG…');
// iOS / legacy Android launchers use the full square icon (with background).
await svgToPng(resolve(root, 'resources/icon.svg'), resolve(out, 'icon-only.png'), 1024);
// Android adaptive-icon foreground is a separate transparent SVG so the
// system background layer can show through and the launcher's mask works
// correctly. Falls back to icon.svg if the dedicated foreground is missing.
const fgSvg = resolve(root, 'resources/icon-foreground.svg');
const fgSource = existsSync(fgSvg) ? fgSvg : resolve(root, 'resources/icon.svg');
await svgToPng(fgSource, resolve(out, 'icon-foreground.png'), 1024);
// Solid brand background used by Android adaptive icons.
await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 3,
    background: '#0084e0'
  }
})
  .png()
  .toFile(resolve(out, 'icon-background.png'));
console.log(`  ✓ ${resolve(out, 'icon-background.png')} (1024x1024)`);

await svgToPng(resolve(root, 'resources/splash.svg'), resolve(out, 'splash.png'), 2732);
await svgToPng(
  resolve(root, 'resources/splash.svg'),
  resolve(out, 'splash-dark.png'),
  2732
);

console.log('\nGenerating Capacitor native assets…');
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['capacitor-assets', 'generate'],
  { stdio: 'inherit', cwd: root }
);
process.exit(result.status ?? 0);
