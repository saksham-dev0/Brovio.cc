# Contributing

## Getting set up

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in. See
   [environment variables](content/docs/environment-variables.md).
3. `npm run db:migrate`
4. `npm run dev`
5. In a second terminal, `npx trigger.dev@latest dev` so workflow runs work.

Set `DEPLOYMENT_MODE=self-hosted` while developing unless you are specifically
working on billing — otherwise the subscription gate sends you to `/upgrade`.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm run format
```

All three must be clean.

## Adding a workflow node

Three edits under `features/workflows/nodes/`:

1. The implementation file, for example `open-url.ts`.
2. Registration in `node-executors.ts`. The `satisfies` contract makes a missing
   executor a compile error.
3. A manifest entry in `node-registry.ts` — kind, label, icon, accent, input
   fields, and outputs.

The run task and the canvas step node are registry-driven. Do not edit them to
add a node.

After changing anything under `features/workflows/`, run
`npx trigger.dev@latest deploy` for the change to take effect in a deployed
environment.

## Conventions

- **Database types come from the Drizzle schema.** Use `typeof table.$inferSelect`
  and narrow with `Pick` or `Omit`. Never hand-write a row shape.
- **Escape apostrophes and quotes in JSX text content** — `&apos;` and `&quot;`.
  The `react/no-unescaped-entities` lint rule will fail the build otherwise.
  This applies to literal text between tags, not to string attributes.
- **The database client is typed to Neon's HTTP driver** even when a self-hosted
  installation runs on a TCP pool. That pins the codebase to the smaller
  capability set of the two — notably no interactive transactions — so nothing
  can be written that works self-hosted and then fails on the hosted deployment.
- **Check the installed package's own docs before using an API from memory.**
  This project pins major versions of Next.js, React Flow, and Stagehand whose
  APIs differ from older releases.

## License

Contributions are accepted under AGPL-3.0.
