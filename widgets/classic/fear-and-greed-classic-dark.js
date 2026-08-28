// Fear & Greed Index Widget - Classic (Dark Mode)
// Data Source: CNN Business Fear & Greed Index

const API_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
const CACHE_FILE = "fgi_classic_dark_cache.json";

function log(message, ...args) {
  console.log(`[Fear & Greed Classic Dark] ${message}`, ...args);
}

function logError(message, ...args) {
  console.error(`[Fear & Greed Classic Dark] ERROR: ${message}`, ...args);
}

function toTitleCase(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/\b\w/g, c => c.toUpperCase());
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

function loadFromCache() {
  const cache = getCacheManager();
  if (cache && cache.fm.fileExists(cache.cachePath)) {
    try {
      const raw = cache.fm.readString(cache.cachePath);
      const data = JSON.parse(raw);
      log("Loaded fallback data from local cache");
      return data;
    } catch (e) {
      logError("Failed to parse cached data:", e);
    }
  }
  return null;
}

function saveToCache(data) {
  const cache = getCacheManager();
  if (cache) {
    try {
      cache.fm.writeString(cache.cachePath, JSON.stringify(data));
      log("Successfully saved data to local cache");
    } catch (e) {
      logError("Failed to save data to cache:", e);
    }
  }
}

async function fetchFGI() {
  log("Fetching Fear & Greed data from CNN API...");
  try {
    let req = new Request(API_URL);
    req.method = "GET";
    req.headers = {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Referer": "https://www.cnn.com/",
      "Accept": "application/json, text/plain, */*"
    };
    req.timeoutInterval = 10;

    let json = await req.loadJSON();
    log("Received response from CNN dataviz API");

    if (!json || !json.fear_and_greed || typeof json.fear_and_greed.score !== "number") {
      throw new Error("Invalid payload structure received from CNN API");
    }

    const fgi = json.fear_and_greed;
    const value = Math.round(fgi.score);
    const valueText = toTitleCase(fgi.rating || "");
    const oneWeekAgo = typeof fgi.previous_1_week === "number" ? Math.round(fgi.previous_1_week) : "";
    const oneMonthAgo = typeof fgi.previous_1_month === "number" ? Math.round(fgi.previous_1_month) : "";
    const oneYearAgo = typeof fgi.previous_1_year === "number" ? Math.round(fgi.previous_1_year) : "";

    const result = {
      value,
      valueText,
      oneWeekAgo,
      oneMonthAgo,
      oneYearAgo,
      updatedAt: new Date().toISOString(),
      isCached: false
    };

    saveToCache(result);
    log(`Parsed live values: current=${value} (${valueText}), 1w=${oneWeekAgo}, 1m=${oneMonthAgo}, 1y=${oneYearAgo}`);
    return result;

  } catch (e) {
    logError("Failed to fetch live data:", e.message || e);

    const cached = loadFromCache();
    if (cached) {
      log("Using cached data fallback");
      return { ...cached, isCached: true };
    }

    return {
      value: "Error",
      valueText: "Unavailable",
      oneWeekAgo: "-",
      oneMonthAgo: "-",
      oneYearAgo: "-",
      updatedAt: null,
      isCached: false
    };
  }
}

function getColorByValue(value) {
  if (typeof value !== "number" || isNaN(value)) {
    return Color.white();
  }

  if (value >= 0 && value <= 25) {
    return new Color("#8B0000");  // Deep Red
  } else if (value > 25 && value <= 45) {
    return new Color("#FF3B30");  // Red
  } else if (value > 45 && value <= 55) {
    return Color.white();         // White (Neutral)
  } else if (value > 55 && value <= 75) {
    return new Color("#90EE90");  // Light Green
  } else if (value > 75 && value <= 100) {
    return new Color("#006400");  // Dark Green
  } else {
    return Color.white();         // Default white
  }
}

async function createWidget() {
  const data = await fetchFGI();

  const w = new ListWidget();
  w.backgroundColor = new Color("#222222");

  const title = w.addText("Fear & Greed Index");
  title.font = Font.boldSystemFont(12);
  title.textColor = Color.white();
  w.addSpacer(20);

  const color = getColorByValue(data.value);

  // Main value row
  const row = w.addStack();
  row.topAlignContent();

  const valueText = row.addText(data.value.toString());
  valueText.font = Font.systemFont(48);
  valueText.textColor = color;

  row.addSpacer(12); // Space between main value and history

  // Historical values stacked vertically
  const hist = row.addStack();
  hist.layoutVertically();
  hist.addSpacer(6);

  const wText = hist.addText(`w: ${data.oneWeekAgo}`);
  wText.font = Font.systemFont(14);
  wText.textColor = color;

  const mText = hist.addText(`m: ${data.oneMonthAgo}`);
  mText.font = Font.systemFont(14);
  mText.textColor = color;

  const yText = hist.addText(`y: ${data.oneYearAgo}`);
  yText.font = Font.systemFont(14);
  yText.textColor = color;

  w.addSpacer(2);

  const desc = w.addText(data.valueText);
  desc.font = Font.systemFont(18);
  desc.textColor = color;
  
  w.addSpacer(6);

  const updateDate = data.updatedAt ? new Date(data.updatedAt) : new Date();
  const dateFormatted = updateDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const footerLabel = data.isCached ? `Updated: ${dateFormatted} (cached)` : `Updated: ${dateFormatted}`;

  const dateText = w.addText(footerLabel);
  dateText.font = Font.systemFont(10);
  dateText.textColor = Color.gray();
  dateText.centerAlignText();

  return w;
}

let widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
Script.complete();
