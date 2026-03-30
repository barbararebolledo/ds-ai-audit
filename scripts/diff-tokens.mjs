/**
 * diff-tokens.mjs
 *
 * Compares the MUI default theme (code-side tokens) against the MUI
 * Figma Variables (design-side tokens). Produces a structured diff
 * report flagging:
 *   - Value mismatches (same token, different values)
 *   - Naming mismatches (same concept, different names)
 *   - Code-only tokens (present in code, absent in Figma)
 *   - Figma-only tokens (present in Figma, absent in code)
 *
 * Feeds Cluster 6 dimensions 6.1 (token value parity) and
 * 6.2 (token naming parity).
 *
 * Matching logic handles:
 *   - Cross-collection mapping (palette/grey/* -> material/colors/grey/*)
 *   - Typography structural differences (code sub-properties vs Figma
 *     single-variable fontSize aliases)
 *   - Material colour palette (code @mui/material/colors exports vs
 *     Figma material/colors collection)
 *
 * Usage:
 *   node scripts/diff-tokens.mjs
 *
 * Output:
 *   scripts/output/mui-token-diff.json
 *   audit/material-ui/v2.0/token-parity-findings.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const rawThemeData = JSON.parse(
  readFileSync(join(__dirname, 'output', 'mui-default-theme.json'), 'utf-8')
);
const figmaData = JSON.parse(
  readFileSync(join(__dirname, 'output', 'mui-figma-variables-normalised.json'), 'utf-8')
);

// The extraction script now outputs { theme, materialColors }.
const theme = rawThemeData.theme;
const materialColors = rawThemeData.materialColors;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a Figma variable value to its final value by following alias
 * chains. Returns the resolved value and the chain of aliases traversed.
 */
function resolveFigmaValue(variable, modeName, collections, seen = new Set()) {
  const val = variable.values[modeName];
  if (!val) return { resolved: null, chain: [] };

  if (val && typeof val === 'object' && val.type === 'alias') {
    if (seen.has(val.aliasOfId)) {
      return { resolved: '[circular alias]', chain: [...seen] };
    }
    seen.add(val.aliasOfId);
    for (const col of Object.values(collections)) {
      const target = col.variables.find(
        (v) => v.name === val.aliasOf && col.name === val.aliasOfCollection
      );
      if (target) {
        const deeper = resolveFigmaValue(target, Object.keys(target.values)[0], collections, seen);
        return {
          resolved: deeper.resolved,
          chain: [val.aliasOf, ...deeper.chain],
        };
      }
    }
    return { resolved: `[unresolved alias: ${val.aliasOf}]`, chain: [val.aliasOf] };
  }

  return { resolved: val, chain: [] };
}

/**
 * Parse any CSS colour string to { r, g, b, a } with 0-255 integers and
 * 0-1 alpha. Handles: #rgb, #rrggbb, #rrggbbaa, rgba(r,g,b,a), rgb(r,g,b).
 */
