# CLAUDE.md

## What this repo is
This repo contains the intelligence layer for a design system POC.
It has no component code. All component definitions live in Figma.
This repo exists to make those definitions legible to AI agents.

The design system is a banking CTA button built from scratch with a
three-layer token architecture: primitives, semantic, and component.
All tokens are defined as Figma Variables in a Figma file.

## How to navigate this repo
1. Read manifest.json first to understand what this system contains
2. Read index/components.index.json to find what components exist
3. Read the relevant contract in contracts/ for the component you
   are working with
4. Read tokens/ files to resolve token values
5. Never invent structure that is not in the index

## What you are allowed to do
- Read from Figma via the official Figma MCP
- Write contract JSON files to contracts/
- Write Markdown documentation to docs/
- Write token data to tokens/
- Write component entries to index/

## What you are not allowed to do
- Invent component props that are not in the Figma file
- Hardcode hex values -- always resolve to token names
- Create files or folders not in this structure
- Assume a component exists if it is not in the index
- Skip the index -- always check what exists before creating

## Token architecture
Three layers, all defined as Figma Variables:
- tokens/primitives.json -- raw values, named by scale position
- tokens/semantic.json -- aliases to primitives, named by role
- tokens/component.json -- aliases to semantic tokens, named by
  component property and state

Alias chains must remain unbroken. Component tokens alias semantic
tokens. Semantic tokens alias primitives. Never alias primitives
directly from component tokens.

## Components in this system
Currently one component: Button
- Figma component name: Button
- Contract: contracts/button.contract.json
- Documentation: docs/button.md
- Variants: Size (Small, Medium, Large), State (Default, Hover,
  Active, Disabled)
- All properties bound to component-level Figma Variables
