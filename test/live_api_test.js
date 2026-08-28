const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const https = require('https');

const scriptablePath = path.resolve(__dirname, '../Fear & Greed Widget.scriptable');
const rawContent = fs.readFileSync(scriptablePath, 'utf8');
const scriptableJson = JSON.parse(rawContent);

class MockColor {
  constructor(hex) { this.hex = hex; }
  static white() { return new MockColor('#FFFFFF'); }
  static gray() { return new MockColor('#8E8E93'); }
}

class MockFont {
  constructor(name, size) { this.name = name; this.size = size; }
  static boldSystemFont(size) { return new MockFont('boldSystem', size); }
  static systemFont(size) { return new MockFont('system', size); }
}

class MockWidgetElement {
  constructor(type, text = '') {
    this.type = type;
    this.text = text;
    this.children = [];
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
  topAlignContent() {}
  layoutVertically() {}
  centerAlignText() {}
}

class MockListWidget extends MockWidgetElement {
  constructor() {
    super('ListWidget');
    this.backgroundColor = null;
    this.refreshAfterDate = null;
  }
  presentSmall() {}
}

class MockFileManager {
  constructor() { this.storage = new Map(); }
  documentsDirectory() { return '/mock/documents'; }
  joinPath(dir, file) { return `${dir}/${file}`; }
  fileExists(path) { return this.storage.has(path); }
  readString(path) { return this.storage.get(path); }
  writeString(path, content) { this.storage.set(path, content); }
  static localInstance = new MockFileManager();
  static local() { return MockFileManager.localInstance; }
}

class MockRequest {
  constructor(url) {
    this.url = url;
    this.method = 'GET';
    this.headers = {};
    this.timeoutInterval = 30;
  }
  async loadJSON() {
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

async function runLiveTest() {
  console.log('=== Live CNN API Widget Execution Test ===\n');

  let finishedWidget = null;
  let isComplete = false;

  const sandbox = {
    Color: MockColor,
    Font: MockFont,
    ListWidget: MockListWidget,
    FileManager: MockFileManager,
    Request: MockRequest,
    config: { runsInWidget: true },
    Script: {
      setWidget(w) { finishedWidget = w; },
      complete() { isComplete = true; }
    },
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };

  const context = vm.createContext(sandbox);
  const scriptCode = `(async () => {\n${scriptableJson.script}\n})()`;
  
  await vm.runInContext(scriptCode, context);

  assert(isComplete, 'Script.complete() should be called');
  assert(finishedWidget, 'Finished widget should be defined');
  console.log('\n✓ Live API Integration Test passed successfully!');
}

runLiveTest().catch(e => {
  console.error('Live Test Failed:', e);
  process.exit(1);
});
