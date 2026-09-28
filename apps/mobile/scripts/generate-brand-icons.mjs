import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { jimpAsync } from '@expo/image-utils';

const mobileRoot = resolve(import.meta.dirname, '..');
const customerRoot = resolve(mobileRoot, '../customer-web/src/main/resources/static');
const red = '#E30620';
const sourcePath = resolve(mobileRoot, 'assets/brand/ryczalt-it-app-icon.png');
const source = PNG.sync.read(readFileSync(sourcePath));

async function resize(input, size) {
  const result = await jimpAsync(
    { input: PNG.sync.write(input), originalInput: sourcePath, quality: 100, format: 'image/png' },
    [{ operation: 'resize', width: size, height: size, fit: 'contain' }]
  );
  return PNG.sync.read(result);
}

function savePng(root, relative, png) {
  const path = resolve(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}

async function adaptiveForeground(size = 1024) {
  const clean = PNG.sync.read(PNG.sync.write(source));
  const count = clean.width * clean.height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  const components = [];
  const isMark = index => {
    const offset = index * 4;
    const r = clean.data[offset], g = clean.data[offset + 1], b = clean.data[offset + 2];
    return clean.data[offset + 3] > 0 && Math.min(r, g, b) > 90 && Math.max(r, g, b) - Math.min(r, g, b) < 100;
  };
  for (let index = 0; index < count; index++) {
    if (visited[index] || !isMark(index)) continue;
    let head = 0, tail = 0;
    visited[index] = 1;
    queue[tail++] = index;
    while (head < tail) {
      const current = queue[head++];
      const x = current % clean.width, y = Math.floor(current / clean.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, neighbor = yy * clean.width + xx;
        if (xx < 0 || yy < 0 || xx >= clean.width || yy >= clean.height || visited[neighbor] || !isMark(neighbor)) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    components.push(tail > 50000 ? queue.slice(0, tail) : null);
  }
  const kept = new Uint8Array(count);
  for (const component of components) if (component) for (const index of component) kept[index] = 1;
  for (let index = 0; index < count; index++) if (!kept[index]) clean.data[index * 4 + 3] = 0;
  const scaledSize = Math.round(size * 0.72);
  const scaled = await resize(clean, scaledSize);
  const result = new PNG({ width: size, height: size });
  const left = Math.floor((size - scaledSize) / 2);
  const top = Math.floor((size - scaledSize) / 2);
  for (let y = 0; y < scaledSize; y++) {
    for (let x = 0; x < scaledSize; x++) {
      const from = (y * scaledSize + x) * 4;
      const to = ((top + y) * size + left + x) * 4;
      scaled.data.copy(result.data, to, from, from + 4);
    }
  }
  return result;
}

async function maskableIcon(size = 512) {
  const foreground = await resize(await adaptiveForeground(), size);
  const result = new PNG({ width: size, height: size });
  const rgb = [227, 6, 32];
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = rgb[0]; result.data[i + 1] = rgb[1]; result.data[i + 2] = rgb[2]; result.data[i + 3] = 255;
  }
  for (let i = 0; i < result.data.length; i += 4) {
    const a = foreground.data[i + 3] / 255;
    for (let c = 0; c < 3; c++) result.data[i + c] = Math.round(foreground.data[i + c] * a + rgb[c] * (1 - a));
  }
  return result;
}

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  const payloads = images.map(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header[entry + 2] = 0;
    header[entry + 3] = 0;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
    return png;
  });
  return Buffer.concat([header, ...payloads]);
}

const iconSizes = [16, 32, 48, 180, 192, 512, 1024];
const resized = new Map(await Promise.all(iconSizes.map(async size => [size, await resize(source, size)])));
for (const [size, png] of resized) {
  if (size <= 48) {
    savePng(resolve(mobileRoot, 'public'), `favicon-${size}.png`, png);
    savePng(customerRoot, `favicon-${size}.png`, png);
  } else if (size === 180) {
    savePng(resolve(mobileRoot, 'public'), 'apple-touch-icon.png', png);
    savePng(customerRoot, 'apple-touch-icon.png', png);
  } else if (size === 192 || size === 512) {
    savePng(resolve(mobileRoot, 'public'), `pwa-${size}.png`, png);
  }
}

const adaptive = await adaptiveForeground();
savePng(resolve(mobileRoot, 'assets/brand'), 'app-icon.png', resized.get(1024));
savePng(resolve(mobileRoot, 'assets/brand'), 'adaptive-foreground.png', adaptive);
savePng(resolve(mobileRoot, 'public'), 'pwa-maskable-512.png', await maskableIcon(512));

for (const root of [resolve(mobileRoot, 'public'), customerRoot]) {
  const entries = [16, 32, 48].map(size => ({ size, png: PNG.sync.write(resized.get(size)) }));
  writeFileSync(resolve(root, 'favicon.ico'), ico(entries));
  writeFileSync(resolve(root, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><image width="48" height="48" href="/favicon-48.png"/></svg>\n');
}

console.log(`Generated Ryczałt IT icon variants from ${sourcePath} (primary red ${red}).`);
