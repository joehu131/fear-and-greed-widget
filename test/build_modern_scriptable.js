const fs = require('fs');
const path = require('path');

const jsPath = path.resolve(__dirname, '../Fear & Greed Modern.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

const scriptableData = {
  always_run_in_app: false,
  icon: {
    color: "green",
    glyph: "chart-line"
  },
  name: "Fear & Greed Modern",
  script: jsContent,
  share_sheet_inputs: []
};

const targetPath = path.resolve(__dirname, '../Fear & Greed Modern.scriptable');
fs.writeFileSync(targetPath, JSON.stringify(scriptableData, null, 2));
console.log('Successfully wrote Fear & Greed Modern.scriptable');
