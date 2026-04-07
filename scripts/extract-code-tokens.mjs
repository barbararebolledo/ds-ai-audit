/**
 * extract-code-tokens.mjs
 *
 * Extracts code-side design tokens into a normalised format for
 * comparison with Figma Variables. Dispatches to system-specific
 * extraction logic based on the system argument.
 *
 * Supported systems:
 *   - mui: imports @mui/material and calls createTheme()
 *   - carbon: fetches token files from GitHub and parses JS exports
 *
 * Usage:
 *   node scripts/extract-code-tokens.mjs [system]
 *
 * Arguments:
 *   system — slug for the design system (default: 'mui')
 *
 * Output:
 *   scripts/output/{system}-code-tokens.json
 *   (MUI also outputs scripts/output/mui-default-theme.json for backward compat)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, 'output');
const system = process.argv[2] || 'mui';

mkdirSync(outputDir, { recursive: true });

// ---------------------------------------------------------------------------
// Normalised output format
// ---------------------------------------------------------------------------

/**
 * All extractors produce a Map of:
 *   tokenPath -> { value, category }
 *
 * tokenPath: slash-separated path (e.g. 'palette/primary/main')
 * value: resolved value (string, number, or object)
 * category: grouping key (e.g. 'color', 'spacing', 'typography')
 */

// ---------------------------------------------------------------------------
// MUI extractor
// ---------------------------------------------------------------------------

async function extractMui() {
  // Dynamic import so the script doesn't fail when @mui/material isn't installed
  const { createTheme } = await import('@mui/material/styles');
  const muiColors = await import('@mui/material/colors');

  const theme = createTheme();

  function serialise(obj, seen = new WeakSet()) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'function') return `[Function: ${obj.name || 'anonymous'}]`;
    if (typeof obj !== 'object') return obj;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);
    if (Array.isArray(obj)) return obj.map((item) => serialise(item, seen));
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serialise(value, seen);
    }
    return result;
  }

  const serialisable = serialise(theme);

  const colorPalette = {};
  for (const [hueName, hueObj] of Object.entries(muiColors)) {
    if (hueName === 'default' || typeof hueObj !== 'object') continue;
    colorPalette[hueName] = { ...hueObj };
  }

  // Write the full theme for backward compatibility
  const themeOutput = { theme: serialisable, materialColors: colorPalette };
  writeFileSync(
    join(outputDir, 'mui-default-theme.json'),
    JSON.stringify(themeOutput, null, 2),
    'utf-8'
  );

  // Build normalised token map
  const tokens = new Map();

  // Palette colours
  const paletteGroups = [
    'common', 'primary', 'secondary', 'error', 'warning', 'info', 'success',
    'text', 'divider', 'background', 'action',
  ];
  for (const group of paletteGroups) {
    const entry = theme.palette[group];
    if (!entry) continue;
    if (typeof entry === 'string') {
      tokens.set(`palette/${group}`, { value: entry, category: 'palette' });
    } else if (typeof entry === 'object') {
      for (const [key, val] of Object.entries(entry)) {
        if (typeof val === 'string' && !val.startsWith('[Function')) {
          tokens.set(`palette/${group}/${key}`, { value: val, category: 'palette' });
        } else if (typeof val === 'number') {
          tokens.set(`palette/${group}/${key}`, { value: val, category: 'palette' });
        }
      }
    }
  }

  // Grey palette
  if (theme.palette.grey) {
    for (const [key, val] of Object.entries(theme.palette.grey)) {
      tokens.set(`palette/grey/${key}`, { value: val, category: 'palette' });
    }
  }

  // Material colours
  for (const [hueName, hueObj] of Object.entries(colorPalette)) {
    if (typeof hueObj !== 'object') continue;
    for (const [shade, val] of Object.entries(hueObj)) {
      tokens.set(`material/colors/${hueName}/${shade}`, { value: val, category: 'material/colors' });
    }
  }

  // Typography
  const typographyVariants = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'subtitle1', 'subtitle2', 'body1', 'body2',
    'button', 'caption', 'overline',
  ];
  for (const variant of typographyVariants) {
    const entry = theme.typography[variant];
    if (!entry) continue;
    for (const [prop, val] of Object.entries(entry)) {
      if (typeof val === 'string' || typeof val === 'number') {
        tokens.set(`typography/${variant}/${prop}`, { value: val, category: 'typography' });
      }
    }
  }
  for (const prop of ['fontFamily', 'fontSize', 'htmlFontSize', 'fontWeightLight', 'fontWeightRegular', 'fontWeightMedium', 'fontWeightBold']) {
    if (theme.typography[prop] !== undefined) {
      tokens.set(`typography/${prop}`, { value: theme.typography[prop], category: 'typography' });
    }
  }

  // Breakpoints
  for (const [key, val] of Object.entries(theme.breakpoints.values)) {
    tokens.set(`breakpoints/${key}`, { value: val, category: 'breakpoints' });
  }

  // Spacing
  tokens.set('spacing/base', { value: 8, category: 'spacing' });
  for (let i = 1; i <= 12; i++) {
    tokens.set(`spacing/${i}`, { value: i * 8, category: 'spacing' });
  }

  // Shape
  tokens.set('shape/borderRadius', { value: theme.shape.borderRadius, category: 'shape' });

  // Shadows
  if (theme.shadows) {
    theme.shadows.forEach((val, i) => {
      tokens.set(`shadows/${i}`, { value: val, category: 'shadows' });
    });
  }

  // zIndex
  if (theme.zIndex) {
    for (const [key, val] of Object.entries(theme.zIndex)) {
      tokens.set(`zIndex/${key}`, { value: val, category: 'zIndex' });
    }
  }

  // Transitions
  if (theme.transitions && theme.transitions.duration) {
    for (const [key, val] of Object.entries(theme.transitions.duration)) {
      if (typeof val === 'number') {
        tokens.set(`transitions/duration/${key}`, { value: val, category: 'transitions' });
      }
    }
  }
  if (theme.transitions && theme.transitions.easing) {
    for (const [key, val] of Object.entries(theme.transitions.easing)) {
      if (typeof val === 'string') {
        tokens.set(`transitions/easing/${key}`, { value: val, category: 'transitions' });
      }
    }
  }

  const themeKeys = Object.keys(serialisable);
  const colorHues = Object.keys(colorPalette);
  console.log(`MUI theme extracted. Top-level keys: ${themeKeys.join(', ')}`);
  console.log(`Material colour hues: ${colorHues.length}`);

  return tokens;
}

