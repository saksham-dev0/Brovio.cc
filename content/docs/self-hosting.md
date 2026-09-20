---
title: Self-hosting
order: 2
---

# Self-hosting

This guide starts from a machine with nothing installed and ends with the
application running and staying up. Follow it top to bottom.

The whole application is open source under AGPL-3.0. Self-hosted installations
have no feature gates, no plan limits, and no subscription.

## Before you start

You need a machine that stays on — a VPS, a home server, or your own computer if
you only want to try it. 2 CPU cores, 4 GB of RAM, and 20 GB of disk are enough.

You also need accounts with five services. **This is not optional**, and it is
the part people are surprised by: three of the platforms this is built on cannot
be self-hosted at all.

| Service | What it does | Free tier | Sign up |
| --- | --- | --- | --- |
| Clerk | Sign-in and organizations | Yes | <https://clerk.com> |
| Liveblocks | Realtime multiplayer canvas | Yes | <https://liveblocks.io> |
| Browserbase | Cloud browsers, session replays, model inference | Yes | <https://browserbase.com> |
| Trigger.dev | Runs workflows in the background | Yes, or self-host it | <https://trigger.dev> |
| Resend | Email, only for the Send Email node | Yes | <https://resend.com> |

Postgres is included in the stack. You do **not** need a database provider.

Create the accounts now and keep the tabs open — step 3 asks for keys from each.

## 1. Install Docker

Everything runs in containers, so Docker is the only thing to install.

**Linux**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in so the group change applies.

**macOS**

```bash
brew install docker docker-compose colima
mkdir -p ~/.docker/cli-plugins
ln -sfn /opt/homebrew/opt/docker-compose/bin/docker-compose \
  ~/.docker/cli-plugins/docker-compose
colima start --cpu 4 --memory 8 --disk 60
```

Docker Desktop works too, if you prefer it.

**Windows**

Install Docker Desktop with the WSL 2 backend, then run every command in this
guide from inside a WSL 2 shell.

Check it works:

```bash
docker compose version
```

## 2. Get the code

```bash
git clone <repository-url>
cd browser-automation
```

## 3. Configure it

```bash
cp .env.example .env
```

Open `.env` and fill it in. Every line has a comment saying what it is and where
to get it; the [environment variable reference](/docs/environment-variables) has
the same list with more detail.

The values that matter most:

- `DEPLOYMENT_MODE=self-hosted` — already set in the template. **Leave it.** It
  switches billing off entirely, so no payment account is needed.
- `NEXT_PUBLIC_APP_URL` — where people will reach this. `http://localhost:3000`
  while testing, your real domain in production.
- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` — already point at the bundled
  Postgres. Leave them alone unless you are bringing your own database.
- Everything else is a key from one of the accounts in the table above.

Two things to know about Clerk while you are there:

- **Organizations must be enabled** in your Clerk dashboard. Every workflow
  belongs to an organization, and sign-up breaks without it.
- Use the development keys for a localhost test. A real domain needs a Clerk
  production instance.

## 4. Set up Trigger.dev

Workflow runs execute as a Trigger.dev task. **Nothing runs workflows without
this**, and it is the one step that involves editing a file rather than setting
a variable.

1. Create a project in Trigger.dev and copy its reference.
2. Open `trigger.config.ts` and replace the `project` value with yours:

   ```ts
   export default defineConfig({
     project: "proj_your_reference_here",
     // ...
   })
   ```

   The value that ships in the repository points at someone else's project. If
   you leave it, your deploy fails.

3. Put a secret key in `.env` as `TRIGGER_SECRET_KEY`.
4. Put a personal access token in `.env` as `TRIGGER_ACCESS_TOKEN`, from your
   account settings. The setup script uses it to deploy the tasks for you.

Full detail, including running your own Trigger.dev instance:
[Trigger.dev setup](/docs/trigger-dev).

## 5. Start it

```bash
./scripts/setup.sh
```

The script checks the machine, starts Docker if it is not running, verifies
every required value in `.env` and names any that are missing, builds the
images, starts the stack, waits until the application answers, configures Docker
to start on boot, and deploys the workflow tasks.

The first build takes several minutes. When it finishes, open the address it
prints.

Re-run the same script any time — after pulling new code, or to check on things.
It changes nothing that is already correct.

### Doing it by hand

If you would rather not run the script:

```bash
docker compose up -d --build          # start the stack
docker compose run --rm trigger-deploy  # deploy the workflow tasks
```

## 6. Confirm it works

1. Open the address. You should see the landing page.
2. Sign up. You will be asked to create an organization.
3. You land on the workflow list — **no payment prompt.** That is
   `DEPLOYMENT_MODE=self-hosted` doing its job. If you are asked to subscribe,
   that value is wrong.
4. Create a workflow, add a Start node and an Open URL node, connect them, and
   press Run. The steps should light up and a replay should appear when it
   finishes.

If the run fails, Trigger.dev is not set up. Go back to step 4.

## Keeping it running

The application and the database are declared `restart: unless-stopped`:

- If a process crashes, Docker restarts it.
- If the machine reboots, Docker starts the stack again — provided the Docker
  daemon starts on boot, which the setup script configures.
- If you stop something deliberately with `docker compose stop`, it stays
  stopped.

Your data survives all of this: Postgres writes to the `postgres-data` volume,
not into the container. The Trigger.dev tasks live on your Trigger.dev instance
and never need redeploying after a restart.

**On macOS the daemon starts at login, not at boot**, and a laptop that sleeps
stops the stack. For something meant to stay up, use a Linux server.

Check on it:

```bash
docker compose ps
docker compose logs -f app
```

## Putting it on the internet

The stack serves plain HTTP on port 3000. Put a reverse proxy in front for TLS —
Caddy is the least work:

```caddyfile
your-domain.com {
  reverse_proxy localhost:3000
}
```

Then set `NEXT_PUBLIC_APP_URL` to `https://your-domain.com` and rebuild. That
value is compiled into the browser bundle, so it needs a rebuild rather than a
restart:

```bash
docker compose up -d --build
```

Also switch Clerk to a production instance and add your domain to it.

## Upgrading

```bash
git pull
./scripts/setup.sh
```

Migrations re-apply themselves on every start, so there is no separate database
step.

## When something is wrong

**The app never starts.** Look at the migration step first — the application
waits for it:

```bash
docker compose logs migrate
```

**The build runs out of memory on macOS.** colima's default is 2 GB and the
build needs more:

```bash
colima stop && colima start --cpu 4 --memory 8 --disk 60
```

**Workflow runs fail.** The tasks are not deployed. Run
`docker compose run --rm trigger-deploy`, and check that `trigger.config.ts` has
your own project reference.

**You are asked to pay.** `DEPLOYMENT_MODE` is not exactly `self-hosted`.

**Sign-up goes nowhere.** Organizations are not enabled on your Clerk instance.

**Port 3000 is taken.** Change the host side of the mapping in
`docker-compose.yml` — `"8080:3000"` — and update `NEXT_PUBLIC_APP_URL` to match.

Start over from an empty database:

```bash
docker compose down -v
./scripts/setup.sh
```

`-v` deletes the volume. Everything in the database goes with it.
