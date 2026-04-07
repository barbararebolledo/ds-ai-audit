/**
 * read-figma-doc-frames.mjs
 *
 * Documentation frame reader for Figma design system files.
 * Extracts structural metadata from component pages: component name,
 * category, description, sub-component inventory, variant axes,
 * property types, and composition structure.
 *
 * Feeds Cluster 3 dimension 3.5 (documentation frame metadata).
 *
 * Supports multiple conventions:
 *   - MUI: *Library / Component Heading + *Library / Component Information
 *   - Generic: COMPONENT_SET / COMPONENT node extraction from any page
 *
 * Usage:
 *   node scripts/read-figma-doc-frames.mjs [fileKey] [system]
 *
 * Arguments:
 *   fileKey — Figma file key (default: MUI '0C5ShRQnETNce2CoupX1IJ')
 *   system  — slug for the design system (default: 'mui')
 *
 * Output:
 *   scripts/output/{system}-doc-frames.json
 *   audit/{system}/v2.2/doc-frame-findings.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const FILE_KEY = process.argv[2] || '0C5ShRQnETNce2CoupX1IJ';
const SYSTEM = process.argv[3] || 'mui';
const TOKEN = process.env.FIGMA_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('FIGMA_ACCESS_TOKEN not set.');
  process.exit(1);
}

const PLACEHOLDER_PATTERNS = [
  'the lorem ipsum',
  'lorem ipsum dolor sit amet',
  'placeholder text used in publishing',
];

// ---------------------------------------------------------------------------
// Figma REST API helpers
// ---------------------------------------------------------------------------

async function figmaGet(path) {
  const url = `https://api.figma.com/v1${path}`;
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': TOKEN },
  });
  if (!res.ok) {
    throw new Error(`Figma API ${res.status}: ${res.statusText} for ${path}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/** Recursively collect all text node characters from a subtree. */
function collectTexts(node) {
  const results = [];
  if (node.characters && node.characters.trim().length > 0) {
    results.push({ name: node.name, text: node.characters.trim() });
  }
  if (node.children) {
    for (const child of node.children) {
      results.push(...collectTexts(child));
    }
  }
  return results;
}

