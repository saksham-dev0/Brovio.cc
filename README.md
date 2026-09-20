# Browser Automation

Build automations on a canvas and run them on real cloud browsers.
Open source under AGPL-3.0.

Drop nodes onto a canvas to open pages, act on them, observe them, and extract
structured data. Connect them, press Run, and watch each step execute live —
with a full session replay when it finishes.

## Two ways to run it

**Hosted.** Subscribe and we run it for you. Nothing to install.

**Self-hosted.** Run the same application yourself, free. No feature gates, no
limits, no subscription. See the [self-hosting guide](content/docs/self-hosting.md).

## Quickstart (self-hosting)

You need Docker, and free accounts with Clerk, Liveblocks, Browserbase, and
Trigger.dev. Postgres is included — no database provider needed.

```bash
git clone <repository-url>
cd browser-automation
./scripts/setup.sh
```

The script tells you what is missing, creates your `.env`, builds and starts
everything, makes it survive reboots, and deploys the workflow tasks. Run it
again any time — after pulling new code, or just to check on things.

Full walkthrough from a bare machine, including installing Docker and where each
key comes from: **[self-hosting guide](content/docs/self-hosting.md)**.

> One step is not just an environment variable: Trigger.dev needs your own
> project reference in `trigger.config.ts`. Workflow runs fail without it.
> See [Trigger.dev setup](content/docs/trigger-dev.md).

Upgrading:

```bash
git pull
./scripts/setup.sh
```

## Services you need accounts for

Self-hosting is not dependency-free. Clerk, Liveblocks, and Browserbase cannot
be self-hosted, though each has a free tier. Trigger.dev can be self-hosted or
used via their cloud. Postgres runs in the Compose stack.

Full list with signup links:
[environment variables](content/docs/environment-variables.md).

## Built with

Next.js 16 (App Router), React 19, Drizzle ORM on Postgres, Clerk for auth and
organizations, Trigger.dev for background runs, Liveblocks for the multiplayer
canvas, React Flow for the canvas itself, and Stagehand on Browserbase for the
browser work.

## Documentation

- [Self-hosting](content/docs/self-hosting.md)
- [Trigger.dev setup](content/docs/trigger-dev.md)
- [Environment variables](content/docs/environment-variables.md)
- [Nodes](content/docs/nodes.md)
- [Architecture](content/docs/architecture.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0. You may run, modify, and self-host this freely. If you offer it to
others as a network service, you must publish your modifications.
