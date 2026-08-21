import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateConfig } from "../src/validateConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "..", "src", "config_example.json");

const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));

try {
  validateConfig(configData);
  console.log("src/config_example.json is valid.");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
