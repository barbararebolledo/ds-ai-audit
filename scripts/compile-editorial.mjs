/**
 * compile-editorial.mjs
 *
 * Parses an editorial Markdown file (produced by render-editorial.mjs)
 * and writes the field contents back to the editorial JSON file.
 *
 * Usage:
 *   node scripts/compile-editorial.mjs --system mui --version v3.1
 *   node scripts/compile-editorial.mjs --system mui --version v3.1 --editor "Eeva"
 *
 * Flags:
 *   --system   System slug (e.g. mui, carbon)
 *   --version  Audit version (e.g. v3.1)
 *   --editor   Name of the last editor. If omitted and last_edited_by is
 *              not already set in the JSON, prompts on stdin.
 *
 * Input:
 *   audit/{system}/{version}/{system}-editorial-{version}.md
 *
 * Output:
 *   audit/{system}/{version}/{system}-editorial-{version}.json (overwrites)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// --- Parse args ---

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--system' && argv[i + 1]) {
      args.system = argv[++i];
    } else if (argv[i] === '--version' && argv[i + 1]) {
      args.version = argv[++i];
    } else if (argv[i] === '--editor' && argv[i + 1]) {
      args.editor = argv[++i];
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.system || !args.version) {
  console.error('Usage: node scripts/compile-editorial.mjs --system <slug> --version <version> [--editor <name>]');
  process.exit(1);
}

const { system, version } = args;

// --- Resolve paths ---

const systemDirMap = {
  mui: 'material-ui',
  carbon: 'carbon',
};
const systemDir = systemDirMap[system] || system;

const jsonPath = join(repoRoot, 'audit', systemDir, version, `${system}-editorial-${version}.json`);
const mdPath = join(repoRoot, 'audit', systemDir, version, `${system}-editorial-${version}.md`);

// --- Read files ---

const editorial = JSON.parse(readFileSync(jsonPath, 'utf-8'));
const md = readFileSync(mdPath, 'utf-8');

// --- Validate audit_ref ---

const auditRefMatch = md.match(/<!--\s*audit_ref\s*:\s*(.+?)\s*-->/);
if (!auditRefMatch) {
  console.error('Error: no <!-- audit_ref: ... --> found in Markdown header.');
  process.exit(1);
}

const mdAuditRef = auditRefMatch[1].trim();
if (mdAuditRef !== editorial.meta.audit_ref) {
  console.error(`Error: audit_ref mismatch.`);
  console.error(`  Markdown: ${mdAuditRef}`);
  console.error(`  JSON:     ${editorial.meta.audit_ref}`);
  console.error('Refusing to overwrite. Ensure both files reference the same audit.');
  process.exit(1);
}

// --- Parse fields ---
// Tolerant regex: allows whitespace variations around the delimiter pattern.

const fieldPattern = /<!--\s*field\s*:\s*(.+?)\s*-->([\s\S]*?)<!--\s*\/\s*field\s*-->/g;
const fields = new Map();

let match;
while ((match = fieldPattern.exec(md)) !== null) {
  const path = match[1].trim();
  const content = match[2].trim();
  fields.set(path, content);
}

// --- Apply fields to editorial JSON ---

/**
 * Parse a field path into [section, key, field] parts.
 *
 * Paths follow the pattern:
 *   report.<field>                          -> ["report", null, "<field>"]
 *   clusters.<cluster_key>.<field>          -> ["clusters", "<cluster_key>", "<field>"]
 *   dimensions.<dim_key>.<field>            -> ["dimensions", "<dim_key>", "<field>"]
 *   findings.<finding_id>.<field>           -> ["findings", "<finding_id>", "<field>"]
 *   remediation.<rem_id>.<field>            -> ["remediation", "<rem_id>", "<field>"]
 *
 * Dimension keys contain dots (e.g. "0.1_platform_architecture_clarity")
 * so naive dot-splitting breaks them. We use the known structure instead:
 * the first segment is always the section, the last segment is always the
 * field name, and everything in between is the key.
 */
function parsePath(path) {
  const firstDot = path.indexOf('.');
  if (firstDot === -1) return [path, null, null];

  const section = path.slice(0, firstDot);
  const rest = path.slice(firstDot + 1);

  if (section === 'report') {
    // report.<field> — no intermediate key
    return [section, null, rest];
  }

  // For all other sections: everything between section and last dot-segment
  // is the key. The last dot-segment is the field name.
  const lastDot = rest.lastIndexOf('.');
  if (lastDot === -1) return [section, null, rest];

  const key = rest.slice(0, lastDot);
  const field = rest.slice(lastDot + 1);
  return [section, key, field];
}

function setField(obj, path, value) {
  // Handle top-level scalar (no dots) e.g. "scope_statement"
  if (!path.includes('.')) {
    obj[path] = value;
    return;
  }

  // Handle organisational_implications.patterns.<index>.<field>
  const patternMatch = path.match(/^organisational_implications\.patterns\.(\d+)\.(.+)$/);
  if (patternMatch) {
    const idx = parseInt(patternMatch[1], 10);
    const fieldName = patternMatch[2];
    if (!obj.organisational_implications) obj.organisational_implications = {};
    if (!obj.organisational_implications.patterns) obj.organisational_implications.patterns = [];
    while (obj.organisational_implications.patterns.length <= idx) {
      obj.organisational_implications.patterns.push({});
    }
    obj.organisational_implications.patterns[idx][fieldName] = value;
    return;
  }

  const [section, key, field] = parsePath(path);

  if (!section || !field) return;

  if (!obj[section]) obj[section] = {};

  if (key === null) {
    // report-level: obj.report.<field>
    obj[section][field] = value;
  } else {
    // keyed: obj.<section>.<key>.<field>
    if (!obj[section][key]) obj[section][key] = {};
    obj[section][key][field] = value;
  }
}

let fieldCount = 0;
for (const [path, content] of fields) {
  setField(editorial, path, content);
  fieldCount++;
}

// --- Resolve editor name ---

async function getEditorName() {
  if (args.editor) return args.editor;
  if (editorial.meta.last_edited_by) return editorial.meta.last_edited_by;

  // Prompt on stdin
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question('Editor name (for last_edited_by): ', (answer) => {
      rl.close();
      resolve(answer.trim() || 'unknown');
    });
  });
}

const editorName = await getEditorName();

// --- Update meta ---

editorial.meta.last_edited_by = editorName;
editorial.meta.last_edited_at = new Date().toISOString();

// --- Write ---

writeFileSync(jsonPath, JSON.stringify(editorial, null, 2) + '\n', 'utf-8');

console.log(`Compiled ${fieldCount} fields from Markdown to JSON.`);
console.log(`Editor: ${editorName}`);
console.log(`Output: ${jsonPath}`);
