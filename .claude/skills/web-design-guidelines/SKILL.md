---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

<!--
[work-support patch] 元の版は実行のたびに GitHub の main ブランチから command.md を取得し、
その内容を指示として実行していた（固定されていない外部の内容が指示になる経路）。
このリポジトリでは、コミットを固定したコピー guidelines.md を読むように変更している。
-->

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the vendored guidelines in [guidelines.md](./guidelines.md) (pinned copy; do NOT fetch from the network)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the guidelines
4. Output findings in the terse `file:line` format

## Project-specific notes (work-support)

- This app is a Vite + React Router SPA (no SSR): treat "Hydration Safety" rules as not applicable except the controlled-input rule.
- UI copy is Japanese: skip English-only copy rules (Title Case, curly quotes, `&` over "and"). Follow `docs/steering/ui-design.md` for tone instead.
- Report findings only; fixes follow the project's implementation flow.

## Usage

When a user provides a file or pattern argument:
1. Read [guidelines.md](./guidelines.md)
2. Read the specified files
3. Apply the rules (with the project-specific notes above)
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