function parseColour(val) {
  if (typeof val !== 'string') return null;
  const s = val.trim().toLowerCase();

  const hexMatch = s.match(/^#([0-9a-f]+)$/);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 3) {
      return { r: parseInt(h[0]+h[0], 16), g: parseInt(h[1]+h[1], 16), b: parseInt(h[2]+h[2], 16), a: 1 };
    }
    if (h.length === 6) {
      return { r: parseInt(h.slice(0,2), 16), g: parseInt(h.slice(2,4), 16), b: parseInt(h.slice(4,6), 16), a: 1 };
    }
    if (h.length === 8) {
      return { r: parseInt(h.slice(0,2), 16), g: parseInt(h.slice(2,4), 16), b: parseInt(h.slice(4,6), 16), a: parseInt(h.slice(6,8), 16) / 255 };
    }
  }

  const rgbaMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgbaMatch) {
    return {
      r: Math.round(parseFloat(rgbaMatch[1])),
      g: Math.round(parseFloat(rgbaMatch[2])),
      b: Math.round(parseFloat(rgbaMatch[3])),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Normalise a colour value for comparison. Converts all formats to a
 * canonical #rrggbb or #rrggbbaa string.
 */
function normaliseColour(val) {
  const parsed = parseColour(String(val));
  if (!parsed) return String(val).toLowerCase().trim();
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  const alphaHex = toHex(Math.round(parsed.a * 255));
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}${alphaHex === 'ff' ? '' : alphaHex}`;
}

/**
 * Convert a CSS rem value to pixels assuming a 16px base.
 * Returns the numeric pixel value, or null if not a rem string.
 * Handles comma as decimal separator (Figma locale).
 */
function remToPx(val) {
  if (typeof val !== 'string') return null;
  // Normalise comma decimal separators to dots.
  const normalised = val.replace(',', '.');
  const match = normalised.match(/^([\d.]+)rem$/);
  if (match) return parseFloat(match[1]) * 16;
  return null;
}

// ---------------------------------------------------------------------------
// Build Figma token map: path -> { value, resolvedType, collection, aliases }
// ---------------------------------------------------------------------------

const figmaTokens = new Map();
const figmaCollections = figmaData.collections;

for (const [colKey, col] of Object.entries(figmaCollections)) {
  if (col.remote) continue;

  for (const variable of col.variables) {
    const primaryMode = col.modes[0];
    const { resolved, chain } = resolveFigmaValue(
      variable, primaryMode, figmaCollections
    );

    const tokenPath = `${col.name}/${variable.name}`;
    figmaTokens.set(tokenPath, {
      name: variable.name,
      collection: col.name,
      resolvedType: variable.resolvedType,
      rawValue: variable.values[primaryMode],
      resolvedValue: resolved,
      aliasChain: chain,
      description: variable.description,
    });
  }
}

// ---------------------------------------------------------------------------
// Build code token map: path -> { value, category }
// ---------------------------------------------------------------------------

const codeTokens = new Map();

// --- Palette colours (semantic layer) ---
const paletteGroups = [
  'common', 'primary', 'secondary', 'error', 'warning', 'info', 'success',
  'text', 'divider', 'background', 'action',
];
for (const group of paletteGroups) {
  const entry = theme.palette[group];
  if (!entry) continue;
  if (typeof entry === 'string') {
    codeTokens.set(`palette/${group}`, { value: entry, category: 'palette' });
  } else if (typeof entry === 'object') {
    for (const [key, val] of Object.entries(entry)) {
      if (typeof val === 'string' && !val.startsWith('[Function')) {
        codeTokens.set(`palette/${group}/${key}`, { value: val, category: 'palette' });
      } else if (typeof val === 'number') {
        codeTokens.set(`palette/${group}/${key}`, { value: val, category: 'palette' });
      }
    }
  }
}

// --- Grey palette (lives under palette in code, under material/colors in Figma) ---
if (theme.palette.grey) {
  for (const [key, val] of Object.entries(theme.palette.grey)) {
    codeTokens.set(`palette/grey/${key}`, { value: val, category: 'palette' });
  }
}

// --- Material colours (primitive palette, Fix 1) ---
// These map to the Figma material/colors collection.
for (const [hueName, hueObj] of Object.entries(materialColors)) {
  if (typeof hueObj !== 'object') continue;
  for (const [shade, val] of Object.entries(hueObj)) {
    codeTokens.set(`material/colors/${hueName}/${shade}`, { value: val, category: 'material/colors' });
  }
}

// --- Typography ---
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
      codeTokens.set(`typography/${variant}/${prop}`, { value: val, category: 'typography' });
    }
  }
}
// Top-level typography props.
for (const prop of ['fontFamily', 'fontSize', 'htmlFontSize', 'fontWeightLight', 'fontWeightRegular', 'fontWeightMedium', 'fontWeightBold']) {
  if (theme.typography[prop] !== undefined) {
    codeTokens.set(`typography/${prop}`, { value: theme.typography[prop], category: 'typography' });
  }
}

// --- Breakpoints ---
for (const [key, val] of Object.entries(theme.breakpoints.values)) {
  codeTokens.set(`breakpoints/${key}`, { value: val, category: 'breakpoints' });
}

// --- Spacing ---
codeTokens.set('spacing/base', { value: 8, category: 'spacing' });
for (let i = 1; i <= 12; i++) {
  codeTokens.set(`spacing/${i}`, { value: i * 8, category: 'spacing' });
}

// --- Shape ---
codeTokens.set('shape/borderRadius', { value: theme.shape.borderRadius, category: 'shape' });

// --- Shadows ---
if (theme.shadows) {
  theme.shadows.forEach((val, i) => {
    codeTokens.set(`shadows/${i}`, { value: val, category: 'shadows' });
  });
}

// --- zIndex ---
if (theme.zIndex) {
  for (const [key, val] of Object.entries(theme.zIndex)) {
    codeTokens.set(`zIndex/${key}`, { value: val, category: 'zIndex' });
  }
}

// --- Transitions ---
if (theme.transitions && theme.transitions.duration) {
  for (const [key, val] of Object.entries(theme.transitions.duration)) {
    if (typeof val === 'number') {
      codeTokens.set(`transitions/duration/${key}`, { value: val, category: 'transitions' });
    }
  }
}
if (theme.transitions && theme.transitions.easing) {
  for (const [key, val] of Object.entries(theme.transitions.easing)) {
    if (typeof val === 'string') {
      codeTokens.set(`transitions/easing/${key}`, { value: val, category: 'transitions' });
    }
  }
}

// ---------------------------------------------------------------------------
// Matching logic (Fixes 2 and 3)
// ---------------------------------------------------------------------------

/**
 * Cross-collection mapping rules. Maps a code token path prefix to
 * the Figma collection where the equivalent variable lives.
 */
const CROSS_COLLECTION_MAPS = [
  // palette/grey/* in code lives in material/colors/grey/* in Figma.
  { codePrefix: 'palette/grey/', figmaCollection: 'material/colors', figmaPrefix: 'grey/' },
  // palette/common/* in code lives in material/colors/common/* in Figma (if it exists).
  { codePrefix: 'palette/common/', figmaCollection: 'material/colors', figmaPrefix: 'common/' },
];

/**
 * Attempt to find the Figma counterpart for a code token path.
 * Returns { figmaPath, figmaToken, matchType } or null.
 *
 * Match strategies (tried in order):
 * 1. Direct path match (collection/name).
 * 2. Cross-collection mapping (palette/grey/* -> material/colors/grey/*).
 * 3. Typography structural match (typography/h1/fontSize -> typography/typography/h1
 *    with rem-to-px conversion).
 */
function findFigmaMatch(codePath) {
  // Strategy 1: Direct match.
  if (figmaTokens.has(codePath)) {
    return { figmaPath: codePath, figmaToken: figmaTokens.get(codePath), matchType: 'direct' };
  }

  // Also try matching by collection + variable name.
  const parts = codePath.split('/');
  const collection = parts[0];
  const varName = parts.slice(1).join('/');
  for (const [figmaPath, token] of figmaTokens) {
    if (token.collection === collection && token.name === varName) {
      return { figmaPath, figmaToken: token, matchType: 'direct' };
    }
  }

  // Strategy 2: Cross-collection mapping.
  for (const map of CROSS_COLLECTION_MAPS) {
    if (codePath.startsWith(map.codePrefix)) {
      const suffix = codePath.slice(map.codePrefix.length);
      const figmaVarName = map.figmaPrefix + suffix;
      for (const [figmaPath, token] of figmaTokens) {
        if (token.collection === map.figmaCollection && token.name === figmaVarName) {
          return { figmaPath, figmaToken: token, matchType: 'cross_collection' };
        }
      }
    }
  }

  // Strategy 3: Typography structural match.
  // Code: typography/{variant}/fontSize = "Xrem"
  // Figma: typography/typography/{variant} = alias -> _fontSize/Xrem (resolves to px)
  if (codePath.startsWith('typography/') && codePath.endsWith('/fontSize')) {
    const variant = codePath.split('/')[1];
    const figmaVarName = `typography/${variant}`;
    for (const [figmaPath, token] of figmaTokens) {
      if (token.collection === 'typography' && token.name === figmaVarName) {
        return { figmaPath, figmaToken: token, matchType: 'typography_fontSize' };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Perform the diff
// ---------------------------------------------------------------------------

const results = {
  matches: [],
  valueMismatches: [],
  namingMismatches: [],
  codeOnly: [],
  figmaOnly: [],
};

const matchedFigmaPaths = new Set();

for (const [codePath, codeToken] of codeTokens) {
  const match = findFigmaMatch(codePath);
  if (!match) {
    results.codeOnly.push({
      codePath,
      value: codeToken.value,
      category: codeToken.category,
    });
    continue;
  }

  matchedFigmaPaths.add(match.figmaPath);
  const { figmaPath, figmaToken, matchType } = match;

  // Compare values.
  let codeVal = codeToken.value;
  let figmaVal = figmaToken.resolvedValue;

  // Typography fontSize: convert code rem to px for comparison.
  if (matchType === 'typography_fontSize') {
    const codePx = remToPx(String(codeVal));
    if (codePx !== null && typeof figmaVal === 'number') {
      codeVal = codePx;
    }
  }

  // Normalise colours for comparison.
  if (figmaToken.resolvedType === 'COLOR' || (typeof codeVal === 'string' && codeVal.startsWith('#'))) {
    codeVal = normaliseColour(String(codeVal));
    figmaVal = normaliseColour(String(figmaVal));
  }

  // Normalise numbers.
  if (typeof codeVal === 'number' && typeof figmaVal === 'string') {
    figmaVal = parseFloat(figmaVal);
  }
  if (typeof codeVal === 'string' && typeof figmaVal === 'number') {
    const parsed = parseFloat(codeVal);
    if (!isNaN(parsed)) codeVal = parsed;
  }

  const valuesMatch = String(codeVal) === String(figmaVal);
  // For cross-collection and structural matches, names intentionally differ.
  const namesMatch = codePath === figmaPath;
  const isStructuralMatch = matchType === 'cross_collection' || matchType === 'typography_fontSize';

  if (valuesMatch && (namesMatch || isStructuralMatch)) {
    results.matches.push({
      codePath,
      figmaPath,
      value: codeToken.value,
      matchType,
    });
  } else if (!valuesMatch) {
    results.valueMismatches.push({
      codePath,
      figmaPath,
      codeValue: codeToken.value,
      figmaValue: figmaToken.resolvedValue,
      figmaRawValue: figmaToken.rawValue,
      aliasChain: figmaToken.aliasChain,
      category: codeToken.category,
      matchType,
    });
  } else if (!namesMatch && !isStructuralMatch) {
    results.namingMismatches.push({
      codePath,
      figmaPath,
      value: codeToken.value,
      matchType,
    });
  }
}

// Figma-only: tokens in Figma not matched to any code token.
for (const [figmaPath, token] of figmaTokens) {
  if (!matchedFigmaPaths.has(figmaPath)) {
    results.figmaOnly.push({
      figmaPath,
      name: token.name,
      collection: token.collection,
      resolvedType: token.resolvedType,
      resolvedValue: token.resolvedValue,
    });
  }
}

// ---------------------------------------------------------------------------
// Summary statistics
// ---------------------------------------------------------------------------

const summary = {
  codeTokenCount: codeTokens.size,
  figmaTokenCount: figmaTokens.size,
  matches: results.matches.length,
  valueMismatches: results.valueMismatches.length,
  namingMismatches: results.namingMismatches.length,
  codeOnly: results.codeOnly.length,
  figmaOnly: results.figmaOnly.length,
  matchBreakdown: {
    direct: results.matches.filter(m => m.matchType === 'direct').length,
    cross_collection: results.matches.filter(m => m.matchType === 'cross_collection').length,
    typography_fontSize: results.matches.filter(m => m.matchType === 'typography_fontSize').length,
  },
  parityScore_6_1: null,
  parityScore_6_2: null,
};

// Dimension 6.1: Token value parity.
const totalMatched = results.matches.length + results.valueMismatches.length;
summary.parityScore_6_1 = totalMatched > 0
  ? Math.round((results.matches.length / totalMatched) * 100)
  : 0;

// Dimension 6.2: Token naming parity.
const totalComparable = totalMatched + results.namingMismatches.length;
summary.parityScore_6_2 = totalComparable > 0
  ? Math.round(((results.matches.length + results.valueMismatches.length) / totalComparable) * 100)
  : 0;

// ---------------------------------------------------------------------------
// Output: detailed diff
// ---------------------------------------------------------------------------

const diffOutput = {
  _meta: {
    generatedAt: new Date().toISOString(),
    codeSource: 'scripts/output/mui-default-theme.json',
    figmaSource: 'scripts/output/mui-figma-variables-normalised.json',
    description: 'Token parity diff between MUI code theme and Figma Variables. Feeds Cluster 6 dimensions 6.1 and 6.2.',
    matchStrategies: [
      'direct: same collection and variable path',
      'cross_collection: palette/grey/* matched to material/colors/grey/*, palette/common/* to material/colors/common/*',
      'typography_fontSize: code typography/{variant}/fontSize (rem) matched to Figma typography/typography/{variant} (px via alias)',
    ],
  },
  summary,
  results,
};

const diffPath = join(__dirname, 'output', 'mui-token-diff.json');
writeFileSync(diffPath, JSON.stringify(diffOutput, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Output: audit findings (compatible with v1.4 schema Finding format)
// ---------------------------------------------------------------------------

const findings = [];
let findingCounter = 1;

function fid(n) {
  return `TVP-${String(n).padStart(3, '0')}`;
}

// Value mismatches: specific recommendations per mismatch type.
for (const m of results.valueMismatches) {
  let recommendation;
  if (m.codePath.includes('fontFamily')) {
    recommendation = 'Figma stores only the primary font family; code includes the full fallback stack. This is a structural scope difference, not a bug. Document the fallback stack in the Figma variable description for parity.';
  } else if (m.codePath === 'breakpoints/xs') {
    recommendation = 'Code defines xs as the minimum bound (0px); Figma defines it as a design breakpoint (444px). These are different semantic uses of the same name. Align on the meaning or rename the Figma variable to avoid confusion.';
  } else if (m.category === 'palette') {
    recommendation = `Colour value drift between code and Figma. Code has ${m.codeValue}, Figma resolves to ${m.figmaValue}${m.aliasChain.length > 0 ? ' via alias chain ' + m.aliasChain.join(' -> ') : ''}. Determine the authoritative source and correct the other.`;
  } else {
    recommendation = 'Align the token value between code and Figma. Determine which source is authoritative and update the other.';
  }

  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_value_parity',
    severity: 'warning',
    node_id: null,
    node_name: null,
    description: `Token value mismatch: "${m.codePath}" has value "${m.codeValue}" in code but resolves to "${m.figmaValue}" in Figma.`,
    evidence: [
      `Code: ${m.codePath} = ${JSON.stringify(m.codeValue)}`,
      `Figma: ${m.figmaPath} = ${JSON.stringify(m.figmaValue)}`,
      m.aliasChain.length > 0
        ? `Alias chain: ${m.aliasChain.join(' -> ')}`
        : 'No alias chain (direct value)',
      `Match type: ${m.matchType}`,
    ],
    recommendation,
    contract_ref: {
      type: 'token_definition',
      level: 'primitive',
      path: null,
      field: m.codePath,
    },
    auto_fixable: false,
  });
}

// Code-only tokens grouped by category.
const codeOnlyByCategory = {};
for (const t of results.codeOnly) {
  if (!codeOnlyByCategory[t.category]) codeOnlyByCategory[t.category] = [];
  codeOnlyByCategory[t.category].push(t.codePath);
}

// Severity assignment per category.
const categorySeverity = {
  shadows: 'note',
  zIndex: 'note',
  transitions: 'note',
  'material/colors': 'note', // Accent shades (A100-A700) missing from Figma are expected.
};

for (const [category, paths] of Object.entries(codeOnlyByCategory)) {
  const severity = categorySeverity[category] || 'warning';

  let recommendation;
  if (category === 'typography') {
    recommendation = 'Figma stores typography variants as single fontSize variables. Code defines five sub-properties per variant (fontFamily, fontWeight, fontSize, lineHeight, letterSpacing). The fontSize sub-property is matched via structural mapping. The remaining sub-properties (fontWeight per variant, lineHeight, letterSpacing) have no Figma Variable equivalent because Figma binds these as text style properties rather than variables. Document this structural gap.';
  } else if (category === 'material/colors') {
    recommendation = 'These colour values exist in the code @mui/material/colors module but have no matching Figma Variable. May include accent shades (A100-A700) or hues not in the Figma file (brown, common). Document which are intentional omissions vs gaps.';
  } else {
    recommendation = `Create Figma Variables for ${category} tokens, or document the gap as intentional in the parity gap register (Dimension 6.6).`;
  }

  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_value_parity',
    severity,
    node_id: null,
    node_name: null,
    description: `${paths.length} ${category} tokens exist in code but have no Figma Variable counterpart.`,
    evidence: paths.length <= 10 ? paths : [...paths.slice(0, 10), `... and ${paths.length - 10} more`],
    recommendation,
    contract_ref: {
      type: 'token_definition',
      level: 'primitive',
      path: null,
      field: null,
    },
    auto_fixable: false,
  });
}

// Figma-only summary (grouped by collection).
const figmaOnlyByCollection = {};
for (const t of results.figmaOnly) {
  if (!figmaOnlyByCollection[t.collection]) figmaOnlyByCollection[t.collection] = [];
  figmaOnlyByCollection[t.collection].push(t.name);
}
for (const [collection, names] of Object.entries(figmaOnlyByCollection)) {
  let recommendation;
  if (collection === 'palette') {
    recommendation = 'These Figma palette variables include _states/* variants (hover, selected, focus, focusVisible, outlinedBorder) that are computed at runtime in code via alpha()/lighten()/darken() rather than declared as static tokens. They are not absent from code but are derived values. Document this as a structural difference in how state colours are produced.';
  } else if (collection === 'typography') {
    recommendation = 'These are internal Figma variables (_fontSize/* lookup values) used as alias targets for typography variants. They have no direct code counterpart because code stores fontSize as a CSS rem string per variant. This is Figma-internal plumbing, not a parity gap.';
  } else if (collection === 'metadata') {
    recommendation = 'Version metadata variables (material-ui, mui-x) are Figma-only. They have no token equivalent in code. Not a parity gap.';
  } else {
    recommendation = 'Determine whether these variables map to a different code path or are Figma-only design tokens. Document the mapping or the gap.';
  }

  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_naming_parity',
    severity: 'note',
    node_id: null,
    node_name: null,
    description: `${names.length} variables in Figma collection "${collection}" have no direct code theme counterpart.`,
    evidence: names.length <= 10 ? names : [...names.slice(0, 10), `... and ${names.length - 10} more`],
    recommendation,
    contract_ref: {
      type: 'token_definition',
      level: 'primitive',
      path: null,
      field: null,
    },
    auto_fixable: false,
  });
}

const findingsOutput = {
  _meta: {
    generatedAt: new Date().toISOString(),
    schema_version: '1.4',
    description: 'Token parity findings for MUI. Cluster 6 dimensions 6.1 and 6.2. Generated by diff-tokens.mjs.',
    note: 'Finding IDs use TVP prefix (Token Value/naming Parity). Cross-collection and structural matching applied.',
  },
  summary: {
    total_findings: findings.length,
    by_severity: {
      blocker: findings.filter((f) => f.severity === 'blocker').length,
      warning: findings.filter((f) => f.severity === 'warning').length,
      note: findings.filter((f) => f.severity === 'note').length,
    },
    parity_scores: {
      '6.1_token_value_parity': summary.parityScore_6_1,
      '6.2_token_naming_parity': summary.parityScore_6_2,
    },
  },
  findings,
};

const findingsDir = join(repoRoot, 'audit', 'material-ui', 'v2.0');
mkdirSync(findingsDir, { recursive: true });
const findingsPath = join(findingsDir, 'token-parity-findings.json');
writeFileSync(findingsPath, JSON.stringify(findingsOutput, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

console.log('=== MUI Token Parity Diff ===');
console.log(`Code tokens:       ${summary.codeTokenCount}`);
console.log(`Figma tokens:      ${summary.figmaTokenCount}`);
console.log(`Matched (same):    ${summary.matches}`);
console.log(`  Direct:          ${summary.matchBreakdown.direct}`);
console.log(`  Cross-collection:${summary.matchBreakdown.cross_collection}`);
console.log(`  Typography font: ${summary.matchBreakdown.typography_fontSize}`);
console.log(`Value mismatches:  ${summary.valueMismatches}`);
console.log(`Naming mismatches: ${summary.namingMismatches}`);
console.log(`Code-only:         ${summary.codeOnly}`);
console.log(`Figma-only:        ${summary.figmaOnly}`);
console.log('');
console.log(`Dimension 6.1 (value parity):  ${summary.parityScore_6_1}%`);
console.log(`Dimension 6.2 (naming parity): ${summary.parityScore_6_2}%`);
console.log('');
console.log(`Diff output:     ${diffPath}`);
console.log(`Findings output: ${findingsPath}`);
console.log(`Total findings:  ${findings.length}`);
