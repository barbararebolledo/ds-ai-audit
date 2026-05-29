/**
 * diff-tokens.mjs
 *
 * Compares code-side tokens against Figma Variables (design-side tokens),
 * per mode. Produces a structured diff report flagging:
 *   - Value mismatches (same token path, different values in a mode)
 *   - Naming mismatches (same concept, different names)
 *   - Code-only tokens (present in code, absent in Figma)
 *   - Figma-only tokens (present in Figma, absent in code)
 *
 * Feeds Cluster 6 dimensions 6.1 (token value parity) and
 * 6.2 (token naming parity). Both scores reported per-mode and overall.
 *
 * Usage:
 *   node scripts/diff-tokens.mjs [system]
 *
 * Inputs:
 *   scripts/output/{system}-code-tokens.json
 *   scripts/output/{system}-figma-variables-normalised.json
 *
 * Outputs:
 *   scripts/output/{system}-token-diff.json
 *   audit/{system}/v3.3/token-parity-findings.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const system = process.argv[2] || 'mui';

// ---------------------------------------------------------------------------
// Load data — new shape only; no legacy fallback
// ---------------------------------------------------------------------------

const figmaPath = join(__dirname, 'output', `${system}-figma-variables-normalised.json`);
const codePath = join(__dirname, 'output', `${system}-code-tokens.json`);

if (!existsSync(codePath)) {
  console.error([
    `Error: ${codePath} not found.`,
    `Run: node scripts/extract-code-tokens.mjs ${system} [--tokens <path>]`,
  ].join('\n'));
  process.exit(1);
}

if (!existsSync(figmaPath)) {
  console.error([
    `Error: ${figmaPath} not found.`,
    `Fetch + normalise Figma Variables first.`,
  ].join('\n'));
  process.exit(1);
}

const figmaData = JSON.parse(readFileSync(figmaPath, 'utf-8'));
const codeData = JSON.parse(readFileSync(codePath, 'utf-8'));

const codeModes = codeData._meta?.modes || ['default'];
const modeAlignmentOverride = codeData._meta?.mode_alignment || null;

// ---------------------------------------------------------------------------
// Helpers — value resolution and normalisation
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
        const targetMode = modeName in target.values
          ? modeName
          : Object.keys(target.values)[0];
        const deeper = resolveFigmaValue(target, targetMode, collections, seen);
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
    if (h.length === 3) return { r: parseInt(h[0]+h[0], 16), g: parseInt(h[1]+h[1], 16), b: parseInt(h[2]+h[2], 16), a: 1 };
    if (h.length === 6) return { r: parseInt(h.slice(0,2), 16), g: parseInt(h.slice(2,4), 16), b: parseInt(h.slice(4,6), 16), a: 1 };
    if (h.length === 8) return { r: parseInt(h.slice(0,2), 16), g: parseInt(h.slice(2,4), 16), b: parseInt(h.slice(4,6), 16), a: parseInt(h.slice(6,8), 16) / 255 };
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
// Build a complete Figma token map for a given primary mode
//
// For each variable, picks the value from the requested mode if its
// collection has it; otherwise falls back to the collection's first mode.
// This restores the v1.x single-mode behaviour for collections that don't
// participate in the code-side mode dimension (single-mode collections like
// spacing, or collections with a different mode axis like responsive).
// ---------------------------------------------------------------------------

function buildFigmaTokenMapForMode(figmaCollections, primaryMode) {
  const map = new Map();
  for (const col of Object.values(figmaCollections)) {
    if (col.remote) continue;
    const figmaMode = col.modes.includes(primaryMode) ? primaryMode : col.modes[0];
    for (const variable of col.variables) {
      const { resolved, chain } = resolveFigmaValue(variable, figmaMode, figmaCollections);
      const tokenPath = `${col.name}/${variable.name}`;
      map.set(tokenPath, {
        name: variable.name,
        collection: col.name,
        resolvedType: variable.resolvedType,
        rawValue: variable.values[figmaMode],
        resolvedValue: resolved,
        aliasChain: chain,
        description: variable.description,
        sourceMode: figmaMode,
      });
    }
  }
  return map;
}

function listAllFigmaModes(figmaCollections) {
  const set = new Set();
  for (const col of Object.values(figmaCollections)) {
    if (col.remote) continue;
    for (const m of col.modes) set.add(m);
  }
  return [...set];
}

// ---------------------------------------------------------------------------
// Build per-mode code token maps from new broadcast shape
// ---------------------------------------------------------------------------

function buildCodeTokenMapsByMode(codeData, modes) {
  const byMode = {};
  for (const mode of modes) byMode[mode] = new Map();
  for (const [path, entry] of Object.entries(codeData.tokens)) {
    if (!entry.values) continue;
    for (const mode of modes) {
      if (mode in entry.values) {
        byMode[mode].set(path, { value: entry.values[mode], category: entry.category });
      }
    }
  }
  return byMode;
}

// ---------------------------------------------------------------------------
// Mode alignment
// ---------------------------------------------------------------------------

function alignModes(codeModes, figmaModes, alignmentOverride) {
  const pairs = [];
  const unalignedCode = [];
  const matchedFigma = new Set();

  for (const codeMode of codeModes) {
    let figmaMode = null;
    if (alignmentOverride && alignmentOverride[codeMode]
        && figmaModes.includes(alignmentOverride[codeMode])) {
      figmaMode = alignmentOverride[codeMode];
    }
    if (!figmaMode) {
      const lc = codeMode.toLowerCase();
      figmaMode = figmaModes.find((m) => m.toLowerCase() === lc) || null;
    }
    if (figmaMode) {
      pairs.push({ code: codeMode, figma: figmaMode });
      matchedFigma.add(figmaMode);
    } else {
      unalignedCode.push(codeMode);
    }
  }
  return {
    pairs,
    unalignedCode,
    unalignedFigma: figmaModes.filter((m) => !matchedFigma.has(m)),
  };
}

// ---------------------------------------------------------------------------
// System-specific matching strategies
// ---------------------------------------------------------------------------

const MUI_CROSS_COLLECTION_MAPS = [
  { codePrefix: 'palette/grey/', figmaCollection: 'material/colors', figmaPrefix: 'grey/' },
  { codePrefix: 'palette/common/', figmaCollection: 'material/colors', figmaPrefix: 'common/' },
];
const CARBON_CROSS_COLLECTION_MAPS = [];
const crossCollectionMaps = system === 'mui' ? MUI_CROSS_COLLECTION_MAPS : CARBON_CROSS_COLLECTION_MAPS;

// ---------------------------------------------------------------------------
// Matching pipeline — pure function, runs per (codeMode, figmaMode) pair
// ---------------------------------------------------------------------------

function findFigmaMatch(codePath, codeTokens, figmaTokens) {
  // Strategy 1: direct match
  if (figmaTokens.has(codePath)) {
    return { figmaPath: codePath, figmaToken: figmaTokens.get(codePath), matchType: 'direct' };
  }
  const parts = codePath.split('/');
  const collection = parts[0];
  const varName = parts.slice(1).join('/');
  for (const [figmaPath, token] of figmaTokens) {
    if (token.collection === collection && token.name === varName) {
      return { figmaPath, figmaToken: token, matchType: 'direct' };
    }
  }

  // Strategy 2: cross-collection mapping
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

  // Strategy 3: MUI typography structural match
  if (system === 'mui' && codePath.startsWith('typography/') && codePath.endsWith('/fontSize')) {
    const variant = codePath.split('/')[1];
    const figmaVarName = `typography/${variant}`;
    for (const [figmaPath, token] of figmaTokens) {
      if (token.collection === 'typography' && token.name === figmaVarName) {
        return { figmaPath, figmaToken: token, matchType: 'typography_fontSize' };
      }
    }
  }

  // Strategy 4: Carbon colour hex-value fallback
  if (system === 'carbon' && codePath.startsWith('colors/')) {
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

  // Strategy 5: Carbon theme token name-normalised match
  if (system === 'carbon' && codePath.startsWith('theme/')) {
    const tokenName = codePath.replace('theme/', '');
    for (const [figmaPath, token] of figmaTokens) {
      if (token.name.replace(/[\s/\-_]/g, '').toLowerCase() === tokenName.toLowerCase()) {
        return { figmaPath, figmaToken: token, matchType: 'name_normalised' };
      }
    }
  }

  return null;
}

function diffModePair(codeTokens, figmaTokens) {
  const results = {
    matches: [], valueMismatches: [], namingMismatches: [],
    codeOnly: [], figmaOnly: [],
  };
  const matchedFigmaPaths = new Set();

  for (const [codePath, codeToken] of codeTokens) {
    const match = findFigmaMatch(codePath, codeTokens, figmaTokens);
    if (!match) {
      results.codeOnly.push({
        codePath, value: codeToken.value, category: codeToken.category,
      });
      continue;
    }

    matchedFigmaPaths.add(match.figmaPath);
    const { figmaPath, figmaToken, matchType } = match;

    let codeVal = codeToken.value;
    let figmaVal = figmaToken.resolvedValue;

    if (matchType === 'typography_fontSize') {
      const codePx = remToPx(String(codeVal));
      if (codePx !== null && typeof figmaVal === 'number') codeVal = codePx;
    }

    if (figmaToken.resolvedType === 'COLOR' || (typeof codeVal === 'string' && codeVal.startsWith('#'))) {
      codeVal = normaliseColour(String(codeVal));
      figmaVal = normaliseColour(String(figmaVal));
    }

    if (typeof codeVal === 'number' && typeof figmaVal === 'string') figmaVal = parseFloat(figmaVal);
    if (typeof codeVal === 'string' && typeof figmaVal === 'number') {
      const parsed = parseFloat(codeVal);
      if (!isNaN(parsed)) codeVal = parsed;
    }

    const valuesMatch = String(codeVal) === String(figmaVal);
    const namesMatch = codePath === figmaPath;
    const isStructuralMatch = ['cross_collection', 'typography_fontSize', 'color_value_match', 'name_normalised'].includes(matchType);

    if (valuesMatch && (namesMatch || isStructuralMatch)) {
      results.matches.push({ codePath, figmaPath, value: codeToken.value, matchType });
    } else if (!valuesMatch) {
      results.valueMismatches.push({
        codePath, figmaPath,
        codeValue: codeToken.value,
        figmaValue: figmaToken.resolvedValue,
        figmaRawValue: figmaToken.rawValue,
        aliasChain: figmaToken.aliasChain,
        category: codeToken.category,
        matchType,
      });
    } else if (!namesMatch && !isStructuralMatch) {
      results.namingMismatches.push({ codePath, figmaPath, value: codeToken.value, matchType });
    }
  }

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

  return results;
}

// ---------------------------------------------------------------------------
// Run per-mode diff
// ---------------------------------------------------------------------------

const figmaModeNames = listAllFigmaModes(figmaData.collections);
const codeTokensByMode = buildCodeTokenMapsByMode(codeData, codeModes);
const { pairs, unalignedCode, unalignedFigma } = alignModes(codeModes, figmaModeNames, modeAlignmentOverride);

const dataGaps = [];
for (const m of unalignedCode) dataGaps.push({ code_mode: m, reason: 'No aligned Figma mode' });
for (const m of unalignedFigma) dataGaps.push({ figma_mode: m, reason: 'No aligned code mode' });

if (pairs.length === 0) {
  console.error(`No modes aligned between code (${codeModes.join(', ')}) and Figma (${figmaModeNames.join(', ')}).`);
  console.error(`Declare mode_alignment in the manifest or rename modes to match.`);
  process.exit(1);
}

const resultsByMode = {};
for (const pair of pairs) {
  console.log(`Diffing mode pair: code "${pair.code}" ↔ figma "${pair.figma}"`);
  const figmaMap = buildFigmaTokenMapForMode(figmaData.collections, pair.figma);
  resultsByMode[pair.code] = {
    figmaMode: pair.figma,
    ...diffModePair(codeTokensByMode[pair.code], figmaMap),
  };
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

const byModeSummary = {};
let agg = { matches: 0, valueMismatches: 0, namingMismatches: 0, codeOnly: 0, figmaOnly: 0 };
const matchBreakdownByMode = {};

for (const [codeMode, results] of Object.entries(resultsByMode)) {
  const totalMatched = results.matches.length + results.valueMismatches.length;
  const totalComparable = totalMatched + results.namingMismatches.length;
  byModeSummary[codeMode] = {
    figma_mode: results.figmaMode,
    matches: results.matches.length,
    valueMismatches: results.valueMismatches.length,
    namingMismatches: results.namingMismatches.length,
    codeOnly: results.codeOnly.length,
    figmaOnly: results.figmaOnly.length,
    parityScore_6_1: totalMatched > 0 ? Math.round((results.matches.length / totalMatched) * 100) : 0,
    parityScore_6_2: totalComparable > 0 ? Math.round(((results.matches.length + results.valueMismatches.length) / totalComparable) * 100) : 0,
  };
  agg.matches += results.matches.length;
  agg.valueMismatches += results.valueMismatches.length;
  agg.namingMismatches += results.namingMismatches.length;
  agg.codeOnly += results.codeOnly.length;
  agg.figmaOnly += results.figmaOnly.length;

  matchBreakdownByMode[codeMode] = {};
  for (const m of results.matches) {
    matchBreakdownByMode[codeMode][m.matchType] = (matchBreakdownByMode[codeMode][m.matchType] || 0) + 1;
  }
}

const overallTotalMatched = agg.matches + agg.valueMismatches;
const overallTotalComparable = overallTotalMatched + agg.namingMismatches;
const overall = {
  ...agg,
  parityScore_6_1: overallTotalMatched > 0 ? Math.round((agg.matches / overallTotalMatched) * 100) : 0,
  parityScore_6_2: overallTotalComparable > 0 ? Math.round(((agg.matches + agg.valueMismatches) / overallTotalComparable) * 100) : 0,
};

// ---------------------------------------------------------------------------
// Token counts (distinct paths, not multiplied by modes)
// ---------------------------------------------------------------------------

const codeTokenCount = Object.keys(codeData.tokens).length;
let figmaTokenCount = 0;
for (const col of Object.values(figmaData.collections)) {
  if (col.remote) continue;
  figmaTokenCount += col.variables.length;
}

// ---------------------------------------------------------------------------
// Diff output
// ---------------------------------------------------------------------------

const diffOutput = {
  _meta: {
    system,
    generatedAt: new Date().toISOString(),
    codeSource: `scripts/output/${system}-code-tokens.json`,
    figmaSource: `scripts/output/${system}-figma-variables-normalised.json`,
    description: `Token parity diff between ${system} code tokens and Figma Variables. Feeds Cluster 6 dimensions 6.1 and 6.2. Multi-mode aware.`,
  },
  summary: {
    codeTokenCount,
    figmaTokenCount,
    modes_compared: pairs,
    by_mode: byModeSummary,
    overall,
    match_breakdown_by_mode: matchBreakdownByMode,
    data_gaps: dataGaps,
  },
  results: { by_mode: resultsByMode },
};

const diffPath = join(__dirname, 'output', `${system}-token-diff.json`);
writeFileSync(diffPath, JSON.stringify(diffOutput, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Findings — with cross-mode dedup
// ---------------------------------------------------------------------------

const findings = [];
let findingCounter = 1;
const fid = (n) => `TVP-${String(n).padStart(3, '0')}`;
const sig = (codeVal, figmaVal) => `${JSON.stringify(codeVal)}::${JSON.stringify(figmaVal)}`;

// Value mismatches: dedup identical (codeVal, figmaVal) across modes
const vmByCodePath = {};
for (const [codeMode, results] of Object.entries(resultsByMode)) {
  for (const m of results.valueMismatches) {
    if (!vmByCodePath[m.codePath]) vmByCodePath[m.codePath] = [];
    vmByCodePath[m.codePath].push({ mode: codeMode, ...m });
  }
}

for (const [codePath, entries] of Object.entries(vmByCodePath)) {
  const signatures = new Set(entries.map((e) => sig(e.codeValue, e.figmaValue)));
  const allModesCovered = entries.length === pairs.length;
  const collapseToInvariant = signatures.size === 1 && allModesCovered;

  const groups = collapseToInvariant
    ? [{ mode: '*', sample: entries[0], allModes: entries.map((e) => e.mode) }]
    : entries.map((e) => ({ mode: e.mode, sample: e, allModes: [e.mode] }));

  for (const g of groups) {
    const m = g.sample;
    const modeLabel = g.mode === '*' ? 'all modes' : `${g.mode} mode`;

    let recommendation;
    if (system === 'mui') {
      if (m.codePath.includes('fontFamily')) {
        recommendation = 'Figma stores only the primary font family; code includes the full fallback stack. Structural scope difference. Document the fallback stack in the Figma variable description for parity.';
      } else if (m.codePath === 'breakpoints/xs') {
        recommendation = 'Code defines xs as the minimum bound (0px); Figma defines it as a design breakpoint. Different semantic uses of the same name. Align on meaning or rename the Figma variable.';
      } else if (m.category === 'palette') {
        recommendation = `Colour value drift in ${modeLabel}. Code has ${m.codeValue}, Figma resolves to ${m.figmaValue}${m.aliasChain.length > 0 ? ' via alias chain ' + m.aliasChain.join(' -> ') : ''}. Determine the authoritative source and correct the other.`;
      } else {
        recommendation = `Align the token value between code and Figma in ${modeLabel}. Determine which source is authoritative and update the other.`;
      }
    } else {
      recommendation = `Token value mismatch in ${modeLabel}: code has "${m.codeValue}", Figma has "${m.figmaValue}". Determine the authoritative source and align.`;
    }

    findings.push({
      id: fid(findingCounter++),
      dimension: 'token_value_parity',
      mode: g.mode,
      severity: 'warning',
      severity_rank: 2,
      node_id: null,
      node_name: null,
      summary: `Value mismatch (${modeLabel}): ${m.codePath}`,
      description: `Token value mismatch for "${m.codePath}" in ${modeLabel}: code value "${m.codeValue}" vs Figma "${m.figmaValue}".`,
      evidence: [
        `Code: ${m.codePath} = ${JSON.stringify(m.codeValue)}`,
        `Figma: ${m.figmaPath} = ${JSON.stringify(m.figmaValue)}`,
        m.aliasChain.length > 0 ? `Alias chain: ${m.aliasChain.join(' -> ')}` : 'No alias chain (direct value)',
        `Match type: ${m.matchType}`,
        `Modes affected: ${g.allModes.join(', ')}`,
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
}

// Code-only tokens: group by category, collapse to * when present in every mode
const codeOnlyAcrossModes = {};
for (const [codeMode, results] of Object.entries(resultsByMode)) {
  for (const t of results.codeOnly) {
    if (!codeOnlyAcrossModes[t.codePath]) codeOnlyAcrossModes[t.codePath] = { token: t, modes: [] };
    codeOnlyAcrossModes[t.codePath].modes.push(codeMode);
  }
}

const codeOnlyByCategoryMode = {};
for (const [codePath, entry] of Object.entries(codeOnlyAcrossModes)) {
  const isInvariant = entry.modes.length === pairs.length;
  const modeKey = isInvariant ? '*' : entry.modes.join('+');
  const bucket = `${entry.token.category}::${modeKey}`;
  if (!codeOnlyByCategoryMode[bucket]) {
    codeOnlyByCategoryMode[bucket] = {
      category: entry.token.category,
      mode: isInvariant ? '*' : entry.modes[0],
      allModes: entry.modes,
      paths: [],
    };
  }
  codeOnlyByCategoryMode[bucket].paths.push(codePath);
}

for (const bucket of Object.values(codeOnlyByCategoryMode)) {
  const severity = ['shadows', 'zIndex', 'transitions', 'material/colors', 'motion'].includes(bucket.category) ? 'note' : 'warning';
  const modeLabel = bucket.mode === '*' ? 'all modes' : `${bucket.allModes.join(', ')} mode${bucket.allModes.length > 1 ? 's' : ''}`;

  findings.push({
    id: fid(findingCounter++),
    dimension: 'token_value_parity',
    mode: bucket.mode,
    severity,
    severity_rank: severity === 'warning' ? 2 : 1,
    node_id: null,
    node_name: null,
    summary: `${bucket.paths.length} ${bucket.category} tokens exist in code only (${modeLabel})`,
    description: `${bucket.paths.length} ${bucket.category} tokens exist in code but have no Figma Variable counterpart in ${modeLabel}.`,
    evidence: bucket.paths.length <= 10 ? bucket.paths : [...bucket.paths.slice(0, 10), `... and ${bucket.paths.length - 10} more`],
    recommendation: `Create Figma Variables for ${bucket.category} tokens, or document the gap as intentional in the parity gap register (Dimension 6.6).`,
    contract_ref: {
      type: 'token_definition',
      level: 'primitive',
      path: null,
      field: null,
    },
    auto_fixable: false,
  });
}

// Figma-only tokens: group by (collection, mode)
for (const [codeMode, results] of Object.entries(resultsByMode)) {
  const byCollection = {};
  for (const t of results.figmaOnly) {
    if (!byCollection[t.collection]) byCollection[t.collection] = [];
    byCollection[t.collection].push(t.name);
  }
  for (const [collection, names] of Object.entries(byCollection)) {
    findings.push({
      id: fid(findingCounter++),
      dimension: 'token_naming_parity',
      mode: codeMode,
      severity: 'note',
      severity_rank: 1,
      node_id: null,
      node_name: null,
      summary: `${names.length} Figma-only variables in "${collection}" (${codeMode} mode)`,
      description: `${names.length} variables in Figma collection "${collection}" have no code token counterpart in ${codeMode} mode.`,
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
}

// ---------------------------------------------------------------------------
// Findings output
// ---------------------------------------------------------------------------

const auditDir = system === 'mui' ? 'material-ui' : system;
const findingsOutput = {
  _meta: {
    generatedAt: new Date().toISOString(),
    schema_version: '3.1',
    system,
    description: `Token parity findings for ${system}. Cluster 6 dimensions 6.1 and 6.2. Multi-mode aware. Generated by diff-tokens.mjs.`,
  },
  summary: {
    total_findings: findings.length,
    by_severity: {
      blocker: findings.filter((f) => f.severity === 'blocker').length,
      warning: findings.filter((f) => f.severity === 'warning').length,
      note: findings.filter((f) => f.severity === 'note').length,
    },
    parity_scores: {
      '6.1_token_value_parity': {
        by_mode: Object.fromEntries(Object.entries(byModeSummary).map(([m, s]) => [m, s.parityScore_6_1])),
        overall: overall.parityScore_6_1,
      },
      '6.2_token_naming_parity': {
        by_mode: Object.fromEntries(Object.entries(byModeSummary).map(([m, s]) => [m, s.parityScore_6_2])),
        overall: overall.parityScore_6_2,
      },
    },
    modes_compared: pairs,
    data_gaps: dataGaps,
  },
  findings,
};

const findingsDir = join(repoRoot, 'audit', auditDir, 'v3.3');
mkdirSync(findingsDir, { recursive: true });
const findingsPath = join(findingsDir, 'token-parity-findings.json');
writeFileSync(findingsPath, JSON.stringify(findingsOutput, null, 2), 'utf-8');

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

console.log(`\n=== ${system.toUpperCase()} Token Parity Diff ===`);
console.log(`Code tokens:   ${codeTokenCount}`);
console.log(`Figma tokens:  ${figmaTokenCount}`);
console.log(`Modes:         ${pairs.map((p) => `${p.code}↔${p.figma}`).join(', ')}`);
if (dataGaps.length > 0) {
  console.log(`Data gaps:     ${dataGaps.length}`);
  for (const g of dataGaps) console.log(`  - ${JSON.stringify(g)}`);
}
console.log('');
for (const [mode, s] of Object.entries(byModeSummary)) {
  console.log(`Mode "${mode}" (↔ "${s.figma_mode}"):`);
  console.log(`  matches: ${s.matches}, value-mm: ${s.valueMismatches}, naming-mm: ${s.namingMismatches}, code-only: ${s.codeOnly}, figma-only: ${s.figmaOnly}`);
  console.log(`  6.1: ${s.parityScore_6_1}%   6.2: ${s.parityScore_6_2}%`);
}
console.log('');
console.log(`Overall 6.1 (value parity):  ${overall.parityScore_6_1}%`);
console.log(`Overall 6.2 (naming parity): ${overall.parityScore_6_2}%`);
console.log('');
console.log(`Diff output:     ${diffPath}`);
console.log(`Findings output: ${findingsPath}`);
console.log(`Total findings:  ${findings.length}`);