/** Check whether a string is placeholder text. */
function isPlaceholder(text) {
  if (!text) return true;
  const lower = text.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

// ---------------------------------------------------------------------------
// MUI-specific: Component Heading parser
// ---------------------------------------------------------------------------

function parseMuiComponentHeading(headingNode) {
  const texts = collectTexts(headingNode);

  const parentText = texts.find((t) => t.name === 'Parent');
  const childText = texts.find((t) => t.name === 'Child');
  const titleText = texts.find((t) => t.name === 'Title');

  const skipNames = new Set(['Parent', 'Child', 'Title', 'body1', '© mui.com']);
  const descCandidate = texts.find(
    (t) =>
      !skipNames.has(t.name) &&
      !t.text.startsWith('© ') &&
      !t.text.startsWith('MUI for Figma') &&
      !t.text.startsWith('Docs') &&
      t.text.length > 20
  );

  const versionText = texts.find((t) => t.text.includes('MUI for Figma'));
  const versionMatch = versionText
    ? versionText.text.match(/v([\d.]+)/)
    : null;

  return {
    componentName: titleText ? titleText.text : null,
    category: parentText ? parentText.text : null,
    pageDescription: descCandidate ? descCandidate.text : null,
    pageDescriptionIsPlaceholder: descCandidate
      ? isPlaceholder(descCandidate.text)
      : true,
    version: versionMatch ? `v${versionMatch[1]}` : null,
  };
}

// ---------------------------------------------------------------------------
// MUI-specific: Component Information parser
// ---------------------------------------------------------------------------

function parseMuiComponentInfo(infoNode) {
  const texts = collectTexts(infoNode);

  const headingFrame = infoNode.children
    ? infoNode.children.find((c) => c.name === 'Heading')
    : null;
  let name = null;
  let description = null;

  if (headingFrame) {
    const headingTexts = collectTexts(headingFrame);
    const nameText = headingTexts.find(
      (t) => t.name === 'Component' || t.text.startsWith('<') || t.text.startsWith('Card')
    );
    name = nameText ? nameText.text : null;

    const descText = headingTexts.find(
      (t) => t !== nameText && t.text.length > 20
    );
    description = descText ? descText.text : null;
  }

  const propsFrame = infoNode.children
    ? infoNode.children.find((c) => c.name === 'Properties')
    : null;
  const propertyNames = [];
  if (propsFrame) {
    const propTexts = collectTexts(propsFrame);
    const skip = new Set(['Secondary', 'Property', 'Properties']);
    for (const t of propTexts) {
      if (!skip.has(t.text) && t.text.length > 1) {
        propertyNames.push(t.text);
      }
    }
  }

  return {
    name,
    description: description && !isPlaceholder(description) ? description : null,
    hasPlaceholderDescription: description ? isPlaceholder(description) : true,
    documentedProperties: propertyNames,
  };
}

// ---------------------------------------------------------------------------
// Generic: COMPONENT_SET / COMPONENT parser (works for any system)
// ---------------------------------------------------------------------------

function parseComponentNode(node) {
  const props = node.componentPropertyDefinitions || {};
  const variantAxes = [];
  const booleanProps = [];
  const textProps = [];
  const instanceSwapProps = [];

  for (const [key, def] of Object.entries(props)) {
    const cleanName = key.replace(/#[\d:]+$/, '').replace(/[?↳ ]+$/, '').trim();

    switch (def.type) {
      case 'VARIANT':
        variantAxes.push({
          name: cleanName,
          options: def.variantOptions || [],
          default: def.defaultValue,
        });
        break;
      case 'BOOLEAN':
        booleanProps.push(cleanName);
        break;
      case 'TEXT':
        textProps.push(cleanName);
        break;
      case 'INSTANCE_SWAP':
        instanceSwapProps.push(cleanName);
        break;
    }
  }

  return {
    type: node.type,
    variantCount: node.children ? node.children.length : 1,
    variantAxes,
    booleanProps,
    textProps,
    instanceSwapProps,
  };
}

/** Recursively find the first COMPONENT_SET or angle-bracket COMPONENT in a subtree. */
function findComponentNode(node) {
  if (node.type === 'COMPONENT_SET') return node;
  if (
    node.type === 'COMPONENT' &&
    node.name.startsWith('<')
  ) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findComponentNode(child);
      if (found) return found;
    }
  }
  return null;
}

