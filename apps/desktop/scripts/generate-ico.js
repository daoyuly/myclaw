const pngToIco = require('png-to-ico').default;
const path = require('path');
const fs = require('fs');

const resourcesDir = path.join(__dirname, '..', 'resources');

async function generateIco() {
  console.log('🎨 Generating Windows .ico file...\n');

  // Use multiple sizes for better quality (using available sizes)
  const sizes = [16, 32, 64, 128, 256];
  const pngBuffers = sizes.map(size => 
    fs.readFileSync(path.join(resourcesDir, `icon-${size}.png`))
  );

  // Generate ICO
  const icoBuffer = await pngToIco(pngBuffers);
  
  // Write ICO file
  const icoPath = path.join(resourcesDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  
  console.log(`✅ Created icon.ico (${icoBuffer.length} bytes)`);
  console.log('\n🎉 Windows icon generation complete!');
}

generateIco().catch(console.error);
