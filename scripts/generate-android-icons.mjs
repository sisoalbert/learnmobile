import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const imagesDirectory = join(projectRoot, 'assets/images');
const androidResources = join(projectRoot, 'android/app/src/main/res');
const rexSvg = join(projectRoot, 'assets/expo.icon/Assets/expo-symbol 2.svg');
const legacyIcon = join(imagesDirectory, 'icon.png');
const backgroundImage = join(imagesDirectory, 'android-icon-background.png');
const foregroundImage = join(imagesDirectory, 'android-icon-foreground.png');
const monochromeImage = join(imagesDirectory, 'android-icon-monochrome.png');

const densities = {
  mdpi: { legacy: 48, adaptive: 108 },
  hdpi: { legacy: 72, adaptive: 162 },
  xhdpi: { legacy: 96, adaptive: 216 },
  xxhdpi: { legacy: 144, adaptive: 324 },
  xxxhdpi: { legacy: 192, adaptive: 432 },
};

async function createForeground() {
  const rex = await sharp(rexSvg)
    .resize({ width: 300, height: 300, fit: 'contain' })
    .png()
    .toBuffer();

  return sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: rex, left: 106, top: 106 }])
    .png()
    .toBuffer();
}

async function createMonochrome(foreground) {
  const { data, info } = await sharp(foreground)
    .resize(432, 432)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let offset = 0; offset < data.length; offset += 4) {
    const sourceAlpha = data[offset + 3];
    if (sourceAlpha === 0) continue;

    const luminance = (0.2126 * data[offset]) + (0.7152 * data[offset + 1]) + (0.0722 * data[offset + 2]);
    const detailAlpha = luminance <= 55 ? 0 : luminance >= 230 ? 255 : 205;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = Math.round((sourceAlpha * detailAlpha) / 255);
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

function circleMask(size) {
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
}

async function writeWebp(buffer, path, size) {
  await sharp(buffer).resize(size, size).webp({ lossless: true }).toFile(path);
}

async function main() {
  const foreground = await createForeground();
  const monochrome = await createMonochrome(foreground);
  const legacy = await sharp(legacyIcon).png().toBuffer();
  const background = await sharp(backgroundImage).png().toBuffer();

  await sharp(foreground).png().toFile(foregroundImage);
  await sharp(monochrome).png().toFile(monochromeImage);

  for (const [density, sizes] of Object.entries(densities)) {
    const destination = join(androidResources, `mipmap-${density}`);
    await mkdir(destination, { recursive: true });

    await writeWebp(legacy, join(destination, 'ic_launcher.webp'), sizes.legacy);
    await sharp(legacy)
      .resize(sizes.legacy, sizes.legacy)
      .composite([{ input: circleMask(sizes.legacy), blend: 'dest-in' }])
      .webp({ lossless: true })
      .toFile(join(destination, 'ic_launcher_round.webp'));
    await writeWebp(background, join(destination, 'ic_launcher_background.webp'), sizes.adaptive);
    await writeWebp(foreground, join(destination, 'ic_launcher_foreground.webp'), sizes.adaptive);
    await writeWebp(monochrome, join(destination, 'ic_launcher_monochrome.webp'), sizes.adaptive);
  }
}

await main();