// ---------------------------------------------------------------------------
// Carbon extractor — fetches from GitHub raw URLs
// ---------------------------------------------------------------------------

const CARBON_BRANCH = 'main';
const CARBON_RAW = `https://raw.githubusercontent.com/carbon-design-system/carbon/${CARBON_BRANCH}`;

async function fetchGitHubFile(path) {
  const url = `${CARBON_RAW}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub fetch ${res.status} for ${path}`);
  return res.text();
}

/**
 * Parse Carbon color exports. Handles:
 *   export const blue60 = '#0f62fe';
 *   export const black = '#000000';
 */
function parseColorExports(source) {
  const tokens = new Map();
  const re = /export\s+const\s+(\w+)\s*=\s*'(#[0-9a-fA-F]+)'/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const name = match[1];
    const value = match[2];
    // Split camelCase into hue/shade: blue60 -> blue/60
    const hueMatch = name.match(/^([a-zA-Z]+?)(\d+)$/);
    if (hueMatch) {
      tokens.set(`colors/${hueMatch[1]}/${hueMatch[2]}`, { value, category: 'colors' });
    } else {
      tokens.set(`colors/${name}`, { value, category: 'colors' });
    }
  }
  return tokens;
}

/**
 * Parse Carbon theme file (semantic tokens).
 * Handles both direct hex values and variable references.
 */
function parseThemeExports(source, colorLookup) {
  const tokens = new Map();

  // Match: export const tokenName = hexValue;
  const hexRe = /export\s+const\s+(\w+)\s*=\s*'(#[0-9a-fA-F]+)'/g;
  let match;
  while ((match = hexRe.exec(source)) !== null) {
    tokens.set(`theme/${match[1]}`, { value: match[2], category: 'theme' });
  }

  // Match: export const tokenName = variableName;
  const varRe = /export\s+const\s+(\w+)\s*=\s*([a-zA-Z]\w+)\s*;/g;
  while ((match = varRe.exec(source)) !== null) {
    const name = match[1];
    const ref = match[2];
    // Skip function references and imports
    if (ref === 'undefined' || ref === 'null' || ref === 'true' || ref === 'false') continue;
    // Try to resolve from color lookup
    const resolved = colorLookup.get(ref);
    tokens.set(`theme/${name}`, {
      value: resolved || `[ref:${ref}]`,
      category: 'theme',
    });
  }

  return tokens;
}

/**
 * Parse Carbon spacing/layout exports.
 * Handles: export const spacing01 = miniUnits(0.25);
 */
