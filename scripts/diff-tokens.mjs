/**
 * diff-tokens.mjs
 *
 * Compares code-side tokens against Figma Variables (design-side tokens).
 * Produces a structured diff report flagging:
 *   - Value mismatches (same token, different values)
 *   - Naming mismatches (same concept, different names)
 *   - Code-only tokens (present in code, absent in Figma)
 *   - Figma-only tokens (present in Figma, absent in code)
 *
 * Feeds Cluster 6 dimensions 6.1 (token value parity) and
 * 6.2 (token naming parity).
 *
 * Usage:
 *   node scripts/diff-tokens.mjs [system]
 *
 * Arguments:
 *   system — slug for the design system (default: 'mui')
 *
 * Output:
 *   scripts/output/{system}-token-diff.json
 *   audit/{system}/v2.2/token-parity-findings.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const system = process.argv[2] || 'mui';

// ---------------------------------------------------------------------------
// Load data — system-agnostic file names
// ---------------------------------------------------------------------------

const figmaPath = join(__dirname, 'output', `${system}-figma-variables-normalised.json`);
const codePath = join(__dirname, 'output', `${system}-code-tokens.json`);

// For MUI backward compatibility, also check the old file names
let rawCodeData;
if (system === 'mui' && !existsSync(codePath) && existsSync(join(__dirname, 'output', 'mui-default-theme.json'))) {
  // Legacy MUI path: read from mui-default-theme.json and build token map inline
  rawCodeData = null; // Will use legacy path
} else {
  rawCodeData = JSON.parse(readFileSync(codePath, 'utf-8'));
}

const figmaData = JSON.parse(readFileSync(figmaPath, 'utf-8'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function normaliseColour(val) {
  const parsed = parseColour(String(val));
  if (!parsed) return String(val).toLowerCase().trim();
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0');
  const alphaHex = toHex(Math.round(parsed.a * 255));
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}${alphaHex === 'ff' ? '' : alphaHex}`;
}

function remToPx(val) {
  if (typeof val !== 'string') return null;
  const normalised = val.replace(',', '.');
  const match = normalised.match(/^([\d.]+)rem$/);
  if (match) return parseFloat(match[1]) * 16;
  return null;
}

// ---------------------------------------------------------------------------
// Build Figma token map
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
// Build code token map
// ---------------------------------------------------------------------------

const codeTokens = new Map();

if (rawCodeData && rawCodeData.tokens) {
  // New normalised format from extract-code-tokens.mjs
  for (const [path, data] of Object.entries(rawCodeData.tokens)) {
    codeTokens.set(path, { value: data.value, category: data.category });
  }
} else if (system === 'mui') {
  // Legacy MUI path: read from mui-default-theme.json
  const legacyData = JSON.parse(
    readFileSync(join(__dirname, 'output', 'mui-default-theme.json'), 'utf-8')
  );
  const theme = legacyData.theme;
  const materialColors = legacyData.materialColors;

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

  if (theme.palette.grey) {
    for (const [key, val] of Object.entries(theme.palette.grey)) {
      codeTokens.set(`palette/grey/${key}`, { value: val, category: 'palette' });
    }
  }

  for (const [hueName, hueObj] of Object.entries(materialColors)) {
    if (typeof hueObj !== 'object') continue;
    for (const [shade, val] of Object.entries(hueObj)) {
      codeTokens.set(`material/colors/${hueName}/${shade}`, { value: val, category: 'material/colors' });
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
        codeTokens.set(`typography/${variant}/${prop}`, { value: val, category: 'typography' });
      }
    }
  }
  for (const prop of ['fontFamily', 'fontSize', 'htmlFontSize', 'fontWeightLight', 'fontWeightRegular', 'fontWeightMedium', 'fontWeightBold']) {
    if (theme.typography[prop] !== undefined) {
      codeTokens.set(`typography/${prop}`, { value: theme.typography[prop], category: 'typography' });
    }
  }

  for (const [key, val] of Object.entries(theme.breakpoints.values)) {
    codeTokens.set(`breakpoints/${key}`, { value: val, category: 'breakpoints' });
  }

  codeTokens.set('spacing/base', { value: 8, category: 'spacing' });
  for (let i = 1; i <= 12; i++) {
    codeTokens.set(`spacing/${i}`, { value: i * 8, category: 'spacing' });
  }

  codeTokens.set('shape/borderRadius', { value: theme.shape.borderRadius, category: 'shape' });

  if (theme.shadows) {
    theme.shadows.forEach((val, i) => {
      codeTokens.set(`shadows/${i}`, { value: val, category: 'shadows' });
    });
  }

  if (theme.zIndex) {
    for (const [key, val] of Object.entries(theme.zIndex)) {
      codeTokens.set(`zIndex/${key}`, { value: val, category: 'zIndex' });
    }
  }

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
}

// ---------------------------------------------------------------------------
// System-specific matching strategies
// ---------------------------------------------------------------------------

/**
 * MUI cross-collection mapping rules.
 */
