/**
 * extract-code-tokens.mjs
 *
 * Extracts code-side design tokens into a mode-aware normalised format
 * for comparison with Figma Variables. A format detector inspects token
 * files and routes to the right reading strategy. Built-in named
 * strategies (mui, carbon) extract every theme/mode the system supports.
 *
 * Output shape:
 *   {
 *     _meta: { system, format, modes, mode_alignment, ... },
 *     tokens: {
 *       "color/primary": {
 *         values: { "light": "#0066cc", "dark": "#3399ff" },
 *         category: "color"
 *       },
 *       "spacing/sm": {
 *         values: { "light": 8, "dark": 8 },
 *         category: "spacing"
 *       }
 *     }
 *   }
 *
 * Supported formats:
 *   mui                — runtime extract via @mui/material/styles (light + dark)
 *   carbon             — Carbon GitHub source files (white, g10, g90, g100)
 *   w3c                — W3C Design Token spec ($value / $type / $extensions.modes)
 *   style-dictionary   — Style Dictionary spec (value / type)
 *   raw-json           — flat or nested JSON with no reserved keys
 *
 * Usage:
 *   node scripts/extract-code-tokens.mjs <system> [--tokens <path>] [--format <name>]
 *
 * Resolution order:
 *   1. --format <name>                              (explicit override)
 *   2. system slug 'mui' or 'carbon'                (named strategy)
 *   3. format detector on --tokens <path>           (signature match)
 *   4. <repo-root>/<system>-tokens-manifest.json    (declared fallback)
 *   5. exit with guidance
 *
 * Output: scripts/output/{system}-code-tokens.json
 */

import {
  readFileSync, writeFileSync, mkdirSync,
  readdirSync, statSync, existsSync,
} from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const outputDir = join(__dirname, 'output');
mkdirSync(outputDir, { recursive: true });

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { system: null, tokens: null, format: null };
  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tokens' && argv[i + 1]) out.tokens = argv[++i];
    else if (a === '--format' && argv[i + 1]) out.format = argv[++i];
    else if (!a.startsWith('--')) positional.push(a);
  }
  out.system = positional[0] || 'mui';
  return out;
}

const args = parseArgs(process.argv);
const system = args.system;

function fail(msg) { console.error(msg); process.exit(1); }

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

function loadManifest(systemSlug) {
  const path = join(repoRoot, `${systemSlug}-tokens-manifest.json`);
  if (!existsSync(path)) return null;
  return { manifest: JSON.parse(readFileSync(path, 'utf-8')), path };
}