function parseSpacingExports(source) {
  const tokens = new Map();
  const baseFontSize = 16;

  // miniUnits: miniUnits(n) = n * 0.5rem = n * 8px
  const miniRe = /export\s+const\s+(\w+)\s*=\s*miniUnits\(([\d.]+)\)/g;
  let match;
  while ((match = miniRe.exec(source)) !== null) {
    const name = match[1];
    const multiplier = parseFloat(match[2]);
    const px = multiplier * 8;
    const rem = multiplier * 0.5;
    tokens.set(`spacing/${name}`, { value: `${rem}rem`, category: 'spacing', px });
  }

  // rem(): rem(n) where n is px
  const remRe = /export\s+const\s+(\w+)\s*=\s*rem\(([\d.]+)\)/g;
  while ((match = remRe.exec(source)) !== null) {
    const name = match[1];
    const px = parseFloat(match[2]);
    tokens.set(`spacing/${name}`, { value: `${px / baseFontSize}rem`, category: 'spacing', px });
  }

  // Direct string values like '20rem'
  const strRe = /export\s+const\s+(\w+)\s*=\s*'([\d.]+rem)'/g;
  while ((match = strRe.exec(source)) !== null) {
    tokens.set(`spacing/${match[1]}`, { value: match[2], category: 'spacing' });
  }

  // Breakpoints object
  const bpRe = /(\w+):\s*\{\s*width:\s*'([\d.]+rem)'/g;
  while ((match = bpRe.exec(source)) !== null) {
    const remVal = parseFloat(match[2]);
    tokens.set(`breakpoints/${match[1]}`, { value: remVal * baseFontSize, category: 'breakpoints' });
  }

  return tokens;
}

/**
 * Parse Carbon type scale and styles.
 */
function parseTypeScale(scaleSource) {
  const tokens = new Map();
  // Extract the scale array
  const scaleMatch = scaleSource.match(/export\s+const\s+scale\s*=\s*\[([\d\s,]+)\]/);
  if (scaleMatch) {
    const values = scaleMatch[1].split(',').map((s) => parseInt(s.trim(), 10));
    values.forEach((px, i) => {
      tokens.set(`type/scale/${i}`, { value: px, category: 'typography' });
    });
  }
  return tokens;
}

function parseTypeStyles(source) {
  const tokens = new Map();
  // Match composite type style objects
  // This is a simplified parser — extracts fontSize rem values and fontWeight
  const styleRe = /export\s+const\s+(\w+)\s*=\s*\{([^}]+)\}/g;
  let match;
  while ((match = styleRe.exec(source)) !== null) {
    const name = match[1];
    const body = match[2];

    // fontSize
    const fsMatch = body.match(/fontSize:\s*rem\(scale\[(\d+)\]\)/);
    if (fsMatch) {
      // We'll compute from known scale values
      const scaleIndex = parseInt(fsMatch[1], 10);
      tokens.set(`type/${name}/scaleIndex`, { value: scaleIndex, category: 'typography' });
    }
    const fsDirectMatch = body.match(/fontSize:\s*rem\(([\d.]+)\)/);
    if (fsDirectMatch) {
      const px = parseFloat(fsDirectMatch[1]);
      tokens.set(`type/${name}/fontSize`, { value: `${px / 16}rem`, category: 'typography', px });
    }

    // fontWeight
    const fwMatch = body.match(/fontWeight:\s*fontWeights\.(\w+)/);
    if (fwMatch) {
      const weightMap = { light: 300, regular: 400, semibold: 600 };
      tokens.set(`type/${name}/fontWeight`, { value: weightMap[fwMatch[1]] || fwMatch[1], category: 'typography' });
    }

    // lineHeight
    const lhMatch = body.match(/lineHeight:\s*([\d.]+)/);
    if (lhMatch) {
      tokens.set(`type/${name}/lineHeight`, { value: parseFloat(lhMatch[1]), category: 'typography' });
    }

    // letterSpacing
    const lsMatch = body.match(/letterSpacing:\s*px\(([\d.]+)\)/);
    if (lsMatch) {
      tokens.set(`type/${name}/letterSpacing`, { value: `${lsMatch[1]}px`, category: 'typography' });
    }
  }

  return tokens;
}

/**
 * Parse Carbon motion tokens.
 */
