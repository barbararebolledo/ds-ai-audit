# Workflow

## What you edit

You work in one file:
`audit/material-ui/v2.1/mui-audit-v2.1.json`

This is the audit output for Material UI. It contains all the
findings, scores, and recommendations. You are rewriting the
text fields inside the findings: `summary`, `description`, and
`recommendation`. You are not changing scores, severity levels,
IDs, or any structural fields.

As you rewrite, you are also developing a set of writing rules
(tone of voice, structure patterns, word choices) that will
become the content design guidelines for all future audit outputs.
Save these rules as a separate file in the same branch.

---

## Your branch

You work on a branch, not on main. Only Barbara pushes to main.

To create your branch (one time, in the terminal):

```
cd /Users/barbara.rebolledo/Github\ repo/ds-ai-audit
git checkout -b content/findings-rewrite
```

To switch to your branch if it already exists:

```
git checkout content/findings-rewrite
```

After editing, commit and push to your branch:

```
git add .
git commit -m "rewrite: [brief description of what you changed]"
git push origin content/findings-rewrite
```

When a batch of rewrites is ready for review, tell Barbara. She
will review and merge to main.

---

## How you see your changes

The dashboard (`ds-audit-dashboard` repo) displays the audit JSON
visually. You use it to see how your rewritten copy looks in
context: in the overview, in the cluster detail, in finding lists.

To run the dashboard locally:

1. Open the `ds-audit-dashboard` folder in Cursor
2. Open the terminal in Cursor (Terminal > New Terminal)
3. Install dependencies (first time only):
   ```
   npm install
   ```
4. Start the dev server:
   ```
   npm run dev
   ```
5. Open the URL it shows (usually http://localhost:5173)

The dashboard reads from a JSON file in its own `src/data/`
directory. To see your changes:

1. Copy your updated audit JSON from the audit repo into the
   dashboard's data directory:
   ```
   cp /Users/barbara.rebolledo/Github\ repo/ds-ai-audit/audit/material-ui/v2.1/mui-audit-v2.1.json /Users/barbara.rebolledo/Github\ repo/ds-audit-dashboard/src/data/audit-data.json
   ```
2. The dashboard should hot-reload automatically. If not, refresh
   the browser.

You do not need to commit anything in the dashboard repo. It is
just your preview tool.

---

## Tools you need

**VS Code** -- for editing the audit JSON and running Claude Code.
Claude Code helps you reason about rewrites, test phrasing, and
develop the writing rules.

**Cursor** -- for running the dashboard preview. You open the
dashboard repo here, start the dev server, and view your changes
in the browser.

**Git** -- for version control. Barbara will help you with the
initial setup. After that, the three commands above (add, commit,
push) are all you need.

You do not need both VS Code and Cursor open at the same time.
A typical cycle:

1. Open VS Code with the audit repo. Use Claude Code to rewrite
   a batch of findings.
2. When you want to preview, open Cursor with the dashboard repo,
   copy the JSON over, and check the result in the browser.
3. Go back to VS Code for the next batch.

---

## What to rewrite first

Start with the blockers. They carry the most weight in the
dashboard and are the first thing a system owner sees.

The current blockers are:

1. CDC-001 -- component descriptions are code snippets (Cluster 3)
2. IQ-001 -- no structured intent documentation (Cluster 3)
3. TA-001 -- token architecture is flat (Cluster 1)
4. TD-001 -- 81.6% of variables have no description (Cluster 1)
5. MOT-001 -- no motion duration tokens (Cluster 4)
6. MOT-002 -- no motion easing tokens (Cluster 4)
7. ES-001 -- no empty state coverage (Cluster 4)
8. ER-001 -- no error recovery patterns (Cluster 4)
9. HD-001 -- no help documentation (Cluster 4)
10. DPG-001 -- no parity gap register (Cluster 6)

After blockers, move to warnings, then notes. Pass findings
(severity_rank 0) are informational and lowest priority.

---

## What to capture as you go

As you rewrite, you will notice patterns in what works and what
does not. Capture these as writing rules. For example:

- How long should a summary be? (Currently varies wildly)
- Should descriptions use percentages or plain language?
- How specific should recommendations be?
- Should the tone change between severity levels?
- What words work well? What words are jargon?

Save your rules in a file on your branch:
`docs/content-design/finding-copy-rules.md`

These rules will eventually become a "skill" that Claude uses
when generating future audit findings automatically.
