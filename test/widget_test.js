const assert = require('assert');

// Mock Scriptable environment
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
  }
  presentSmall() {
    this.presented = 'small';
  }
}

class MockFileManager {
  constructor() {
    this.storage = new Map();
  }
  documentsDirectory() {
    return '/mock/docs';
  }
  joinPath(dir, file) {
    return `${dir}/${file}`;
  }
  fileExists(path) {
    return this.storage.has(path);
  }
  readString(path) {
    if (!this.storage.has(path)) throw new Error('File not found');
    return this.storage.get(path);
  }
  writeString(path, content) {
    this.storage.set(path, content);
  }
}

// Functions under test
function getColorByValue(value, ColorClass = MockColor) {
  if (typeof value !== 'number' || isNaN(value)) {
    return ColorClass.white();
  }

  if (value >= 0 && value <= 25) {
    return new ColorClass('#8B0000'); // Deep Red
  } else if (value > 25 && value <= 45) {
    return new ColorClass('#FF3B30'); // Red
  } else if (value > 45 && value <= 55) {
    return ColorClass.white();        // White (Neutral)
  } else if (value > 55 && value <= 75) {
    return new ColorClass('#90EE90'); // Light Green
  } else if (value > 75 && value <= 100) {
    return new ColorClass('#006400'); // Dark Green
  } else {
    return ColorClass.white();        // Default white
  }
}

function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function parseFGIResponse(json) {
  if (!json || !json.fear_and_greed || typeof json.fear_and_greed.score !== 'number') {
    throw new Error('Invalid payload structure received from CNN API');
  }

  const fgi = json.fear_and_greed;
  const value = Math.round(fgi.score);
  const valueText = toTitleCase(fgi.rating || '');
  const oneWeekAgo = typeof fgi.previous_1_week === 'number' ? Math.round(fgi.previous_1_week) : '';
  const oneMonthAgo = typeof fgi.previous_1_month === 'number' ? Math.round(fgi.previous_1_month) : '';
  const oneYearAgo = typeof fgi.previous_1_year === 'number' ? Math.round(fgi.previous_1_year) : '';

  return {
    value,
    valueText,
    oneWeekAgo,
    oneMonthAgo,
    oneYearAgo,
    updatedAt: new Date().toISOString(),
    isCached: false
  };
}

function buildWidgetUI(data, { ListWidgetClass, ColorClass, FontClass }) {
  const w = new ListWidgetClass();
  w.backgroundColor = new ColorClass('#222222');

  const title = w.addText('Fear & Greed Index');
  title.font = FontClass.boldSystemFont(12);
  title.textColor = ColorClass.white();
  w.addSpacer(20);

  const color = getColorByValue(data.value, ColorClass);

  // Main value row
  const row = w.addStack();
  row.topAlignContent();

  const valueText = row.addText(data.value.toString());
  valueText.font = FontClass.systemFont(48);
  valueText.textColor = color;

  row.addSpacer(12); // Space between main value and history

  // Historical values stacked vertically
  const hist = row.addStack();
  hist.layoutVertically();
  hist.addSpacer(6);

  const wText = hist.addText(`w: ${data.oneWeekAgo}`);
  wText.font = FontClass.systemFont(14);
  wText.textColor = color;

  const mText = hist.addText(`m: ${data.oneMonthAgo}`);
  mText.font = FontClass.systemFont(14);
  mText.textColor = color;

  const yText = hist.addText(`y: ${data.oneYearAgo}`);
  yText.font = FontClass.systemFont(14);
  yText.textColor = color;

  w.addSpacer(2);

  const desc = w.addText(data.valueText);
  desc.font = FontClass.systemFont(18);
  desc.textColor = color;

  w.addSpacer(6);

  const updateDate = data.updatedAt ? new Date(data.updatedAt) : new Date();
  const dateFormatted = updateDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const footerLabel = data.isCached ? `Updated: ${dateFormatted} (cached)` : `Updated: ${dateFormatted}`;

  const dateText = w.addText(footerLabel);
  dateText.font = FontClass.systemFont(10);
  dateText.textColor = ColorClass.gray();
  dateText.centerAlignText();

  return w;
}