function parseMotionExports(source) {
  const tokens = new Map();

  // Duration: export const fast01 = '70ms';
  const durRe = /export\s+const\s+(\w+)\s*=\s*'(\d+ms)'/g;
  let match;
  while ((match = durRe.exec(source)) !== null) {
    tokens.set(`motion/${match[1]}`, { value: match[2], category: 'motion' });
  }

  // Easing curves
  const easingRe = /(\w+):\s*\{\s*productive:\s*'([^']+)',\s*expressive:\s*'([^']+)'/g;
  while ((match = easingRe.exec(source)) !== null) {
    tokens.set(`motion/easing/${match[1]}/productive`, { value: match[2], category: 'motion' });
    tokens.set(`motion/easing/${match[1]}/expressive`, { value: match[3], category: 'motion' });
  }

  return tokens;
}

async function extractCarbon() {
  console.log('Fetching Carbon token files from GitHub...');

  const tokens = new Map();

  // 1. Primitive colors
  console.log('  Fetching colors...');
  const colorsSource = await fetchGitHubFile('packages/colors/src/colors.js');
  const colorTokens = parseColorExports(colorsSource);
  for (const [k, v] of colorTokens) tokens.set(k, v);

  // Build color lookup for theme resolution
  const colorLookup = new Map();
  const colorVarRe = /export\s+const\s+(\w+)\s*=\s*'(#[0-9a-fA-F]+)'/g;
  let cm;
  while ((cm = colorVarRe.exec(colorsSource)) !== null) {
    colorLookup.set(cm[1], cm[2]);
  }

  // 2. Semantic theme (white theme as default)
  console.log('  Fetching white theme (semantic tokens)...');
  const themeSource = await fetchGitHubFile('packages/themes/src/white.js');
  const themeTokens = parseThemeExports(themeSource, colorLookup);
  for (const [k, v] of themeTokens) tokens.set(k, v);

  // 3. Spacing and layout
  console.log('  Fetching spacing/layout...');
  const layoutSource = await fetchGitHubFile('packages/layout/src/index.js');
  const spacingTokens = parseSpacingExports(layoutSource);
  for (const [k, v] of spacingTokens) tokens.set(k, v);

  // 4. Typography
  console.log('  Fetching type scale...');
  try {
    const scaleSource = await fetchGitHubFile('packages/type/src/scale.js');
    const scaleTokens = parseTypeScale(scaleSource);
    for (const [k, v] of scaleTokens) tokens.set(k, v);
  } catch (e) {
    console.log(`  Warning: could not fetch type scale: ${e.message}`);
  }

  console.log('  Fetching type styles...');
  try {
    const stylesSource = await fetchGitHubFile('packages/type/src/styles.js');
    const styleTokens = parseTypeStyles(stylesSource);
    for (const [k, v] of styleTokens) tokens.set(k, v);
  } catch (e) {
    console.log(`  Warning: could not fetch type styles: ${e.message}`);
  }

  // 5. Motion
  console.log('  Fetching motion tokens...');
  try {
    const motionSource = await fetchGitHubFile('packages/motion/src/index.ts');
    const motionTokens = parseMotionExports(motionSource);
    for (const [k, v] of motionTokens) tokens.set(k, v);
  } catch (e) {
    // Try .js extension as fallback
    try {
      const motionSource = await fetchGitHubFile('packages/motion/src/index.js');
      const motionTokens = parseMotionExports(motionSource);
      for (const [k, v] of motionTokens) tokens.set(k, v);
    } catch (e2) {
      console.log(`  Warning: could not fetch motion tokens: ${e2.message}`);
    }
  }

  console.log(`Carbon tokens extracted: ${tokens.size} total`);
  return tokens;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let tokens;

  if (system === 'mui') {
    tokens = await extractMui();
  } else if (system === 'carbon') {
    tokens = await extractCarbon();
  } else {
    console.error(`Unknown system: ${system}. Supported: mui, carbon`);
    process.exit(1);
  }

  // Write normalised output
  const tokenArray = {};
  for (const [path, data] of tokens) {
    tokenArray[path] = data;
  }

  const output = {
    _meta: {
      system,
      extractedAt: new Date().toISOString(),
      totalTokens: tokens.size,
      categories: [...new Set([...tokens.values()].map((t) => t.category))],
    },
    tokens: tokenArray,
  };

  const outputPath = join(outputDir, `${system}-code-tokens.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // Summary
  const byCat = {};
  for (const t of tokens.values()) {
    byCat[t.category] = (byCat[t.category] || 0) + 1;
  }
  console.log(`\nToken summary by category:`);
  for (const [cat, count] of Object.entries(byCat)) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`\nOutput: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
