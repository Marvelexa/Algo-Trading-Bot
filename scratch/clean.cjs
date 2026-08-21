const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let lines = fs.readFileSync(serverFile, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes("listState.appendChild(itemDiv);"));
const endIdx = lines.findIndex(l => l.trim() === "interface ColorPalette {");

if (startIdx !== -1 && endIdx !== -1) {
  // endIdx is line 1586. 1585 is an empty line. 1584 is `\`;`.
  // The first line to remove is startIdx.
  // We want to remove up to endIdx - 2, which is line 1584. 
  // Let's remove from startIdx to endIdx - 1.
  lines.splice(startIdx, (endIdx - 1) - startIdx);
  fs.writeFileSync(serverFile, lines.join('\n'), 'utf8');
  console.log("Removed junk from line " + startIdx + " to " + (endIdx - 1));
} else {
  console.log("Could not find bounds", startIdx, endIdx);
}