// Test Runner
async function runTests() {
  console.log('--- Running Fear & Greed Widget Tests ---');

  // Test 1: Color Mapping
  console.log('\n[Test 1] Color Mapping...');
  assert.strictEqual(getColorByValue(0).hex, '#8B0000', '0 should be Deep Red');
  assert.strictEqual(getColorByValue(25).hex, '#8B0000', '25 should be Deep Red');
  assert.strictEqual(getColorByValue(26).hex, '#FF3B30', '26 should be Red');
  assert.strictEqual(getColorByValue(45).hex, '#FF3B30', '45 should be Red');
  assert.strictEqual(getColorByValue(46).hex, '#FFFFFF', '46 should be White');
  assert.strictEqual(getColorByValue(55).hex, '#FFFFFF', '55 should be White');
  assert.strictEqual(getColorByValue(56).hex, '#90EE90', '56 should be Light Green');
  assert.strictEqual(getColorByValue(75).hex, '#90EE90', '75 should be Light Green');
  assert.strictEqual(getColorByValue(76).hex, '#006400', '76 should be Dark Green');
  assert.strictEqual(getColorByValue(100).hex, '#006400', '100 should be Dark Green');
  assert.strictEqual(getColorByValue('Error').hex, '#FFFFFF', 'Error string should default to White');
  assert.strictEqual(getColorByValue(null).hex, '#FFFFFF', 'null should default to White');
  console.log('✓ Color mapping tests passed.');

  // Test 2: Title Casing
  console.log('\n[Test 2] Title Casing...');
  assert.strictEqual(toTitleCase('greed'), 'Greed');
  assert.strictEqual(toTitleCase('extreme fear'), 'Extreme Fear');
  assert.strictEqual(toTitleCase('extreme greed'), 'Extreme Greed');
  assert.strictEqual(toTitleCase('neutral'), 'Neutral');
  assert.strictEqual(toTitleCase(''), '');
  assert.strictEqual(toTitleCase(null), '');
  console.log('✓ Title casing tests passed.');

  // Test 3: Data Parsing & Float Rounding
  console.log('\n[Test 3] Data Parsing & Float Rounding...');
  const mockCNNData = {
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
  const parsed = parseFGIResponse(mockCNNData);
  assert.strictEqual(parsed.value, 58, 'score should be rounded to 58');
  assert.strictEqual(parsed.valueText, 'Greed', 'rating should be Greed');
  assert.strictEqual(parsed.oneWeekAgo, 55, '1 week ago should be rounded to 55');
  assert.strictEqual(parsed.oneMonthAgo, 38, '1 month ago should be rounded to 38');
  assert.strictEqual(parsed.oneYearAgo, 64, '1 year ago should be rounded to 64');
  console.log('✓ Data parsing tests passed.');

  // Test 4: Caching Logic
  console.log('\n[Test 4] Caching Logic...');
  const mockFm = new MockFileManager();
  const cachePath = mockFm.joinPath(mockFm.documentsDirectory(), 'fgi_widget_cache.json');
  mockFm.writeString(cachePath, JSON.stringify(parsed));
  assert(mockFm.fileExists(cachePath), 'Cache file should exist');
  const cachedData = JSON.parse(mockFm.readString(cachePath));
  assert.strictEqual(cachedData.value, 58);
  console.log('✓ Caching logic tests passed.');

  // Test 5: UI Construction
  console.log('\n[Test 5] UI Tree Construction...');
  const widget = buildWidgetUI(parsed, {
    ListWidgetClass: MockListWidget,
    ColorClass: MockColor,
    FontClass: MockFont
  });
  assert.strictEqual(widget.backgroundColor.hex, '#222222');
  assert.strictEqual(widget.children.length, 7, 'Widget should have 7 root elements (title, spacer, row, spacer, desc, spacer, footer)');
  console.log('✓ UI tree construction tests passed.');

  console.log('\nAll tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
