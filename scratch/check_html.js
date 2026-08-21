import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "public", "temp-websites", "let-s-meet-cafe.html");
if (!fs.existsSync(filePath)) {
  console.log("File does not exist!");
  process.exit(1);
}

const html = fs.readFileSync(filePath, "utf-8");

// Search for typical placeholders like [NAME] or __NAME__
const squareBrackets = html.match(/\[[A-Z0-9_]+\]/g);
const doubleUnderscores = html.match(/__[A-Z0-9_]+__/g);

console.log("Square brackets placeholders found:", squareBrackets);
console.log("Double underscores placeholders found:", doubleUnderscores);
