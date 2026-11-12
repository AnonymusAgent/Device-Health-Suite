import sharp from 'sharp';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
const mark = await readFile(new URL('../assets/veylo-mark.svg', import.meta.url));
const pulse = await readFile(new URL('../assets/veylo-pulse.svg', import.meta.url));
const whitePulse = Buffer.from(pulse.toString().replaceAll('#DCF6BA', '#FFFFFF'));
for (const [name, size] of [['icon', 1024], ['splash-icon', 512], ['favicon', 64], ['android-icon-background', 1024]]) {
  const source = name === 'android-icon-background' ? Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#11685B"/></svg>') : name === 'splash-icon' ? pulse : mark;
  await sharp(source).resize(size, size).png().toFile(new URL(`../assets/images/${name}.png`, import.meta.url).pathname);
}
// Keep the foreground inside the adaptive icon's safe zone.
await sharp(whitePulse).resize(640, 640).extend({ top: 192, bottom: 192, left: 192, right: 192, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(new URL('../assets/images/android-icon-foreground.png', import.meta.url).pathname);
await sharp(whitePulse).resize(640, 640).extend({ top: 192, bottom: 192, left: 192, right: 192, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(new URL('../assets/images/android-icon-monochrome.png', import.meta.url).pathname);
console.log('Veylo icon assets generated from the original vector mark.');
