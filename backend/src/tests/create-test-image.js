const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a canvas with text
const width = 800;
const height = 200;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, width, height);

// Add text
ctx.fillStyle = 'black';
ctx.font = 'bold 48px Arial';
ctx.textBaseline = 'middle';
ctx.fillText('Hello OCR World! Testing 123', 50, height / 2);

// Save the image
const buffer = canvas.toPNG();
const outputPath = path.join(__dirname, '..', '..', 'test-ocr.png');
fs.writeFileSync(outputPath, buffer);

console.log(`Created test image: ${outputPath}`);
