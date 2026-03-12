const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const resourcesDir = path.join(__dirname, '..', 'resources');

async function generateIcons() {
  console.log('🎨 Generating icons...\n');

  // Read SVG
  const svgPath = path.join(resourcesDir, 'icon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('❌ icon.svg not found');
    process.exit(1);
  }

  // Generate PNGs for each size
  for (const size of sizes) {
    const outputPath = path.join(resourcesDir, `icon-${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${size}x${size}: ${outputPath}`);
  }

  // Generate main icon (512x512 for electron-builder)
  const mainIconPath = path.join(resourcesDir, 'icon.png');
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(mainIconPath);
  console.log(`✅ Generated main icon: ${mainIconPath}`);

  // Generate 1024x1024 for macOS iconset
  const icon1024Path = path.join(resourcesDir, 'icon-1024.png');
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(icon1024Path);
  console.log(`✅ Generated 1024x1024: ${icon1024Path}`);

  console.log('\n🎉 Icon generation complete!');
}

generateIcons().catch(console.error);