/** Recursively find ALL COMPONENT_SET nodes in a subtree. */
function findAllComponentSets(node, results = []) {
  if (node.type === 'COMPONENT_SET') {
    results.push(node);
    return results; // Don't recurse into component sets
  }
  if (node.children) {
    for (const child of node.children) {
      findAllComponentSets(child, results);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Convention detection
// ---------------------------------------------------------------------------

/**
 * Detect which documentation convention a page uses.
 * Returns 'mui' if MUI-style frames are found, 'generic' otherwise.
 */
function detectConvention(pageNode) {
  if (!pageNode.children) return 'generic';

  for (const topFrame of pageNode.children) {
    if (!topFrame.children) continue;
    const hasHeading = topFrame.children.some((c) =>
      c.name.includes('Component Heading')
    );
    const hasInfo = topFrame.children.some((c) =>
      c.name.includes('Component Information')
    );
    if (hasHeading || hasInfo) return 'mui';

    // Check nested grids too
    const grid = topFrame.children.find((c) => c.name === 'Grid');
    if (grid && grid.children) {
      for (const section of grid.children) {
        if (!section.children) continue;
        const nestedInfo = section.children.some((c) =>
          c.name.includes('Component Information')
        );
        if (nestedInfo) return 'mui';
      }
    }
  }
  return 'generic';
}

// ---------------------------------------------------------------------------
// MUI page parser
// ---------------------------------------------------------------------------

function parseMuiPage(pageNode) {
  const result = {
    figmaPageId: pageNode.id,
    componentName: null,
    category: null,
    pageDescription: null,
    pageDescriptionIsPlaceholder: true,
    version: null,
    subComponents: [],
    exampleFrames: [],
    compositionNotes: null,
  };

  if (!pageNode.children) return result;

  for (const topFrame of pageNode.children) {
    if (
      topFrame.name.includes('examples') ||
      topFrame.name.startsWith('▶️')
    ) {
      result.exampleFrames.push(topFrame.name.trim());
      continue;
    }

    if (!topFrame.children) continue;

    const heading = topFrame.children.find((c) =>
      c.name.includes('Component Heading')
    );
    if (heading) {
      const headingData = parseMuiComponentHeading(heading);
      result.componentName = headingData.componentName;
      result.category = headingData.category;
      result.pageDescription = headingData.pageDescription;
      result.pageDescriptionIsPlaceholder =
        headingData.pageDescriptionIsPlaceholder;
      result.version = headingData.version;
    }

    const topGrid = topFrame.children.find((c) => c.name === 'Grid');
    if (!topGrid || !topGrid.children) continue;

    for (const section of topGrid.children) {
      if (!section.children) continue;

      const subComponent = {
        name: null,
        description: null,
        hasPlaceholderDescription: true,
        figmaNodeId: null,
        type: null,
        variantCount: 0,
        variantAxes: [],
        booleanProps: [],
        textProps: [],
        instanceSwapProps: [],
        documentedProperties: [],
      };

      const info = section.children.find((c) =>
        c.name.includes('Component Information')
      );
      if (info) {
        const infoData = parseMuiComponentInfo(info);
        subComponent.name = infoData.name;
        subComponent.description = infoData.description;
        subComponent.hasPlaceholderDescription =
          infoData.hasPlaceholderDescription;
        subComponent.documentedProperties = infoData.documentedProperties;
      }

      const compNode = findComponentNode(section);
      if (compNode) {
        subComponent.figmaNodeId = compNode.id;
        const compData = parseComponentNode(compNode);
        subComponent.type = compData.type;
        subComponent.variantCount = compData.variantCount;
        subComponent.variantAxes = compData.variantAxes;
        subComponent.booleanProps = compData.booleanProps;
        subComponent.textProps = compData.textProps;
        subComponent.instanceSwapProps = compData.instanceSwapProps;

        if (!subComponent.name) {
          subComponent.name = compNode.name;
        }
      }

      if (subComponent.name || subComponent.figmaNodeId) {
        result.subComponents.push(subComponent);
      }
    }

    if (result.subComponents.length > 2) {
      const subNames = result.subComponents.map((s) => s.name).filter(Boolean);
      result.compositionNotes = `Compound component with ${subNames.length} sub-components: ${subNames.join(', ')}`;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Generic page parser — extracts COMPONENT_SET nodes from any page structure
// ---------------------------------------------------------------------------

function parseGenericPage(pageNode) {
  const result = {
    figmaPageId: pageNode.id,
    componentName: pageNode.name ? pageNode.name.trim() : null,
    category: null,
    pageDescription: null,
    pageDescriptionIsPlaceholder: true,
    version: null,
    subComponents: [],
    exampleFrames: [],
    compositionNotes: null,
    convention: 'generic',
  };

  if (!pageNode.children) return result;

  // Extract any page-level text that looks like a description
  const topTexts = collectTexts(pageNode).filter((t) => t.text.length > 30);
  if (topTexts.length > 0) {
    // Use the longest text as the page description
    const longest = topTexts.sort((a, b) => b.text.length - a.text.length)[0];
    result.pageDescription = longest.text;
    result.pageDescriptionIsPlaceholder = isPlaceholder(longest.text);
  }

  // Find all COMPONENT_SET nodes anywhere in the page
  const componentSets = findAllComponentSets(pageNode);

  for (const compNode of componentSets) {
    const compData = parseComponentNode(compNode);
    const subComponent = {
      name: compNode.name,
      description: compNode.description || null,
      hasPlaceholderDescription: compNode.description
        ? isPlaceholder(compNode.description)
        : true,
      figmaNodeId: compNode.id,
      type: compData.type,
      variantCount: compData.variantCount,
      variantAxes: compData.variantAxes,
      booleanProps: compData.booleanProps,
      textProps: compData.textProps,
      instanceSwapProps: compData.instanceSwapProps,
      documentedProperties: [],
    };

    result.subComponents.push(subComponent);
  }

  if (result.subComponents.length > 2) {
    const subNames = result.subComponents.map((s) => s.name).filter(Boolean);
    result.compositionNotes = `Compound component with ${subNames.length} sub-components: ${subNames.join(', ')}`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Page identification — detect which pages contain components
// ---------------------------------------------------------------------------

/**
 * Identify component pages from the file structure.
 * MUI uses ❖ prefix. Other systems may use different conventions.
 * Falls back to filtering out known non-component pages.
 */
function identifyComponentPages(pages) {
  // Strategy 1: MUI convention — ❖ prefix
  const muiPages = pages.filter((p) => p.name.trim().startsWith('❖'));
  if (muiPages.length > 0) {
    console.log(`Detected MUI page convention (❖ prefix): ${muiPages.length} pages`);
    return { pages: muiPages, convention: 'mui_prefix' };
  }

  // Strategy 2: Filter out known non-component pages
  const skipPatterns = [
    /^cover$/i,
    /^readme$/i,
    /^changelog$/i,
    /^getting started$/i,
    /^_/,           // Internal/hidden pages
    /^---/,         // Separator pages
    /thumbnail/i,
    /^index$/i,
  ];

  const componentPages = pages.filter((p) => {
    const name = p.name.trim();
    return !skipPatterns.some((pat) => pat.test(name));
  });

  console.log(`Using generic page identification: ${componentPages.length} of ${pages.length} pages (filtered ${pages.length - componentPages.length} non-component pages)`);
  return { pages: componentPages, convention: 'generic' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Reading doc frames for ${SYSTEM} (file: ${FILE_KEY})...`);
  console.log('Fetching file structure...');
  const fileData = await figmaGet(`/files/${FILE_KEY}?depth=1`);

  const allPages = fileData.document.children;
  const { pages: componentPages, convention: pageConvention } = identifyComponentPages(allPages);

  console.log(`Found ${componentPages.length} component pages (convention: ${pageConvention}).`);

  // Fetch all component pages at sufficient depth.
  const BATCH_SIZE = 3;
  const allPageData = {};

  for (let i = 0; i < componentPages.length; i += BATCH_SIZE) {
    const batch = componentPages.slice(i, i + BATCH_SIZE);
    const ids = batch.map((p) => p.id).join(',');
    console.log(
      `Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(componentPages.length / BATCH_SIZE)}: ${batch.map((p) => p.name.trim()).join(', ')}...`
    );
    const nodeData = await figmaGet(
      `/files/${FILE_KEY}/nodes?ids=${ids}&depth=12`
    );
    Object.assign(allPageData, nodeData.nodes);
  }

  // Parse each page using the appropriate convention.
  const components = [];
  const conventionStats = { mui: 0, generic: 0 };

  for (const [pageId, pageNode] of Object.entries(allPageData)) {
    const convention = detectConvention(pageNode.document);
    conventionStats[convention]++;

    const parsed = convention === 'mui'
      ? parseMuiPage(pageNode.document)
      : parseGenericPage(pageNode.document);

    if (!parsed.convention) parsed.convention = convention;
    components.push(parsed);
    console.log(
      `  [${convention}] ${parsed.componentName || pageId}: ${parsed.subComponents.length} sub-components`
    );
  }

  console.log(`Convention breakdown: MUI=${conventionStats.mui}, Generic=${conventionStats.generic}`);

  // ---------------------------------------------------------------------------
  // Output: documentation frame metadata
  // ---------------------------------------------------------------------------

  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      source: `Figma REST API /v1/files/${FILE_KEY}/nodes`,
      fileKey: FILE_KEY,
      system: SYSTEM,
      description:
        `Documentation frame metadata extracted from ${SYSTEM} Figma file. Feeds Cluster 3 dimension 3.5.`,
      readerVersion: '2.0',
      totalPages: components.length,
      totalSubComponents: components.reduce(
        (sum, c) => sum + c.subComponents.length,
        0
      ),
      conventionBreakdown: conventionStats,
    },
    components,
  };

  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${SYSTEM}-doc-frames.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // ---------------------------------------------------------------------------
  // Output: audit findings
  // ---------------------------------------------------------------------------

  const findings = [];
  let fCounter = 1;
  function fid(n) {
    return `DFM-${String(n).padStart(3, '0')}`;
  }

  // Score page-level descriptions.
  const withDescription = components.filter(
    (c) => c.pageDescription && !c.pageDescriptionIsPlaceholder
  );
  const withPlaceholder = components.filter(
    (c) => c.pageDescriptionIsPlaceholder
  );

  findings.push({
    id: fid(fCounter++),
    dimension: 'doc_frame_metadata',
    severity: withDescription.length === components.length ? 'pass' : 'warning',
    node_id: null,
    node_name: null,
    description: `${withDescription.length} of ${components.length} component pages have a real page-level description. ${withPlaceholder.length} have placeholder or missing descriptions.`,
    evidence: [
      `With description: ${withDescription.map((c) => c.componentName).join(', ')}`,
      withPlaceholder.length > 0
        ? `Placeholder/missing: ${withPlaceholder.map((c) => c.componentName).join(', ')}`
        : 'None missing',
    ],
    recommendation:
      'Page-level descriptions are the primary source of intent metadata readable from the Figma file. Replace placeholder text with functional descriptions.',
    contract_ref: {
      type: 'documentation_contract',
      level: null,
      path: null,
      field: 'pageDescription',
    },
    auto_fixable: false,
  });

  // Score sub-component descriptions.
  const allSubs = components.flatMap((c) => c.subComponents);
  const subsWithDesc = allSubs.filter(
    (s) => s.description && !s.hasPlaceholderDescription
  );
  const subsPlaceholder = allSubs.filter((s) => s.hasPlaceholderDescription);

  findings.push({
    id: fid(fCounter++),
    dimension: 'doc_frame_metadata',
    severity: subsWithDesc.length > allSubs.length * 0.5 ? 'warning' : 'blocker',
    node_id: null,
    node_name: null,
    description: `${subsWithDesc.length} of ${allSubs.length} sub-component sections have a real description. ${subsPlaceholder.length} have placeholder text or no description.`,
    evidence: [
      `Total sub-components: ${allSubs.length}`,
      `With real description: ${subsWithDesc.length}`,
      `With placeholder: ${subsPlaceholder.length}`,
      `Coverage: ${allSubs.length > 0 ? Math.round((subsWithDesc.length / allSubs.length) * 100) : 0}%`,
    ],
    recommendation:
      'Sub-component descriptions should contain functional intent: when to use the sub-component, constraints, and expected behaviour.',
    contract_ref: {
      type: 'documentation_contract',
      level: null,
      path: null,
      field: 'subComponent.description',
    },
    auto_fixable: false,
  });

  // Variant richness summary.
  const totalVariants = allSubs.reduce((sum, s) => sum + s.variantCount, 0);
  const totalAxes = allSubs.reduce(
    (sum, s) => sum + s.variantAxes.length,
    0
  );

  findings.push({
    id: fid(fCounter++),
    dimension: 'doc_frame_metadata',
    severity: 'note',
    node_id: null,
    node_name: null,
    description: `Structural metadata: ${totalVariants} total variants across ${allSubs.length} sub-components, with ${totalAxes} variant axes. This data is machine-readable and supports agent reasoning about component capabilities.`,
    evidence: [
      `Sub-components: ${allSubs.length}`,
      `Total variants: ${totalVariants}`,
      `Variant axes: ${totalAxes}`,
      `Boolean props: ${allSubs.reduce((s, c) => s + c.booleanProps.length, 0)}`,
      `Text props: ${allSubs.reduce((s, c) => s + c.textProps.length, 0)}`,
      `Instance swap props: ${allSubs.reduce((s, c) => s + c.instanceSwapProps.length, 0)}`,
    ],
    recommendation:
      'The variant and property structure is well-defined and extractable. Pair with descriptions that carry intent.',
    contract_ref: null,
    auto_fixable: false,
  });

  // Composition patterns.
  const compoundComponents = components.filter(
    (c) => c.subComponents.length > 2
  );
  if (compoundComponents.length > 0) {
    findings.push({
      id: fid(fCounter++),
      dimension: 'doc_frame_metadata',
      severity: 'note',
      node_id: null,
      node_name: null,
      description: `${compoundComponents.length} compound component(s) detected with explicit sub-component composition visible in the frame structure.`,
      evidence: compoundComponents.map(
        (c) =>
          `${c.componentName}: ${c.subComponents.map((s) => s.name).join(', ')}`
      ),
      recommendation:
        'Compound component anatomy is readable from the frame structure. The reader can infer which sub-components compose each compound component.',
      contract_ref: null,
      auto_fixable: false,
    });
  }

  const findingsOutput = {
    _meta: {
      generatedAt: new Date().toISOString(),
      schema_version: '2.2',
      system: SYSTEM,
      description:
        `Documentation frame metadata findings for ${SYSTEM}. Cluster 3 dimension 3.5. Generated by read-figma-doc-frames.mjs.`,
    },
    summary: {
      total_findings: findings.length,
      by_severity: {
        blocker: findings.filter((f) => f.severity === 'blocker').length,
        warning: findings.filter((f) => f.severity === 'warning').length,
        note: findings.filter((f) => f.severity === 'note').length,
        pass: findings.filter((f) => f.severity === 'pass').length,
      },
      coverage: {
        pages_with_description: withDescription.length,
        pages_total: components.length,
        subs_with_description: subsWithDesc.length,
        subs_total: allSubs.length,
        total_variants: totalVariants,
        total_variant_axes: totalAxes,
      },
    },
    findings,
  };

  const findingsDir = join(repoRoot, 'audit', SYSTEM === 'mui' ? 'material-ui' : SYSTEM, 'v2.2');
  mkdirSync(findingsDir, { recursive: true });
  const findingsPath = join(findingsDir, 'doc-frame-findings.json');
  writeFileSync(
    findingsPath,
    JSON.stringify(findingsOutput, null, 2),
    'utf-8'
  );

  // ---------------------------------------------------------------------------
  // Console summary
  // ---------------------------------------------------------------------------

  console.log('');
  console.log(`=== Documentation Frame Reader (${SYSTEM}) ===`);
  console.log(`Pages processed:     ${components.length}`);
  console.log(`Sub-components:      ${allSubs.length}`);
  console.log(`Total variants:      ${totalVariants}`);
  console.log(`Variant axes:        ${totalAxes}`);
  console.log(`Page descriptions:   ${withDescription.length}/${components.length} real`);
  console.log(`Sub-comp descriptions: ${subsWithDesc.length}/${allSubs.length} real`);
  console.log(`Compound components: ${compoundComponents.length}`);
  console.log('');
  console.log(`Metadata output:  ${outputPath}`);
  console.log(`Findings output:  ${findingsPath}`);
  console.log(`Total findings:   ${findings.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
