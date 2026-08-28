const assert = require('assert');
const vm = require('vm');
const path = require('path');
const fs = require('fs');

// Comprehensive mock classes
class MockColor {
  constructor(hex, alpha = 1) { this.hex = hex; this.alpha = alpha; }
  static white() { return new MockColor('#FFFFFF'); }
  static black() { return new MockColor('#000000'); }
  static gray() { return new MockColor('#8E8E93'); }
  static clear() { return new MockColor('#000000', 0); }
}

class MockLinearGradient {
  constructor() { this.colors = []; this.locations = []; }
}

class MockFont {
  constructor(name, size) { this.name = name; this.size = size; }
  static boldSystemFont(size) { return new MockFont('boldSystem', size); }
  static semiboldSystemFont(size) { return new MockFont('semiboldSystem', size); }
  static mediumSystemFont(size) { return new MockFont('mediumSystem', size); }
  static systemFont(size) { return new MockFont('system', size); }
  static heavySystemFont(size) { return new MockFont('heavySystem', size); }
}

class MockSize { constructor(width, height) { this.width = width; this.height = height; } }
class MockPoint { constructor(x, y) { this.x = x; this.y = y; } }
class MockRect { constructor(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; } }
class MockPath {
  constructor() { this.elements = []; }
  addRect(rect) { this.elements.push({ type: 'rect', rect }); }
  addRoundedRect(rect, cw, ch) { this.elements.push({ type: 'roundedRect', rect, cw, ch }); }
  addEllipse(rect) { this.elements.push({ type: 'ellipse', rect }); }
}
class MockImage { constructor(data) { this.data = data; } }
class MockDrawContext {
  constructor() { this.size = new MockSize(0, 0); this.paths = []; }
  addPath(p) { this.paths.push(p); }
  setFillColor(c) { this.fillColor = c; }
  fillPath() {}
  getImage() { return new MockImage({ size: this.size }); }
}

class MockWidgetElement {
  constructor(type, text = '') {
    this.type = type;
    this.text = text;
    this.children = [];
    this.padding = null;
  }
  addText(t) { const el = new MockWidgetElement('text', t); this.children.push(el); return el; }
  addStack() { const el = new MockWidgetElement('stack'); this.children.push(el); return el; }
  addImage(img) { const el = new MockWidgetElement('image'); el.image = img; this.children.push(el); return el; }
  addSpacer(l) { const el = new MockWidgetElement('spacer', l); this.children.push(el); return el; }
  topAlignContent() {}
  centerAlignContent() {}
  bottomAlignContent() {}
  layoutVertically() {}
  layoutHorizontally() {}
  centerAlignText() {}
  rightAlignText() {}
  setPadding(t, l, b, r) { this.padding = { t, l, b, r }; }
}

class MockListWidget extends MockWidgetElement {
  constructor() {
    super('ListWidget');
    this.backgroundGradient = null;
    this.backgroundColor = null;
    this.refreshAfterDate = null;
  }
  presentSmall() {}
  presentMedium() {}
  presentLarge() {}
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
  constructor(url) { this.url = url; }
  async loadJSON() {
    return {
      fear_and_greed: {
        score: 57.74,
        rating: 'greed',
        timestamp: '2026-08-28T08:40:16+00:00',
        previous_close: 58.17,
        previous_1_week: 54.51,
        previous_1_month: 37.88,
        previous_1_year: 64.42
      }
    };
  }
}

async function testVariant(filePath, widgetFamily = 'small') {
  const code = fs.readFileSync(filePath, 'utf8');
  let finishedWidget = null;
  let completeCalled = false;

  const sandbox = {
    Color: MockColor,
    LinearGradient: MockLinearGradient,
    Font: MockFont,
    Size: MockSize,
    Point: MockPoint,
    Rect: MockRect,
    Path: MockPath,
    DrawContext: MockDrawContext,
    ListWidget: MockListWidget,
    FileManager: MockFileManager,
    Request: MockRequest,
    config: { runsInWidget: true, widgetFamily },
    Script: {
      setWidget(w) { finishedWidget = w; },
      complete() { completeCalled = true; }
    },
    console: console,
    Date: Date,
    Math: Math,
    JSON: JSON,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  };

  const context = vm.createContext(sandbox);
  await vm.runInContext(`(async () => {\n${code}\n})()`, context);

  assert(completeCalled, `Script.complete() must be called for ${filePath}`);
  assert(finishedWidget, `Widget must be created for ${filePath}`);
  return finishedWidget;
}

async function runAllTests() {
  console.log('=== Verifying All 4 Widget Variants ===\n');

  const files = [
    'widgets/classic/fear-and-greed-classic-dark.js',
    'widgets/classic/fear-and-greed-classic-light.js',
    'widgets/modern/fear-and-greed-modern-dark.js',
    'widgets/modern/fear-and-greed-modern-light.js'
  ];

  for (const relPath of files) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    console.log(`Testing Small: ${relPath}`);
    const wSmall = await testVariant(fullPath, 'small');
    assert(wSmall.children.length > 0);

    console.log(`Testing Medium: ${relPath}`);
    const wMed = await testVariant(fullPath, 'medium');
    assert(wMed.children.length > 0);

    console.log(`✓ Passed: ${relPath}\n`);
  }

  console.log('All 4 widget variants passed all tests!');
}

runAllTests().catch(e => {
  console.error('Variant test failed:', e);
  process.exit(1);
});
