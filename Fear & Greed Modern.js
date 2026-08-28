// Fear & Greed Modern Pro Widget for Scriptable
// Features: Dynamic Gradient Theme, Multi-Zone Visual Gauge, Trend Badges, Small & Medium Adaptive Layouts, Offline Cache & CNN Deep Link.

const API_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
const CACHE_FILE = "fgi_modern_widget_cache.json";
const CNN_URL = "https://www.cnn.com/markets/fear-and-greed";

// Color Palette for Sentiment Zones
const PALETTE = {
  extremeFear: { hex: "#FF3B30", label: "Extreme Fear", bg: "#2A1416", glow: "#FF3B3040" },
  fear:        { hex: "#FF9500", label: "Fear",         bg: "#2A1E12", glow: "#FF950040" },
  neutral:     { hex: "#FFD60A", label: "Neutral",      bg: "#262414", glow: "#FFD60A30" },
  greed:       { hex: "#34C759", label: "Greed",        bg: "#122818", glow: "#34C75940" },
  extremeGreed:{ hex: "#00E676", label: "Extreme Greed",bg: "#0A281E", glow: "#00E67645" }
};

function log(message, ...args) {
  console.log(`[FGI Modern] ${message}`, ...args);
}

function logError(message, ...args) {
  console.error(`[FGI Modern] ERROR: ${message}`, ...args);
}

function toTitleCase(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function getSentimentTheme(score) {
  if (typeof score !== "number" || isNaN(score)) {
    return { hex: "#EBEBF5", label: "Unknown", bg: "#1C1C1E", glow: "#FFFFFF20" };
  }
  if (score <= 25) return PALETTE.extremeFear;
  if (score <= 45) return PALETTE.fear;
  if (score <= 55) return PALETTE.neutral;
  if (score <= 75) return PALETTE.greed;
  return PALETTE.extremeGreed;
}

function getCacheManager() {
  try {
    const fm = FileManager.local();
    const cacheDir = fm.documentsDirectory();
    const cachePath = fm.joinPath(cacheDir, CACHE_FILE);
    return { fm, cachePath };
  } catch (e) {
    logError("FileManager unavailable:", e);
    return null;
  }
}

function loadCache() {
  const c = getCacheManager();
  if (c && c.fm.fileExists(c.cachePath)) {
    try {
      const data = JSON.parse(c.fm.readString(c.cachePath));
      log("Loaded data from offline cache");
      return data;
    } catch (e) {
      logError("Cache read error:", e);
    }
  }
  return null;
}

function saveCache(data) {
  const c = getCacheManager();
  if (c) {
    try {
      c.fm.writeString(c.cachePath, JSON.stringify(data));
      log("Data cached locally");
    } catch (e) {
      logError("Cache write error:", e);
    }
  }
}

async function fetchFGI() {
  log("Fetching data from CNN...");
  try {
    const req = new Request(API_URL);
    req.method = "GET";
    req.headers = {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Referer": "https://www.cnn.com/",
      "Accept": "application/json, text/plain, */*"
    };
    req.timeoutInterval = 10;

    const json = await req.loadJSON();
    if (!json || !json.fear_and_greed || typeof json.fear_and_greed.score !== "number") {
      throw new Error("Malformed JSON payload received");
    }

    const f = json.fear_and_greed;
    const score = Math.round(f.score);
    const rating = toTitleCase(f.rating || "");
    const prevClose = typeof f.previous_close === "number" ? Math.round(f.previous_close) : null;
    const oneWeek = typeof f.previous_1_week === "number" ? Math.round(f.previous_1_week) : null;
    const oneMonth = typeof f.previous_1_month === "number" ? Math.round(f.previous_1_month) : null;
    const oneYear = typeof f.previous_1_year === "number" ? Math.round(f.previous_1_year) : null;

    const result = {
      score,
      rating,
      prevClose,
      oneWeek,
      oneMonth,
      oneYear,
      updatedAt: new Date().toISOString(),
      isCached: false
    };

    saveCache(result);
    log(`Fetched live FGI score: ${score} (${rating})`);
    return result;
  } catch (err) {
    logError("Live fetch failed:", err.message || err);
    const cached = loadCache();
    if (cached) {
      return { ...cached, isCached: true };
    }
    return {
      score: 50,
      rating: "Unavailable",
      prevClose: null,
      oneWeek: null,
      oneMonth: null,
      oneYear: null,
      updatedAt: null,
      isCached: false,
      isError: true
    };
  }
}

// Draw a modern multi-zone gradient gauge with needle indicator
function drawGaugeImage(score, width, height) {
  const dc = new DrawContext();
  dc.size = new Size(width, height);
  dc.opaque = false;
  dc.respectScreenScale = true;

  const barH = 6;
  const barY = (height - barH) / 2;
  const corner = 3;

  // Background track
  const bgPath = new Path();
  bgPath.addRoundedRect(new Rect(0, barY, width, barH), corner, corner);
  dc.addPath(bgPath);
  dc.setFillColor(new Color("#2C2C2E", 0.8));
  dc.fillPath();

  // 5 Color Zones
  const zones = [
    { start: 0, end: 25, color: "#FF3B30" },
    { start: 25, end: 45, color: "#FF9500" },
    { start: 45, end: 55, color: "#FFD60A" },
    { start: 55, end: 75, color: "#34C759" },
    { start: 75, end: 100, color: "#00E676" }
  ];

  zones.forEach(z => {
    const x = (z.start / 100) * width;
    const w = ((z.end - z.start) / 100) * width;
    const p = new Path();
    p.addRect(new Rect(x, barY, w, barH));
    dc.addPath(p);
    dc.setFillColor(new Color(z.color, 0.75));
    dc.fillPath();
  });

  // Score Indicator Position
  const validScore = typeof score === "number" && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 50;
  const indX = Math.max(6, Math.min(width - 6, (validScore / 100) * width));
  const centerY = height / 2;

  // Glow halo
  const halo = new Path();
  halo.addEllipse(new Rect(indX - 7, centerY - 7, 14, 14));
  dc.addPath(halo);
  dc.setFillColor(new Color("#FFFFFF", 0.35));
  dc.fillPath();

  // Inner pin dot
  const pin = new Path();
  pin.addEllipse(new Rect(indX - 4.5, centerY - 4.5, 9, 9));
  dc.addPath(pin);
  dc.setFillColor(Color.white());
  dc.fillPath();

  return dc.getImage();
}

function getDeltaFormatted(current, previous) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (diff > 0) return { text: `+${diff}`, icon: "▲", color: "#34C759" };
  if (diff < 0) return { text: `${diff}`, icon: "▼", color: "#FF3B30" };
  return { text: "0", icon: "●", color: "#8E8E93" };
}

