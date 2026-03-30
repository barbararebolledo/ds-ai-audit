/**
 * extract-mui-theme.mjs
 *
 * Installs @mui/material, calls createTheme() with default options,
 * and serialises the full resulting theme object to JSON.
 *
 * Usage:
 *   node scripts/extract-mui-theme.mjs
 *
 * Output:
 *   scripts/output/mui-default-theme.json
 *
 * The theme object contains functions (transitions.create, breakpoints.up, etc.)
 * that cannot be serialised to JSON. This script replaces functions with a
 * descriptor string so the output is valid JSON and the function's existence
 * is recorded.
 */

import { createTheme } from '@mui/material/styles';
import * as muiColors from '@mui/material/colors';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, 'output');
const outputPath = join(outputDir, 'mui-default-theme.json');

// Create the default MUI theme with no overrides.
const theme = createTheme();

/**
 * Recursively process the theme object for JSON serialisation.
 * - Functions are replaced with "[Function: name]" descriptors.
 * - Circular references are caught and replaced with "[Circular]".
 * - Everything else passes through unchanged.
 */
function serialise(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return `[Function: ${obj.name || 'anonymous'}]`;
  if (typeof obj !== 'object') return obj;

  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => serialise(item, seen));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = serialise(value, seen);
  }
  return result;
}

const serialisable = serialise(theme);

// Extract the full material colour palette from @mui/material/colors.
// These are the primitive colour values that Figma stores in the
// material/colors variable collection.
const colorPalette = {};
for (const [hueName, hueObj] of Object.entries(muiColors)) {
  if (hueName === 'default' || typeof hueObj !== 'object') continue;
  colorPalette[hueName] = { ...hueObj };
}

const output = {
  theme: serialisable,
  materialColors: colorPalette,
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

// Summary statistics for verification.
const themeKeys = Object.keys(serialisable);
const colorHues = Object.keys(colorPalette);
const totalColorValues = colorHues.reduce(
  (sum, h) => sum + Object.keys(colorPalette[h]).length, 0
);
console.log(`Theme extracted successfully.`);
console.log(`Top-level theme keys: ${themeKeys.join(', ')}`);
console.log(`Material colour hues: ${colorHues.length} (${totalColorValues} values)`);
console.log(`Output: ${outputPath}`);
