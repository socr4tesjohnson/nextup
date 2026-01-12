const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

// Create a 50x50 purple/blue gradient PNG
const width = 50;
const height = 50;

// PNG signature
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR chunk
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(width, 0);
ihdrData.writeUInt32BE(height, 4);
ihdrData[8] = 8;  // bit depth
ihdrData[9] = 2;  // color type (RGB)
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace
const ihdr = createChunk('IHDR', ihdrData);

// Image data: purple/blue gradient
const rawData = [];
for (let y = 0; y < height; y++) {
  rawData.push(0); // filter byte
  for (let x = 0; x < width; x++) {
    const r = Math.floor(99 + (x / width) * 50);  // purple-ish
    const g = Math.floor(102 + (y / height) * 50);
    const b = Math.floor(241 - (x / width) * 50); // blue-ish
    rawData.push(r, g, b);
  }
}
const compressed = zlib.deflateSync(Buffer.from(rawData));
const idat = createChunk('IDAT', compressed);

// IEND chunk
const iend = createChunk('IEND', Buffer.alloc(0));

const png = Buffer.concat([signature, ihdr, idat, iend]);

const outputPath = path.join(__dirname, '..', 'public', 'test-avatar.png');
fs.writeFileSync(outputPath, png);
console.log('Created test PNG at:', outputPath, '- Size:', png.length, 'bytes');