function createSmallWidget(data, theme) {
  const w = new ListWidget();
  w.url = CNN_URL;

  // Modern subtle gradient background
  const bg = new LinearGradient();
  bg.colors = [new Color("#1C232B"), new Color("#101317")];
  bg.locations = [0.0, 1.0];
  w.backgroundGradient = bg;
  w.setPadding(12, 14, 12, 14);

  // Header Row
  const header = w.addStack();
  header.centerAlignContent();

  const titleText = header.addText("FEAR & GREED");
  titleText.font = Font.heavySystemFont(10);
  titleText.textColor = new Color("#8E8E93");

  header.addSpacer();

  const badge = header.addStack();
  badge.backgroundColor = new Color(theme.hex, 0.18);
  badge.cornerRadius = 4;
  badge.setPadding(2, 6, 2, 6);
  const badgeText = badge.addText("CNN");
  badgeText.font = Font.boldSystemFont(9);
  badgeText.textColor = new Color(theme.hex);

  w.addSpacer(6);

  // Hero Score Row + Sentiment Tag
  const heroRow = w.addStack();
  heroRow.centerAlignContent();

  const scoreText = heroRow.addText(`${data.score}`);
  scoreText.font = Font.boldSystemFont(38);
  scoreText.textColor = new Color(theme.hex);

  heroRow.addSpacer(8);

  const heroMeta = heroRow.addStack();
  heroMeta.layoutVertically();

  const ratingLabel = heroMeta.addText(theme.label.toUpperCase());
  ratingLabel.font = Font.heavySystemFont(11);
  ratingLabel.textColor = Color.white();

  const delta1w = getDeltaFormatted(data.score, data.oneWeek);
  if (delta1w) {
    const deltaStack = heroMeta.addStack();
    deltaStack.centerAlignContent();
    const dText = deltaStack.addText(`${delta1w.icon} ${delta1w.text} (1w)`);
    dText.font = Font.semiboldSystemFont(10);
    dText.textColor = new Color(delta1w.color);
  }

  w.addSpacer(6);

  // Visual Gauge Meter
  const gaugeImg = drawGaugeImage(data.score, 130, 14);
  const gaugeContainer = w.addStack();
  gaugeContainer.centerAlignContent();
  const gImage = gaugeContainer.addImage(gaugeImg);
  gImage.imageSize = new Size(130, 14);

  w.addSpacer(8);

  // Mini History Row (1W, 1M, 1Y)
  const statsRow = w.addStack();
  statsRow.centerAlignContent();

  function addMiniStat(label, val) {
    const stack = statsRow.addStack();
    stack.layoutVertically();
    const lbl = stack.addText(label);
    lbl.font = Font.mediumSystemFont(8);
    lbl.textColor = new Color("#636366");
    const v = stack.addText(val != null ? `${val}` : "-");
    v.font = Font.boldSystemFont(11);
    v.textColor = new Color("#D1D1D6");
  }

  addMiniStat("1W", data.oneWeek);
  statsRow.addSpacer();
  addMiniStat("1M", data.oneMonth);
  statsRow.addSpacer();
  addMiniStat("1Y", data.oneYear);

  w.addSpacer(4);

  // Footer / Updated label
  const footer = w.addStack();
  footer.centerAlignContent();
  const time = data.updatedAt ? new Date(data.updatedAt) : new Date();
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const footerText = footer.addText(data.isCached ? `● Cached ${timeStr}` : `● Live ${timeStr}`);
  footerText.font = Font.systemFont(8);
  footerText.textColor = data.isCached ? new Color("#FF9F0A") : new Color("#48484A");

  return w;
}

