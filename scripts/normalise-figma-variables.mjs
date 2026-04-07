/**
 * normalise-figma-variables.mjs
 *
 * Reads the raw Figma Variables REST API response and produces a
 * normalised JSON with alias chains intact. Groups variables by
 * collection, resolves alias references to variable names, and
 * preserves mode-specific values.
 *
 * Usage:
 *   node scripts/normalise-figma-variables.mjs [system]
 *
 * Arguments:
 *   system  — slug for the design system (default: 'mui')
 *
 * Input:
 *   scripts/output/{system}-figma-variables-raw.json
 *
 * Output:
 *   scripts/output/{system}-figma-variables-normalised.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const system = process.argv[2] || 'mui';
const inputPath = join(__dirname, 'output', `${system}-figma-variables-raw.json`);
const outputPath = join(__dirname, 'output', `${system}-figma-variables-normalised.json`);

const raw = JSON.parse(readFileSync(inputPath, 'utf-8'));
const { variableCollections, variables } = raw.meta;

// Build a lookup from variable ID to variable object.
const varById = {};
for (const [id, v] of Object.entries(variables)) {
  varById[id] = v;
}

/**
 * Resolve a single value entry. Figma alias values have the shape
 * { type: "VARIABLE_ALIAS", id: "VariableID:..." }. We resolve these
 * to a descriptor that names the target variable, preserving the chain.
 */
function resolveValue(val) {
  if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
    const target = varById[val.id];
    if (target) {
      return {
        type: 'alias',
        aliasOf: target.name,
        aliasOfId: val.id,
        aliasOfCollection: getCollectionName(target.variableCollectionId),
      };
    }
    return { type: 'alias', aliasOf: '[unresolved]', aliasOfId: val.id };
  }
  // Colour values come as { r, g, b, a } floats 0-1. Convert to hex.
  if (val && typeof val === 'object' && 'r' in val && 'g' in val && 'b' in val) {
    const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
    const hex = `#${toHex(val.r)}${toHex(val.g)}${toHex(val.b)}`;
    if (val.a !== undefined && val.a < 1) {
      return `${hex}${toHex(val.a)}`;
    }
    return hex;
  }
  return val;
}

function getCollectionName(collectionId) {
  const col = variableCollections[collectionId];
  return col ? col.name : '[unknown collection]';
}

// Build normalised output grouped by collection.
const collections = {};

for (const [colId, col] of Object.entries(variableCollections)) {
  const modeNames = {};
  for (const mode of col.modes) {
    modeNames[mode.modeId] = mode.name;
  }

  const collectionEntry = {
    name: col.name,
    remote: col.remote,
    hiddenFromPublishing: col.hiddenFromPublishing,
    modes: col.modes.map((m) => m.name),
    variables: [],
  };

  for (const varId of col.variableIds) {
    const v = varById[varId];
    if (!v) continue;

    const values = {};
    for (const [modeId, val] of Object.entries(v.valuesByMode)) {
      const modeName = modeNames[modeId] || modeId;
      values[modeName] = resolveValue(val);
    }

    collectionEntry.variables.push({
      name: v.name,
      resolvedType: v.resolvedType,
      description: v.description || null,
      hiddenFromPublishing: v.hiddenFromPublishing,
      scopes: v.scopes,
      values,
    });
  }

  // Use a unique key: name + local/remote to avoid collisions.
  const key = `${col.name}${col.remote ? ' (remote)' : ''}`;
  collections[key] = collectionEntry;
}

// Summary statistics.
const totalVars = Object.values(collections).reduce(
  (sum, c) => sum + c.variables.length,
  0
);
const aliasCount = Object.values(collections).reduce((sum, c) => {
  return (
    sum +
    c.variables.reduce((vSum, v) => {
      return (
        vSum +
        Object.values(v.values).filter(
          (val) => val && typeof val === 'object' && val.type === 'alias'
        ).length
      );
    }, 0)
  );
}, 0);

const output = {
  _meta: {
    source: 'Figma REST API /v1/files/{key}/variables/local',
    system,
    extractedAt: new Date().toISOString(),
    totalCollections: Object.keys(collections).length,
    totalVariables: totalVars,
    totalAliases: aliasCount,
  },
  collections,
};

writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`Normalised ${totalVars} variables across ${Object.keys(collections).length} collections.`);
console.log(`Alias references: ${aliasCount}`);
console.log(`Output: ${outputPath}`);