const MUI_CROSS_COLLECTION_MAPS = [
  { codePrefix: 'palette/grey/', figmaCollection: 'material/colors', figmaPrefix: 'grey/' },
  { codePrefix: 'palette/common/', figmaCollection: 'material/colors', figmaPrefix: 'common/' },
];

/**
 * Carbon matching strategies.
 * Carbon code uses colors/{hue}/{shade}, Figma may use different collection names.
 */
const CARBON_CROSS_COLLECTION_MAPS = [
  // Carbon primitive colors in code map to Figma color collections
  // These will be populated based on actual Figma collection names discovered
];

const crossCollectionMaps = system === 'mui' ? MUI_CROSS_COLLECTION_MAPS : CARBON_CROSS_COLLECTION_MAPS;

// ---------------------------------------------------------------------------
// Matching logic
// ---------------------------------------------------------------------------

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
  for (const map of crossCollectionMaps) {
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

  // Strategy 3: Typography structural match (MUI-specific).
  if (system === 'mui' && codePath.startsWith('typography/') && codePath.endsWith('/fontSize')) {
    const variant = codePath.split('/')[1];
    const figmaVarName = `typography/${variant}`;
    for (const [figmaPath, token] of figmaTokens) {
      if (token.collection === 'typography' && token.name === figmaVarName) {
        return { figmaPath, figmaToken: token, matchType: 'typography_fontSize' };
      }
    }
  }

  // Strategy 4: Carbon color matching — try normalised colour comparison
  if (system === 'carbon' && codePath.startsWith('colors/')) {
    // Try to find a Figma variable with the same resolved hex value
    const codeToken = codeTokens.get(codePath);
    if (codeToken && typeof codeToken.value === 'string' && codeToken.value.startsWith('#')) {
      const normalised = normaliseColour(codeToken.value);
      for (const [figmaPath, token] of figmaTokens) {
        if (token.resolvedType === 'COLOR') {
          const figmaNorm = normaliseColour(String(token.resolvedValue));
          if (normalised === figmaNorm) {
            return { figmaPath, figmaToken: token, matchType: 'color_value_match' };
          }
        }
      }
    }
  }

  // Strategy 5: Carbon theme token matching — try name similarity
  if (system === 'carbon' && codePath.startsWith('theme/')) {
    const tokenName = codePath.replace('theme/', '');
    // Carbon Figma may use different collection structures
    for (const [figmaPath, token] of figmaTokens) {
      // Try case-insensitive name match
      if (token.name.replace(/[\s/\-_]/g, '').toLowerCase() === tokenName.toLowerCase()) {
        return { figmaPath, figmaToken: token, matchType: 'name_normalised' };
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
  const namesMatch = codePath === figmaPath;
  const isStructuralMatch = matchType === 'cross_collection' || matchType === 'typography_fontSize' || matchType === 'color_value_match' || matchType === 'name_normalised';

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

// Figma-only
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
  matchBreakdown: {},
  parityScore_6_1: null,
  parityScore_6_2: null,
};

// Count match types
for (const m of results.matches) {
  summary.matchBreakdown[m.matchType] = (summary.matchBreakdown[m.matchType] || 0) + 1;
}

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
    system,
    generatedAt: new Date().toISOString(),
    codeSource: `scripts/output/${system}-code-tokens.json`,
    figmaSource: `scripts/output/${system}-figma-variables-normalised.json`,
    description: `Token parity diff between ${system} code tokens and Figma Variables. Feeds Cluster 6 dimensions 6.1 and 6.2.`,
  },
  summary,
  results,
};

const diffPath = join(__dirname, 'output', `${system}-token-diff.json`);
writeFileSync(diffPath, JSON.stringify(diffOutput, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Output: audit findings
// ---------------------------------------------------------------------------

const findings = [];
let findingCounter = 1;

function fid(n) {
  return `TVP-${String(n).padStart(3, '0')}`;
}

// Value mismatches
for (const m of results.valueMismatches) {
  let recommendation;
  if (system === 'mui') {
    if (m.codePath.includes('fontFamily')) {
      recommendation = 'Figma stores only the primary font family; code includes the full fallback stack. This is a structural scope difference, not a bug. Document the fallback stack in the Figma variable description for parity.';
    } else if (m.codePath === 'breakpoints/xs') {
      recommendation = 'Code defines xs as the minimum bound (0px); Figma defines it as a design breakpoint (444px). These are different semantic uses of the same name. Align on the meaning or rename the Figma variable to avoid confusion.';
    } else if (m.category === 'palette') {
      recommendation = `Colour value drift between code and Figma. Code has ${m.codeValue}, Figma resolves to ${m.figmaValue}${m.aliasChain.length > 0 ? ' via alias chain ' + m.aliasChain.join(' -> ') : ''}. Determine the authoritative source and correct the other.`;
    } else {
      recommendation = 'Align the token value between code and Figma. Determine which source is authoritative and update the other.';
    }
  } else {
    recommendation = `Token value mismatch: code has "${m.codeValue}", Figma has "${m.figmaValue}". Determine the authoritative source and align.`;
  }

  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_value_parity',
    severity: 'warning',
    severity_rank: 2,
    node_id: null,
    node_name: null,
    summary: `Value mismatch: ${m.codePath}`,
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

for (const [category, paths] of Object.entries(codeOnlyByCategory)) {
  const severity = (category === 'shadows' || category === 'zIndex' || category === 'transitions' || category === 'material/colors') ? 'note' : 'warning';

  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_value_parity',
    severity,
    severity_rank: severity === 'warning' ? 2 : 1,
    node_id: null,
    node_name: null,
    summary: `${paths.length} ${category} tokens exist in code only`,
    description: `${paths.length} ${category} tokens exist in code but have no Figma Variable counterpart.`,
    evidence: paths.length <= 10 ? paths : [...paths.slice(0, 10), `... and ${paths.length - 10} more`],
    recommendation: `Create Figma Variables for ${category} tokens, or document the gap as intentional in the parity gap register (Dimension 6.6).`,
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
  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_naming_parity',
    severity: 'note',
    severity_rank: 1,
    node_id: null,
    node_name: null,
    summary: `${names.length} Figma-only variables in "${collection}"`,
    description: `${names.length} variables in Figma collection "${collection}" have no direct code token counterpart.`,
    evidence: names.length <= 10 ? names : [...names.slice(0, 10), `... and ${names.length - 10} more`],
    recommendation: 'Determine whether these variables map to a different code path or are Figma-only design tokens. Document the mapping or the gap.',
    contract_ref: {
      type: 'token_definition',
      level: 'primitive',
      path: null,
      field: null,
    },
    auto_fixable: false,
  });
}

const auditDir = system === 'mui' ? 'material-ui' : system;
const findingsOutput = {
  _meta: {
    generatedAt: new Date().toISOString(),
    schema_version: '2.2',
    system,
    description: `Token parity findings for ${system}. Cluster 6 dimensions 6.1 and 6.2. Generated by diff-tokens.mjs.`,
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

const findingsDir = join(repoRoot, 'audit', auditDir, 'v2.2');
mkdirSync(findingsDir, { recursive: true });
const findingsPath = join(findingsDir, 'token-parity-findings.json');
writeFileSync(findingsPath, JSON.stringify(findingsOutput, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

console.log(`=== ${system.toUpperCase()} Token Parity Diff ===`);
console.log(`Code tokens:       ${summary.codeTokenCount}`);
console.log(`Figma tokens:      ${summary.figmaTokenCount}`);
console.log(`Matched (same):    ${summary.matches}`);
for (const [type, count] of Object.entries(summary.matchBreakdown)) {
  console.log(`  ${type}: ${count}`);
}
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