function validateManifest(m, manifestPath) {
  if (!m.format) fail(`Manifest ${manifestPath} missing "format".`);
  const validFormats = ['w3c', 'style-dictionary', 'raw-json', 'mui', 'carbon'];
  if (!validFormats.includes(m.format)) {
    fail(`Manifest ${manifestPath} has invalid format "${m.format}". Expected one of: ${validFormats.join(', ')}.`);
  }
  if (m.modes) {
    if (!Array.isArray(m.modes)) fail(`Manifest "modes" must be an array.`);
    for (const mode of m.modes) {
      if (!mode.name) fail(`Each mode entry needs a "name".`);
      if (!mode.source || typeof mode.source !== 'object') {
        fail(`Mode "${mode.name}" missing "source" object.`);
      }
      const sourceKeys = ['files', 'root_key', 'w3c_mode'];
      const present = sourceKeys.filter((k) => k in mode.source);
      if (present.length !== 1) {
        fail(`Mode "${mode.name}" source must have exactly one of: ${sourceKeys.join(', ')}. Got: ${present.join(', ') || 'none'}.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// JSON loading
// ---------------------------------------------------------------------------

function loadJsonFile(absPath) {
  return JSON.parse(readFileSync(absPath, 'utf-8'));
}

function loadJsonFromPath(p) {
  const abs = resolve(repoRoot, p);
  if (!existsSync(abs)) fail(`Tokens path not found: ${abs}`);
  const stat = statSync(abs);
  if (stat.isFile()) {
    if (extname(abs) !== '.json') fail(`Expected a .json file: ${abs}`);
    return { merged: loadJsonFile(abs), sources: [abs] };
  }
  const merged = {};
  const sources = [];
  for (const entry of readdirSync(abs)) {
    if (extname(entry) !== '.json') continue;
    const filePath = join(abs, entry);
    Object.assign(merged, loadJsonFile(filePath));
    sources.push(filePath);
  }
  if (sources.length === 0) fail(`No .json files in: ${abs}`);
  return { merged, sources };
}

function loadModeFiles(tokensRoot, fileList) {
  const merged = {};
  const sources = [];
  for (const rel of fileList) {
    const abs = resolve(repoRoot, tokensRoot, rel);
    if (!existsSync(abs)) fail(`Mode source file not found: ${abs}`);
    Object.assign(merged, loadJsonFile(abs));
    sources.push(abs);
  }
  return { merged, sources };
}

// ---------------------------------------------------------------------------
// Format detector
// ---------------------------------------------------------------------------

function detectFormatFromObject(obj) {
  let sawW3C = false;
  let sawStyleDict = false;
  (function walk(node) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    if ('$value' in node) { sawW3C = true; return; }
    if ('value' in node && (typeof node.value !== 'object' || node.value === null)) {
      sawStyleDict = true;
      return;
    }
    for (const v of Object.values(node)) walk(v);
  })(obj);
  if (sawW3C) return 'w3c';
  if (sawStyleDict) return 'style-dictionary';
  return 'raw-json';
}

// ---------------------------------------------------------------------------
// Generic reader helpers
// ---------------------------------------------------------------------------

function resolveReference(refStr, tree, visited = new Set()) {
  const segs = refStr.replace(/^\{|\}$/g, '').split('.');
  let node = tree;
  for (const seg of segs) {
    if (node && typeof node === 'object' && seg in node) node = node[seg];
    else return null;
  }
  if (node && typeof node === 'object') {
    if ('$value' in node) node = node.$value;
    else if ('value' in node) node = node.value;
  }
  if (typeof node === 'string' && /^\{[^}]+\}$/.test(node)) {
    if (visited.has(node)) return null;
    visited.add(node);
    return resolveReference(node, tree, visited);
  }
  return node;
}

function emitCompositeLeaves(basePath, valueObj, category, tokens) {
  for (const [k, v] of Object.entries(valueObj)) {
    if (v !== null && typeof v === 'object') continue;
    tokens.set(`${basePath}/${k}`, { value: v, category });
  }
}

// ---------------------------------------------------------------------------
// Generic readers — each returns Map<path, {value, category}>
// ---------------------------------------------------------------------------

function readW3C(tree, opts = {}) {
  const { w3cMode = null } = opts;
  const tokens = new Map();
  (function walk(node, pathParts) {
    if (node === null || typeof node !== 'object') return;
    if ('$value' in node) {
      const path = pathParts.join('/');
      const category = node.$type || pathParts[0] || 'token';
      let value = node.$value;
      if (w3cMode && w3cMode !== 'default'
        && node.$extensions && node.$extensions.modes
        && w3cMode in node.$extensions.modes) {
        value = node.$extensions.modes[w3cMode];
      }
      if (typeof value === 'string' && /^\{[^}]+\}$/.test(value)) {
        const resolved = resolveReference(value, tree);
        if (resolved !== null) value = resolved;
      }
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        emitCompositeLeaves(path, value, category, tokens);
      } else {
        tokens.set(path, { value, category });
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      walk(v, [...pathParts, k]);
    }
  })(tree, []);
  return tokens;
}

function readStyleDictionary(tree) {
  const tokens = new Map();
  const isScalarLeaf = (n) =>
    n && typeof n === 'object' && 'value' in n &&
    (typeof n.value !== 'object' || n.value === null);
  const isCompositeLeaf = (n) =>
    n && typeof n === 'object' && 'value' in n &&
    typeof n.value === 'object' && n.value !== null && !Array.isArray(n.value);

  (function walk(node, pathParts) {
    if (node === null || typeof node !== 'object') return;
    if (isScalarLeaf(node)) {
      const path = pathParts.join('/');
      const category = node.type || node.category || pathParts[0] || 'token';
      let value = node.value;
      if (typeof value === 'string' && /^\{[^}]+\}$/.test(value)) {
        const resolved = resolveReference(value, tree);
        if (resolved !== null) value = resolved;
      }
      tokens.set(path, { value, category });
      return;
    }
    if (isCompositeLeaf(node)) {
      const path = pathParts.join('/');
      const category = node.type || node.category || pathParts[0] || 'token';
      emitCompositeLeaves(path, node.value, category, tokens);
      return;
    }
    for (const [k, v] of Object.entries(node)) walk(v, [...pathParts, k]);
  })(tree, []);
  return tokens;
}

function readRawJson(tree) {
  const tokens = new Map();
  (function walk(node, pathParts) {
    if (node === null || node === undefined) return;
    if (typeof node !== 'object' || Array.isArray(node)) {
      const path = pathParts.join('/');
      const category = pathParts[0] || 'token';
      tokens.set(path, { value: node, category });
      return;
    }
    for (const [k, v] of Object.entries(node)) walk(v, [...pathParts, k]);
  })(tree, []);
  return tokens;
}

const GENERIC_READERS = {
  w3c: readW3C,
  'style-dictionary': readStyleDictionary,
  'raw-json': readRawJson,
};

// ---------------------------------------------------------------------------
// Generic strategy orchestrator — handles the three mode source patterns
// ---------------------------------------------------------------------------

async function extractGeneric(format, { tokensPath, manifest }) {
  const reader = GENERIC_READERS[format];
  if (!reader) fail(`No generic reader for format: ${format}`);
  if (!tokensPath) fail(`Format "${format}" requires a tokens_path.`);

  const modes = manifest?.modes ?? [{ name: 'default', source: { files: null } }];
  const perMode = {};

  for (const mode of modes) {
    const src = mode.source;

    if (src.files) {
      const { merged, sources } = loadModeFiles(tokensPath, src.files);
      console.log(`  mode "${mode.name}": loaded ${sources.length} file(s)`);
      perMode[mode.name] = reader(merged);
    } else if (src.root_key) {
      const { merged } = loadJsonFromPath(tokensPath);
      const subtree = merged[src.root_key];
      if (!subtree) fail(`Mode "${mode.name}" root_key "${src.root_key}" not found in ${tokensPath}.`);
      console.log(`  mode "${mode.name}": peeled root key "${src.root_key}"`);
      perMode[mode.name] = reader(subtree);
    } else if (src.w3c_mode) {
      if (format !== 'w3c') fail(`Mode source "w3c_mode" only valid for w3c format (mode "${mode.name}").`);
      const { merged } = loadJsonFromPath(tokensPath);
      console.log(`  mode "${mode.name}": w3c_mode = "${src.w3c_mode}"`);
      perMode[mode.name] = reader(merged, { w3cMode: src.w3c_mode });
    } else if (mode.name === 'default' && !manifest?.modes) {
      const { merged } = loadJsonFromPath(tokensPath);
      perMode[mode.name] = reader(merged);
    } else {
      fail(`Mode "${mode.name}" has no recognised source.`);
    }
  }

  return { perMode, invariant: new Map(), modeNames: modes.map((m) => m.name) };
}

// ---------------------------------------------------------------------------
// MUI strategy — light + dark
// ---------------------------------------------------------------------------

const MUI_MODES = ['light', 'dark'];

async function extractMuiThemeForMode(mode, muiColors, createTheme) {
  const theme = createTheme({ palette: { mode } });
  const tokens = new Map();

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
        if (typeof val === 'string' && !val.toString().startsWith('[Function')) {
          tokens.set(`palette/${group}/${key}`, { value: val, category: 'palette' });
        } else if (typeof val === 'number') {
          tokens.set(`palette/${group}/${key}`, { value: val, category: 'palette' });
        }
      }
    }
  }
  if (theme.palette.grey) {
    for (const [key, val] of Object.entries(theme.palette.grey)) {
      tokens.set(`palette/grey/${key}`, { value: val, category: 'palette' });
    }
  }

  return tokens;
}

function extractMuiInvariantTokens(theme, muiColors) {
  const tokens = new Map();

  for (const [hueName, hueObj] of Object.entries(muiColors)) {
    if (hueName === 'default' || typeof hueObj !== 'object') continue;
    for (const [shade, val] of Object.entries(hueObj)) {
      tokens.set(`material/colors/${hueName}/${shade}`, { value: val, category: 'material/colors' });
    }
  }

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

  for (const [key, val] of Object.entries(theme.breakpoints.values)) {
    tokens.set(`breakpoints/${key}`, { value: val, category: 'breakpoints' });
  }

  tokens.set('spacing/base', { value: 8, category: 'spacing' });
  for (let i = 1; i <= 12; i++) {
    tokens.set(`spacing/${i}`, { value: i * 8, category: 'spacing' });
  }

  tokens.set('shape/borderRadius', { value: theme.shape.borderRadius, category: 'shape' });

  if (theme.shadows) {
    theme.shadows.forEach((val, i) => {
      tokens.set(`shadows/${i}`, { value: val, category: 'shadows' });
    });
  }

  if (theme.zIndex) {
    for (const [key, val] of Object.entries(theme.zIndex)) {
      tokens.set(`zIndex/${key}`, { value: val, category: 'zIndex' });
    }
  }

  if (theme.transitions?.duration) {
    for (const [key, val] of Object.entries(theme.transitions.duration)) {
      if (typeof val === 'number') {
        tokens.set(`transitions/duration/${key}`, { value: val, category: 'transitions' });
      }
    }
  }
  if (theme.transitions?.easing) {
    for (const [key, val] of Object.entries(theme.transitions.easing)) {
      if (typeof val === 'string') {
        tokens.set(`transitions/easing/${key}`, { value: val, category: 'transitions' });
      }
    }
  }

  return tokens;
}

async function extractMui() {
  const { createTheme } = await import('@mui/material/styles');
  const muiColors = await import('@mui/material/colors');

  const perMode = {};
  for (const mode of MUI_MODES) {
    perMode[mode] = await extractMuiThemeForMode(mode, muiColors, createTheme);
  }

  const baseTheme = createTheme({ palette: { mode: 'light' } });
  const invariant = extractMuiInvariantTokens(baseTheme, muiColors);

  console.log(`MUI extracted. Modes: ${MUI_MODES.join(', ')}. Material hues: ${Object.keys(muiColors).filter((k) => k !== 'default').length}`);
  return { perMode, invariant, modeNames: MUI_MODES };
}

// ---------------------------------------------------------------------------
// Carbon strategy — white, g10, g90, g100
// ---------------------------------------------------------------------------

const CARBON_BRANCH = 'main';
const CARBON_RAW = `https://raw.githubusercontent.com/carbon-design-system/carbon/${CARBON_BRANCH}`;
const CARBON_THEMES = ['white', 'g10', 'g90', 'g100'];

async function fetchGitHubFile(path) {
  const url = `${CARBON_RAW}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub fetch ${res.status} for ${path}`);
  return res.text();
}

function parseColorExports(source) {
  const tokens = new Map();
  const re = /export\s+const\s+(\w+)\s*=\s*'(#[0-9a-fA-F]+)'/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const name = match[1];
    const value = match[2];
    const hueMatch = name.match(/^([a-zA-Z]+?)(\d+)$/);
    if (hueMatch) tokens.set(`colors/${hueMatch[1]}/${hueMatch[2]}`, { value, category: 'colors' });
    else tokens.set(`colors/${name}`, { value, category: 'colors' });
  }
  return tokens;
}

function parseThemeExports(source, colorLookup) {
  const tokens = new Map();
  const hexRe = /export\s+const\s+(\w+)\s*=\s*'(#[0-9a-fA-F]+)'/g;
  let match;
  while ((match = hexRe.exec(source)) !== null) {
    tokens.set(`theme/${match[1]}`, { value: match[2], category: 'theme' });
  }
  const varRe = /export\s+const\s+(\w+)\s*=\s*([a-zA-Z]\w+)\s*;/g;
  while ((match = varRe.exec(source)) !== null) {
    const name = match[1];
    const ref = match[2];
    if (['undefined', 'null', 'true', 'false'].includes(ref)) continue;
    const resolved = colorLookup.get(ref);
    tokens.set(`theme/${name}`, { value: resolved || `[ref:${ref}]`, category: 'theme' });
  }
  return tokens;
}

function parseSpacingExports(source) {
  const tokens = new Map();
  const baseFontSize = 16;
  const miniRe = /export\s+const\s+(\w+)\s*=\s*miniUnits\(([\d.]+)\)/g;
  let match;
  while ((match = miniRe.exec(source)) !== null) {
    const name = match[1];
    const multiplier = parseFloat(match[2]);
    tokens.set(`spacing/${name}`, { value: `${multiplier * 0.5}rem`, category: 'spacing', px: multiplier * 8 });
  }
  const remRe = /export\s+const\s+(\w+)\s*=\s*rem\(([\d.]+)\)/g;
  while ((match = remRe.exec(source)) !== null) {
    const name = match[1];
    const px = parseFloat(match[2]);
    tokens.set(`spacing/${name}`, { value: `${px / baseFontSize}rem`, category: 'spacing', px });
  }
  const strRe = /export\s+const\s+(\w+)\s*=\s*'([\d.]+rem)'/g;
  while ((match = strRe.exec(source)) !== null) {
    tokens.set(`spacing/${match[1]}`, { value: match[2], category: 'spacing' });
  }
  const bpRe = /(\w+):\s*\{\s*width:\s*'([\d.]+rem)'/g;
  while ((match = bpRe.exec(source)) !== null) {
    tokens.set(`breakpoints/${match[1]}`, { value: parseFloat(match[2]) * baseFontSize, category: 'breakpoints' });
  }
  return tokens;
}

function parseTypeScale(scaleSource) {
  const tokens = new Map();
  const scaleMatch = scaleSource.match(/export\s+const\s+scale\s*=\s*\[([\d\s,]+)\]/);
  if (scaleMatch) {
    const values = scaleMatch[1].split(',').map((s) => parseInt(s.trim(), 10));
    values.forEach((px, i) => tokens.set(`type/scale/${i}`, { value: px, category: 'typography' }));
  }
  return tokens;
}

function parseTypeStyles(source) {
  const tokens = new Map();
  const styleRe = /export\s+const\s+(\w+)\s*=\s*\{([^}]+)\}/g;
  let match;
  while ((match = styleRe.exec(source)) !== null) {
    const name = match[1];
    const body = match[2];
    const fsMatch = body.match(/fontSize:\s*rem\(scale\[(\d+)\]\)/);
    if (fsMatch) tokens.set(`type/${name}/scaleIndex`, { value: parseInt(fsMatch[1], 10), category: 'typography' });
    const fsDirectMatch = body.match(/fontSize:\s*rem\(([\d.]+)\)/);
    if (fsDirectMatch) {
      const px = parseFloat(fsDirectMatch[1]);
      tokens.set(`type/${name}/fontSize`, { value: `${px / 16}rem`, category: 'typography', px });
    }
    const fwMatch = body.match(/fontWeight:\s*fontWeights\.(\w+)/);
    if (fwMatch) {
      const weightMap = { light: 300, regular: 400, semibold: 600 };
      tokens.set(`type/${name}/fontWeight`, { value: weightMap[fwMatch[1]] || fwMatch[1], category: 'typography' });
    }
    const lhMatch = body.match(/lineHeight:\s*([\d.]+)/);
    if (lhMatch) tokens.set(`type/${name}/lineHeight`, { value: parseFloat(lhMatch[1]), category: 'typography' });
    const lsMatch = body.match(/letterSpacing:\s*px\(([\d.]+)\)/);
    if (lsMatch) tokens.set(`type/${name}/letterSpacing`, { value: `${lsMatch[1]}px`, category: 'typography' });
  }
  return tokens;
}

function parseMotionExports(source) {
  const tokens = new Map();
  const durRe = /export\s+const\s+(\w+)\s*=\s*'(\d+ms)'/g;
  let match;
  while ((match = durRe.exec(source)) !== null) {
    tokens.set(`motion/${match[1]}`, { value: match[2], category: 'motion' });
  }
  const easingRe = /(\w+):\s*\{\s*productive:\s*'([^']+)',\s*expressive:\s*'([^']+)'/g;
  while ((match = easingRe.exec(source)) !== null) {
    tokens.set(`motion/easing/${match[1]}/productive`, { value: match[2], category: 'motion' });
    tokens.set(`motion/easing/${match[1]}/expressive`, { value: match[3], category: 'motion' });
  }
  return tokens;
}

async function fetchCarbonFileWithFallback(basePath, extensions = ['ts', 'js']) {
  let lastErr = null;
  for (const ext of extensions) {
    try {
      return await fetchGitHubFile(`${basePath}.${ext}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function extractCarbon() {
  console.log('Fetching Carbon source files from GitHub...');

  const colorsSource = await fetchCarbonFileWithFallback('packages/colors/src/colors');
  const colorTokens = parseColorExports(colorsSource);

  const colorLookup = new Map();
  const colorVarRe = /export\s+const\s+(\w+)\s*=\s*'(#[0-9a-fA-F]+)'/g;
  let cm;
  while ((cm = colorVarRe.exec(colorsSource)) !== null) colorLookup.set(cm[1], cm[2]);

  const invariant = new Map();
  for (const [k, v] of colorTokens) invariant.set(k, v);

  try {
    const layoutSource = await fetchCarbonFileWithFallback('packages/layout/src/index');
    for (const [k, v] of parseSpacingExports(layoutSource)) invariant.set(k, v);
  } catch (e) { console.log(`  Warning: spacing/layout: ${e.message}`); }

  try {
    const scaleSource = await fetchCarbonFileWithFallback('packages/type/src/scale');
    for (const [k, v] of parseTypeScale(scaleSource)) invariant.set(k, v);
  } catch (e) { console.log(`  Warning: type scale: ${e.message}`); }

  try {
    const stylesSource = await fetchCarbonFileWithFallback('packages/type/src/styles');
    for (const [k, v] of parseTypeStyles(stylesSource)) invariant.set(k, v);
  } catch (e) { console.log(`  Warning: type styles: ${e.message}`); }

  try {
    const motionSource = await fetchCarbonFileWithFallback('packages/motion/src/index');
    for (const [k, v] of parseMotionExports(motionSource)) invariant.set(k, v);
  } catch (e) { console.log(`  Warning: motion: ${e.message}`); }

  const perMode = {};
  for (const theme of CARBON_THEMES) {
    try {
      const themeSource = await fetchCarbonFileWithFallback(`packages/themes/src/${theme}`);
      perMode[theme] = parseThemeExports(themeSource, colorLookup);
      console.log(`  theme "${theme}": ${perMode[theme].size} tokens`);
    } catch (e) {
      console.log(`  Warning: theme "${theme}": ${e.message}`);
      perMode[theme] = new Map();
    }
  }

  return {
    perMode,
    invariant,
    modeNames: CARBON_THEMES,
    modeAlignment: {
      white: 'White Theme',
      g10: 'Gray 10 Theme',
      g90: 'Gray 90 Theme',
      g100: 'Gray 100 Theme',
    },
  };
}

// ---------------------------------------------------------------------------
// Aggregator — produces final broadcast shape
// ---------------------------------------------------------------------------

function aggregate({ perMode, invariant, modeNames }) {
  const allPaths = new Set();
  for (const mode of modeNames) {
    for (const path of perMode[mode]?.keys() || []) allPaths.add(path);
  }
  for (const path of invariant.keys()) allPaths.add(path);

  const tokens = {};
  for (const path of allPaths) {
    const values = {};
    let category = null;

    if (invariant.has(path)) {
      const entry = invariant.get(path);
      category = entry.category;
      for (const mode of modeNames) values[mode] = entry.value;
    }

    for (const mode of modeNames) {
      const entry = perMode[mode]?.get(path);
      if (entry) {
        values[mode] = entry.value;
        category = category ?? entry.category;
      }
    }

    tokens[path] = { values, category: category || 'token' };
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Strategy router
// ---------------------------------------------------------------------------

async function runStrategy(format, { tokensPath, manifest }) {
  if (format === 'mui') return extractMui();
  if (format === 'carbon') return extractCarbon();
  return extractGeneric(format, { tokensPath, manifest });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  let format = args.format;
  let tokensPath = args.tokens;
  let manifest = null;
  let resolutionVia = format ? '--format flag' : null;

  if (!format && (system === 'mui' || system === 'carbon')) {
    format = system;
    resolutionVia = `named strategy "${system}"`;
  }

  if (!format && tokensPath) {
    const { merged } = loadJsonFromPath(tokensPath);
    format = detectFormatFromObject(merged);
    resolutionVia = `format detector on ${tokensPath}`;
  }

  const manifestResult = loadManifest(system);
  if (manifestResult) {
    validateManifest(manifestResult.manifest, manifestResult.path);
    manifest = manifestResult.manifest;
    if (!format) {
      format = manifest.format;
      resolutionVia = `manifest at ${manifestResult.path}`;
    }
    if (!tokensPath && manifest.tokens_path) tokensPath = manifest.tokens_path;
  }

  if (!format) {
    fail([
      `Could not determine token format for system "${system}".`,
      ``,
      `Provide one of:`,
      `  • Built-in named strategy:  extract-code-tokens.mjs mui | carbon`,
      `  • Tokens path for detection: --tokens <file-or-directory>`,
      `  • Explicit format override:  --format <w3c | style-dictionary | raw-json>`,
      `  • Manifest at:               ${join(repoRoot, `${system}-tokens-manifest.json`)}`,
      ``,
      `Manifest shape:`,
      `  {`,
      `    "format": "w3c" | "style-dictionary" | "raw-json" | "mui" | "carbon",`,
      `    "tokens_path": "./relative/path",`,
      `    "modes": [`,
      `      { "name": "light", "source": { "files": ["light.json"] } },`,
      `      { "name": "dark",  "source": { "files": ["dark.json"] } }`,
      `    ],`,
      `    "mode_alignment": { "light": "Light", "dark": "Dark" }`,
      `  }`,
    ].join('\n'));
  }

  console.log(`System:       ${system}`);
  console.log(`Format:       ${format}`);
  console.log(`Resolved via: ${resolutionVia}`);
  if (tokensPath) console.log(`Tokens path:  ${tokensPath}`);

  const strategyResult = await runStrategy(format, { tokensPath, manifest });
  const { perMode, invariant, modeNames } = strategyResult;
  const tokens = aggregate({ perMode, invariant, modeNames });

  const modeAlignment = manifest?.mode_alignment ?? strategyResult.modeAlignment ?? null;
  const categories = [...new Set(Object.values(tokens).map((t) => t.category))];

  const output = {
    _meta: {
      system,
      format,
      tokens_source: tokensPath || null,
      extractedAt: new Date().toISOString(),
      modes: modeNames,
      mode_alignment: modeAlignment,
      totalTokens: Object.keys(tokens).length,
      categories,
    },
    tokens,
  };

  const outputPath = join(outputDir, `${system}-code-tokens.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  const byCat = {};
  for (const t of Object.values(tokens)) byCat[t.category] = (byCat[t.category] || 0) + 1;
  console.log(`\nToken summary by category:`);
  for (const [cat, count] of Object.entries(byCat)) console.log(`  ${cat}: ${count}`);
  console.log(`\nModes:  ${modeNames.join(', ')}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Total:  ${Object.keys(tokens).length} tokens`);
}

main().catch((err) => { console.error(err); process.exit(1); });
