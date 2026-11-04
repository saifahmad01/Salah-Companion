import assert from 'node:assert';
import { getAppReleaseInfo, updateAppReleaseInfo } from '../src/controllers/appController.js';

console.log('--- Running App Release & Version Management Unit Tests ---');

// Mock Express req & res
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// Test 1: getAppReleaseInfo returns valid metadata
{
  const req = {};
  const res = createMockRes();
  getAppReleaseInfo(req, res);

  assert.strictEqual(res.statusCode, 200, 'Test 1: Status must be 200');
  assert.strictEqual(res.body.success, true, 'Test 1: success must be true');
  assert.ok(res.body.data.version, 'Test 1: version must exist');
  assert.ok(Array.isArray(res.body.data.releaseNotes), 'Test 1: releaseNotes must be an array');
  console.log('✓ Test 1: Public getAppReleaseInfo returns valid metadata schema');
}

// Test 2: updateAppReleaseInfo rejects invalid semver version
{
  const req = {
    body: {
      version: 'invalid-version',
      releaseNotes: ['Sample note'],
    },
  };
  const res = createMockRes();
  updateAppReleaseInfo(req, res);

  assert.strictEqual(res.statusCode, 400, 'Test 2: Status must be 400 on invalid semver');
  assert.strictEqual(res.body.success, false, 'Test 2: success must be false');
  console.log('✓ Test 2: Rejects invalid semantic version formatting');
}

// Test 3: updateAppReleaseInfo rejects non-HTTPS APK URLs
{
  const req = {
    body: {
      version: '1.2.0',
      apkDownloadUrl: 'http://insecure.example.com/app.apk',
      releaseNotes: ['Note'],
    },
  };
  const res = createMockRes();
  updateAppReleaseInfo(req, res);

  assert.strictEqual(res.statusCode, 400, 'Test 3: Status must be 400 on non-HTTPS APK');
  assert.strictEqual(res.body.success, false, 'Test 3: success must be false');
  console.log('✓ Test 3: Rejects insecure non-HTTPS APK download links');
}

// Test 4: updateAppReleaseInfo rejects non-APK URLs
{
  const req = {
    body: {
      version: '1.2.0',
      apkDownloadUrl: 'https://secure.example.com/malware.exe',
      releaseNotes: ['Note'],
    },
  };
  const res = createMockRes();
  updateAppReleaseInfo(req, res);

  assert.strictEqual(res.statusCode, 400, 'Test 4: Status must be 400 on non-.apk link');
  assert.strictEqual(res.body.success, false, 'Test 4: success must be false');
  console.log('✓ Test 4: Rejects non-.apk download URLs');
}

console.log('--- ALL App Release & Version Management Unit Tests Passed! ---');
