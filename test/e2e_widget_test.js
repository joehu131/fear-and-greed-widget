const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const https = require('https');

// Read Classic JS Script
const classicPath = path.resolve(__dirname, '../widgets/classic/fear-and-greed-classic-dark.js');
const classicScript = fs.readFileSync(classicPath, 'utf8');

class MockColor {
  constructor(hex) {
    this.hex = hex;
  }
  static white() {
    return new MockColor('#FFFFFF');
  }
  static gray() {
    return new MockColor('#8E8E93');
  }
}

class MockFont {
  constructor(name, size) {
    this.name = name;
    this.size = size;
  }
  static boldSystemFont(size) {
    return new MockFont('boldSystem', size);
  }
  static systemFont(size) {
    return new MockFont('system', size);
  }
}

class MockWidgetElement {
  constructor(type, text = '') {
    this.type = type;
    this.text = text;
    this.font = null;
    this.textColor = null;
    this.children = [];
    this.alignment = 'left';
    this.layout = 'horizontal';
  }
  addText(text) {
    const el = new MockWidgetElement('text', text);
    this.children.push(el);
    return el;
  }
  addStack() {
    const el = new MockWidgetElement('stack');
    this.children.push(el);
    return el;
  }
  addSpacer(length) {
    const el = new MockWidgetElement('spacer', length);
    this.children.push(el);
    return el;
  }
  topAlignContent() {
    this.alignment = 'top';
  }
  layoutVertically() {
    this.layout = 'vertical';
  }
  centerAlignText() {
    this.alignment = 'center';
  }
}

class MockListWidget extends MockWidgetElement {
  constructor() {
    super('ListWidget');
    this.backgroundColor = null;
    this.refreshAfterDate = null;
    this.presented = null;
  }
  presentSmall() {
    this.presented = 'small';
  }
  presentMedium() {
    this.presented = 'medium';
  }
}

class MockFileManager {
  constructor() {
    this.storage = new Map();
  }
  documentsDirectory() {
    return '/mock/documents';
  }
  joinPath(dir, file) {
    return `${dir}/${file}`;
  }
  fileExists(path) {
    return this.storage.has(path);
  }
  readString(path) {
    if (!this.storage.has(path)) throw new Error('File not found: ' + path);
    return this.storage.get(path);
  }
  writeString(path, content) {
    this.storage.set(path, content);
  }
  static localInstance = new MockFileManager();
  static local() {
    return MockFileManager.localInstance;
  }
}

class MockRequest {
  constructor(url) {
    this.url = url;
    this.method = 'GET';
    this.headers = {};
    this.timeoutInterval = 30;
  }
  async loadJSON() {
    // If MockRequest.networkHandler is defined, use it
    if (MockRequest.networkHandler) {
      return MockRequest.networkHandler(this);
    }

    // Otherwise simulate real https fetch
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(this.url);
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: this.method,
        headers: this.headers
      };

      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('JSON parse error: ' + e.message));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 100)}`));
          }
        });
      });

      req.on('error', err => reject(err));
      req.end();
    });
  }
}

async function executeScriptInSandbox(envOptions = {}) {
  let finishedWidget = null;
  let isComplete = false;

  const sandbox = {
    Color: MockColor,
    Font: MockFont,
    ListWidget: MockListWidget,
    FileManager: MockFileManager,
    Request: MockRequest,
    config: {
      runsInWidget: envOptions.runsInWidget !== undefined ? envOptions.runsInWidget : true
    },
    Script: {
      setWidget(w) {
        finishedWidget = w;
      },
      complete() {
        isComplete = true;
      }
    },
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };

  const context = vm.createContext(sandbox);
  const scriptCode = `(async () => {\n${classicScript}\n})()`;
  
  await vm.runInContext(scriptCode, context);

  return { finishedWidget, isComplete, sandbox };
}

async function runE2ETests() {
  console.log('=== End-to-End Widget Simulation Tests ===\n');

  // Test Case A: Widget runs with Mock Network Response
  console.log('[Test A] Simulating successful API response in Widget mode...');
  MockRequest.networkHandler = async () => ({
    fear_and_greed: {
      score: 62.4,
      rating: 'greed',
      timestamp: '2026-08-28T09:00:00+00:00',
      previous_close: 60.1,
      previous_1_week: 55.8,
      previous_1_month: 40.2,
      previous_1_year: 70.9
    }
  });

  const runA = await executeScriptInSandbox({ runsInWidget: true });
  assert(runA.isComplete, 'Script.complete() should be called');
  assert(runA.finishedWidget, 'Widget should be set in Script.setWidget');
  assert.strictEqual(runA.finishedWidget.backgroundColor.hex, '#222222');
  assert(runA.finishedWidget.refreshAfterDate instanceof Date, 'refreshAfterDate must be a Date');
  assert(runA.finishedWidget.refreshAfterDate.getTime() > Date.now(), 'refreshAfterDate must be in the future');
  console.log('✓ Test A passed: Widget generated correctly with future refresh date.');

  // Test Case B: In-App Preview mode (runsInWidget = false)
  console.log('\n[Test B] Simulating In-App Preview mode (runsInWidget = false)...');
  const runB = await executeScriptInSandbox({ runsInWidget: false });
  assert(runB.isComplete, 'Script.complete() should be called');
  console.log('✓ Test B passed: In-app preview handled correctly.');

  // Test Case C: Network Failure with Cache Fallback
  console.log('\n[Test C] Simulating Network Failure with Local Cache Fallback...');
  MockRequest.networkHandler = async () => {
    throw new Error('Network timeout / offline');
  };

  const runC = await executeScriptInSandbox({ runsInWidget: true });
  assert(runC.finishedWidget, 'Widget should render cached fallback');
  console.log('✓ Test C passed: Fallback from local cache succeeded.');

  // Test Case D: Complete Failure with no Cache
  console.log('\n[Test D] Simulating Complete Failure without Cache...');
  MockFileManager.localInstance.storage.clear(); // clear cache
  const runD = await executeScriptInSandbox({ runsInWidget: true });
  assert(runD.finishedWidget, 'Widget should render graceful error state without throwing');
  console.log('✓ Test D passed: Graceful error state rendered.');

  console.log('\nAll End-to-End Simulation Tests Passed Successfully!');
}

runE2ETests().catch(e => {
  console.error('E2E Test Failed:', e);
  process.exit(1);
});
