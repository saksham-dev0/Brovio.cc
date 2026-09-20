---
title: Trigger.dev setup
order: 3
---

# Trigger.dev setup

Workflow runs execute as a Trigger.dev task. Nothing in the application runs
workflows on its own, so **a self-hosted installation is not functional until
this is done**. `docker compose up` alone is not enough.

This is the one part of setup that is not just environment variables.

## 1. Get a Trigger.dev instance

Either create an account on [Trigger.dev Cloud](https://cloud.trigger.dev), or
stand up your own instance by following
[their self-hosting guide](https://trigger.dev/docs/self-hosting/overview).

Self-hosting the Trigger.dev platform needs a Docker registry and its own
Compose stack. It is their project to document, and it is not part of this
repository's stack.

## 2. Edit the project reference in source

Create a project in Trigger.dev and copy its reference. Then open
`trigger.config.ts` in the repository and replace the `project` value:

```ts
export default defineConfig({
  project: "proj_your_reference_here",
  // ...
})
```

This value ships in the repository pointing at the hosted deployment's own
project. **If you do not change it, your deploy targets a project you do not own
and will fail.** It is read from the file, not from the environment, so there is
no variable that overrides it.

## 3. Set the secret key

Copy a secret key for your target environment into `.env`:

```bash
TRIGGER_SECRET_KEY=tr_dev_...
```

If you are running your own Trigger.dev instance rather than their cloud, also
set `TRIGGER_API_URL` to that instance's URL — both in `.env` and in the
environment where you run the CLI:

```bash
TRIGGER_API_URL=https://trigger.example.com
```

## 4. Deploy the task code

Task code is **deployed** to your Trigger.dev instance. It is not a service in
the Compose stack, which is why there is no worker container.

Once deployed, it stays deployed. This is a one-off, not something to re-run on
every boot.

### From the Compose stack (Trigger.dev Cloud)

Put a personal access token in `.env` as `TRIGGER_ACCESS_TOKEN` — create one in
the Trigger.dev dashboard under your account settings — then:

```bash
docker compose run --rm trigger-deploy
```

Cloud builds the image remotely, so this needs nothing installed on your
machine beyond Docker itself.

### From your own machine

```bash
npx trigger.dev@latest deploy
```

While developing:

```bash
npx trigger.dev@latest dev
```

### Deploying to a self-hosted Trigger.dev instance

A self-hosted instance builds images **locally**, so the deploy needs Docker,
Docker Buildx, and a `docker login` against your registry. That cannot run from
inside the Compose stack — run it from your own machine with `TRIGGER_API_URL`
pointing at your instance.

Without a deploy, no tasks are registered and every workflow run fails.

## 5. Re-deploy after changes

Any change under `features/workflows/` — a new node, a changed executor —
requires deploying again before it takes effect:

```bash
docker compose run --rm trigger-deploy
```

Nothing else in the stack needs re-running. The application and database pick up
new code on `docker compose up -d --build`.

## Checking it worked

Open a workflow, add a Start node and an Open URL node, connect them, and press
Run. If the run console reports that background runs are not configured, the
secret key is missing. If the run never starts, the task code has not been
deployed to the project the config points at.