function createMediumWidget(data, theme) {
  const w = new ListWidget();
  w.url = CNN_URL;

  const bg = new LinearGradient();
  bg.colors = [new Color("#1A2027"), new Color("#0F1216")];
  bg.locations = [0.0, 1.0];
  w.backgroundGradient = bg;
  w.setPadding(14, 16, 14, 16);

  const mainRow = w.addStack();
  mainRow.centerAlignContent();

  // LEFT COLUMN: Hero, Gauge, Sentiment
  const leftCol = mainRow.addStack();
  leftCol.layoutVertically();

  const topHeader = leftCol.addStack();
  topHeader.centerAlignContent();
  const title = topHeader.addText("FEAR & GREED INDEX");
  title.font = Font.heavySystemFont(10);
  title.textColor = new Color("#8E8E93");

  leftCol.addSpacer(4);

  const heroStack = leftCol.addStack();
  heroStack.centerAlignContent();

  const scoreText = heroStack.addText(`${data.score}`);
  scoreText.font = Font.boldSystemFont(44);
  scoreText.textColor = new Color(theme.hex);

  heroStack.addSpacer(10);

  const tagStack = heroStack.addStack();
  tagStack.layoutVertically();

  const pill = tagStack.addStack();
  pill.backgroundColor = new Color(theme.hex, 0.2);
  pill.cornerRadius = 6;
  pill.setPadding(3, 8, 3, 8);
  const pillText = pill.addText(theme.label.toUpperCase());
  pillText.font = Font.heavySystemFont(11);
  pillText.textColor = new Color(theme.hex);

  tagStack.addSpacer(2);

  const dClose = getDeltaFormatted(data.score, data.prevClose);
  if (dClose) {
    const dLabel = tagStack.addText(`${dClose.icon} ${dClose.text} vs prev close`);
    dLabel.font = Font.semiboldSystemFont(10);
    dLabel.textColor = new Color(dClose.color);
  }

  leftCol.addSpacer(8);

  const gauge = leftCol.addImage(drawGaugeImage(data.score, 140, 14));
  gauge.imageSize = new Size(140, 14);

  leftCol.addSpacer(6);

  const time = data.updatedAt ? new Date(data.updatedAt) : new Date();
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const footerText = leftCol.addText(data.isCached ? `Updated: ${timeStr} (offline cache)` : `Updated: ${timeStr}`);
  footerText.font = Font.systemFont(9);
  footerText.textColor = new Color("#636366");

  mainRow.addSpacer(16);

  // RIGHT COLUMN: 4-Card Historical Breakdown Matrix
  const rightCol = mainRow.addStack();
  rightCol.layoutVertically();

  function addStatCard(label, value) {
    const card = rightCol.addStack();
    card.backgroundColor = new Color("#242B35", 0.6);
    card.cornerRadius = 6;
    card.setPadding(4, 8, 4, 8);
    card.centerAlignContent();

    const lbl = card.addText(label);
    lbl.font = Font.mediumSystemFont(10);
    lbl.textColor = new Color("#8E8E93");

    card.addSpacer();

    const valText = card.addText(value != null ? `${value}` : "-");
    valText.font = Font.boldSystemFont(12);
    valText.textColor = Color.white();

    const delta = getDeltaFormatted(data.score, value);
    if (delta && value != null) {
      card.addSpacer(6);
      const d = card.addText(`${delta.icon} ${delta.text}`);
      d.font = Font.semiboldSystemFont(9);
      d.textColor = new Color(delta.color);
    }
    rightCol.addSpacer(3);
  }

  addStatCard("Prev Close", data.prevClose);
  addStatCard("1 Week Ago", data.oneWeek);
  addStatCard("1 Month Ago", data.oneMonth);
  addStatCard("1 Year Ago", data.oneYear);

  return w;
}

async function createWidget() {
  const data = await fetchFGI();
  const theme = getSentimentTheme(data.score);

  // Adapt based on widget size configured in iOS
  if (config.widgetFamily === "medium") {
    return createMediumWidget(data, theme);
  }
  return createSmallWidget(data, theme);
}

// Execution and Presentation
const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  // In-app test preview: toggle between small and medium
  if (config.widgetFamily === "medium") {
    widget.presentMedium();
  } else {
    widget.presentSmall();
  }
}

widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
Script.complete();
