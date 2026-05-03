/**
 * Test script for OCR service
 * 
 * Usage: npx ts-node src/tests/ocr.test.ts
 */

import { extractText, validateImage } from '../services/ocr';
import * as path from 'path';

const testImagePath = process.argv[2] || path.join(process.cwd(), 'test-image.png');

async function testOCR() {
  console.log('Testing OCR service...\n');
  console.log(`Image: ${testImagePath}`);

  try {
    // Test validation
    console.log('\n--- Testing Image Validation ---');
    const validation = await validateImage(testImagePath);
    console.log('Validation result:', validation);

    if (!validation.valid) {
      console.error('Image validation failed, skipping OCR test');
      process.exit(1);
    }

    // Test OCR extraction
    console.log('\n--- Testing OCR Extraction ---');
    const result = await extractText(testImagePath, {
      language: 'eng',
      preprocessing: true,
      includeBlocks: false,
    });

    console.log('\nOCR Result:');
    console.log('------------');
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Language: ${result.language}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log('\nExtracted Text:');
    console.log(result.text || '(empty)');

    if (result.blocks && result.blocks.length > 0) {
      console.log(`\nText Blocks: ${result.blocks.length}`);
      result.blocks.slice(0, 3).forEach((block, i) => {
        console.log(`  Block ${i + 1}: "${block.text.slice(0, 50)}${block.text.length > 50 ? '...' : ''}" (confidence: ${block.confidence}%)`);
      });
    }

    console.log('\n✅ OCR test completed successfully!');
  } catch (error) {
    console.error('\n❌ OCR test failed:', error);
    process.exit(1);
  }
}

testOCR();
