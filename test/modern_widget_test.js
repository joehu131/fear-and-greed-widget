const assert = require('assert');
const vm = require('vm');
const path = require('path');
const fs = require('fs');

// Read Modern JS Script
const jsPath = path.resolve(__dirname, '../Fear & Greed Modern.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Mock Scriptable Classes for Modern Widget
class MockColor {
  constructor(hex, alpha = 1) {
    this.hex = hex;
    this.alpha = alpha;
  }
  static white() { return new MockColor('#FFFFFF'); }
  static black() { return new MockColor('#000000'); }
  static gray() { return new MockColor('#8E8E93'); }
  static clear() { return new MockColor('#000000', 0); }
  static dynamic(lightColor, darkColor) { return darkColor; }
}

class MockLinearGradient {
  constructor() {
    this.colors = [];
    this.locations = [];
    this.startPoint = { x: 0, y: 0 };
    this.endPoint = { x: 0, y: 1 };
  }
}

class MockFont {
  constructor(name, size) {
    this.name = name;
    this.size = size;
  }
  static boldSystemFont(size) { return new MockFont('boldSystem', size); }
  static semiboldSystemFont(size) { return new MockFont('semiboldSystem', size); }
  static mediumSystemFont(size) { return new MockFont('mediumSystem', size); }
  static systemFont(size) { return new MockFont('system', size); }
  static heavySystemFont(size) { return new MockFont('heavySystem', size); }
}

class MockPoint {
  constructor(x, y) { this.x = x; this.y = y; }
}

class MockSize {
  constructor(width, height) { this.width = width; this.height = height; }
}

class MockRect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class MockPath {
  constructor() {
    this.elements = [];
  }
  addRect(rect) { this.elements.push({ type: 'rect', rect }); }
  addRoundedRect(rect, cornerWidth, cornerHeight) {
    this.elements.push({ type: 'roundedRect', rect, cornerWidth, cornerHeight });
  }
  addEllipse(rect) { this.elements.push({ type: 'ellipse', rect }); }
}

class MockImage {
  constructor(info = {}) {
    this.info = info;
  }
}

class MockDrawContext {
  constructor() {
    this.size = new MockSize(0, 0);
    this.opaque = false;
    this.respectScreenScale = true;
    this.fillColor = null;
    this.strokeColor = null;
    this.paths = [];
  }
  addPath(path) { this.paths.push(path); }
  setFillColor(color) { this.fillColor = color; }
  setStrokeColor(color) { this.strokeColor = color; }
  fillPath() {}
  strokePath() {}
  getImage() {
    return new MockImage({ size: this.size, pathsCount: this.paths.length });
  }
}

class MockWidgetElement {
  constructor(type, text = '') {
    this.type = type;
    this.text = text;
    this.font = null;
    this.textColor = null;
    this.backgroundColor = null;
    this.cornerRadius = 0;
    this.borderWidth = 0;
    this.borderColor = null;
    this.children = [];
    this.alignment = 'left';
    this.layout = 'horizontal';
    this.image = null;
    this.imageSize = null;
    this.tintColor = null;
    this.padding = null;
    this.spacing = 0;
    this.url = null;
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
  addImage(image) {
    const el = new MockWidgetElement('image');
    el.image = image;
    this.children.push(el);
    return el;
  }
  addSpacer(length) {
    const el = new MockWidgetElement('spacer', length);
    this.children.push(el);
    return el;
  }
  topAlignContent() { this.alignment = 'top'; }
  centerAlignContent() { this.alignment = 'center'; }
  bottomAlignContent() { this.alignment = 'bottom'; }
  layoutVertically() { this.layout = 'vertical'; }
  layoutHorizontally() { this.layout = 'horizontal'; }
  centerAlignText() { this.alignment = 'center'; }
  rightAlignText() { this.alignment = 'right'; }
  setPadding(top, leading, bottom, trailing) {
    this.padding = { top, leading, bottom, trailing };
  }
}

class MockListWidget extends MockWidgetElement {
  constructor() {
    super('ListWidget');
    this.backgroundGradient = null;
    this.refreshAfterDate = null;
  }
  presentSmall() { this.presented = 'small'; }
  presentMedium() { this.presented = 'medium'; }
  presentLarge() { this.presented = 'large'; }
}

class MockFileManager {
  constructor() { this.storage = new Map(); }
  documentsDirectory() { return '/mock/docs'; }
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
    this.timeoutInterval = 10;
  }
  async loadJSON() {
    return {
      fear_and_greed: {
        score: 57.7428571428571,
        rating: 'greed',
        timestamp: '2026-08-28T08:40:16+00:00',
        previous_close: 58.1714285714286,
        previous_1_week: 54.5142857142857,
        previous_1_month: 37.8857142857143,
        previous_1_year: 64.42857142857143
      }
    };
  }
}

async function runModernTests() {
  console.log('=== Testing Modern Fear & Greed Widget ===\n');

  // Test 1: Small Widget Execution
  console.log('[Test 1] Small Widget Layout...');
  let smallWidget = null;
  let smallComplete = false;

  const smallSandbox = {
    Color: MockColor,
    LinearGradient: MockLinearGradient,
    Font: MockFont,
    Point: MockPoint,
    Size: MockSize,
    Rect: MockRect,
    Path: MockPath,
    DrawContext: MockDrawContext,
    ListWidget: MockListWidget,
    FileManager: MockFileManager,
    Request: MockRequest,
    config: { runsInWidget: true, widgetFamily: 'small' },
    Script: {
      setWidget(w) { smallWidget = w; },
      complete() { smallComplete = true; }
    },
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };

  const contextA = vm.createContext(smallSandbox);
  await vm.runInContext(`(async () => {\n${jsContent}\n})()`, contextA);

  assert(smallComplete, 'Script.complete() should be invoked');
  assert(smallWidget, 'smallWidget must be created');
  assert(smallWidget.backgroundGradient, 'Widget must have background gradient');
  assert.strictEqual(smallWidget.url, 'https://www.cnn.com/markets/fear-and-greed');
  console.log('✓ Small Widget Test passed.');

  // Test 2: Medium Widget Execution
  console.log('\n[Test 2] Medium Widget Layout...');
  let mediumWidget = null;
  let mediumComplete = false;

  const mediumSandbox = {
    Color: MockColor,
    LinearGradient: MockLinearGradient,
    Font: MockFont,
    Point: MockPoint,
    Size: MockSize,
    Rect: MockRect,
    Path: MockPath,
    DrawContext: MockDrawContext,
    ListWidget: MockListWidget,
    FileManager: MockFileManager,
    Request: MockRequest,
    config: { runsInWidget: true, widgetFamily: 'medium' },
    Script: {
      setWidget(w) { mediumWidget = w; },
      complete() { mediumComplete = true; }
    },
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };

  const contextB = vm.createContext(mediumSandbox);
  await vm.runInContext(`(async () => {\n${jsContent}\n})()`, contextB);

  assert(mediumComplete, 'Script.complete() should be invoked');
  assert(mediumWidget, 'mediumWidget must be created');
  console.log('✓ Medium Widget Test passed.');

  console.log('\nAll Modern Widget tests passed successfully!');
}

runModernTests().catch(e => {
  console.error('Modern Test Failed:', e);
  process.exit(1);
});
