import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "src", "configSchema.json");
const outPath = path.join(__dirname, "..", "docs", "config_reference.md");

/**
 * Render a JSON-Schema type keyword as a short human-readable label.
 * @param {object} propSchema
 * @returns {string}
 */
function typeLabel(propSchema) {
  if (propSchema.type === "array") {
    const itemType = propSchema.items ? typeLabel(propSchema.items) : "any";
    return `array of ${itemType}`;
  }
  return propSchema.type ?? "any";
}

/**
 * Render a single property (and, recursively, its object/array-of-object
 * children) as one or more Markdown bullets, using dotted key paths the
 * same way the old hand-written README list did.
 *
 * @param {string} keyPath Dotted path so far, e.g. "PROGRAM.LIMIT".
 * @param {object} propSchema The JSON Schema node for this property.
 * @param {boolean} required Whether this key is in its parent's `required`.
 * @param {string[]} lines Accumulator of Markdown lines.
 */
function renderProperty(keyPath, propSchema, required, lines) {
  const parts = [`\`${keyPath}\` (${typeLabel(propSchema)}${required ? ", required" : ""})`];
  if (propSchema.description) parts.push(propSchema.description);
  if (propSchema.default !== undefined) {
    parts.push(`Default: \`${JSON.stringify(propSchema.default)}\`.`);
  }
  lines.push(`- ${parts.join(" — ")}`);

  if (propSchema.type === "object" && propSchema.properties) {
    const childRequired = new Set(propSchema.required ?? []);
    for (const [childKey, childSchema] of Object.entries(propSchema.properties)) {
      renderProperty(`${keyPath}.${childKey}`, childSchema, childRequired.has(childKey), lines);
    }
  } else if (propSchema.type === "array" && propSchema.items?.type === "object" && propSchema.items.properties) {
    for (const [childKey, childSchema] of Object.entries(propSchema.items.properties)) {
      renderProperty(`${keyPath}[].${childKey}`, childSchema, false, lines);
    }
  }
}

/**
 * Generate the full Markdown reference document from a JSON Schema object.
 * @param {object} schema
 * @returns {string}
 */
export function generateDocs(schema) {
  const lines = [
    "# ConClár configuration reference",
    "",
    "This document is generated from `src/configSchema.json` via `npm run docs:generate`. Do not edit it by hand — edit the schema instead and regenerate.",
    "",
    "Copy `src/config_example.json` to `src/config.json` and customise. See the [Getting Started](../README.md#getting-started) section of the README for details.",
    "",
  ];
  const topRequired = new Set(schema.required ?? []);
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    renderProperty(key, propSchema, topRequired.has(key), lines);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const generated = generateDocs(schema);

  if (process.argv.includes("--check")) {
    const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf-8") : "";
    if (existing !== generated) {
      console.error(
        "docs/config_reference.md is out of date with src/configSchema.json.\n" +
          "Run `npm run docs:generate` and commit the result."
      );
      process.exit(1);
    }
    console.log("docs/config_reference.md is up to date.");
    return;
  }

  fs.writeFileSync(outPath, generated);
  console.log("Wrote docs/config_reference.md");
}

main();
