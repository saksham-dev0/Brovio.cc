#!/usr/bin/env bash
#
# One-command self-hosting setup.
#
#   ./scripts/setup.sh
#
# Checks the host for what it needs, creates .env from the template, verifies
# every required value is filled in, builds and starts the stack, and makes it
# come back after a reboot. Safe to run again at any time.

set -euo pipefail

cd "$(dirname "$0")/.."

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'

step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$RESET"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die()  { printf '\n%sError:%s %s\n\n' "$RED" "$RESET" "$1" >&2; exit 1; }

case "$(uname -s)" in
  Darwin) OS=mac ;;
  Linux)  OS=linux ;;
  *)      die "Unsupported operating system: $(uname -s). This script handles macOS and Linux." ;;
esac

# ---------------------------------------------------------------- 1. Docker ---
step "Checking Docker"

if ! command -v docker >/dev/null 2>&1; then
  if [ "$OS" = mac ]; then
    if command -v brew >/dev/null 2>&1; then
      warn "Docker not found. Installing colima and the Docker CLI with Homebrew."
      brew install docker docker-compose colima
    else
      die "Docker is not installed, and Homebrew is not available to install it.
Install Homebrew from https://brew.sh then run this script again,
or install Docker Desktop from https://docker.com/products/docker-desktop"
    fi
  else
    die "Docker is not installed. Install it with:

  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker \$USER

Then log out and back in, and run this script again."
  fi
fi
ok "docker CLI present"

# The compose plugin ships separately from the CLI in several distributions.
if ! docker compose version >/dev/null 2>&1; then
  if [ "$OS" = mac ] && [ -x /opt/homebrew/opt/docker-compose/bin/docker-compose ]; then
    mkdir -p ~/.docker/cli-plugins
    ln -sfn /opt/homebrew/opt/docker-compose/bin/docker-compose ~/.docker/cli-plugins/docker-compose
    ok "linked the compose plugin"
  else
    die "The 'docker compose' plugin is missing. Install it with your package
manager (for example: sudo apt install docker-compose-plugin) and run this
script again."
  fi
fi
ok "docker compose present"

# ---------------------------------------------------------------- 2. Daemon ---
step "Checking the Docker daemon"

if ! docker info >/dev/null 2>&1; then
  if [ "$OS" = mac ] && command -v colima >/dev/null 2>&1; then
    warn "Daemon not running. Starting colima (this takes a minute on first run)."
    # next build runs inside the image and needs more than colima's default 2GB.
    colima start --cpu 4 --memory 8 --disk 60
  elif [ "$OS" = linux ]; then
    warn "Daemon not running. Starting it."
    sudo systemctl start docker
  else
    die "The Docker daemon is not running. Start Docker Desktop, then run this script again."
  fi
fi
docker info >/dev/null 2>&1 || die "Still cannot reach the Docker daemon. Start it and run this script again."
ok "daemon reachable"

# ------------------------------------------------------------------- 3. Env ---
step "Checking configuration"

if [ ! -f .env ]; then
  cp .env.example .env
  cat <<EOF

  Created ${BOLD}.env${RESET} from the template.

  Open it and fill in your keys, then run this script again. Every value is
  explained, with a signup link, in .env.example and in
  content/docs/environment-variables.md

EOF
  exit 0
fi
ok ".env exists"

# Values every self-hosted installation needs. Billing keys are deliberately
# absent: self-hosted mode never contacts the payment provider.
REQUIRED=(
  DEPLOYMENT_MODE
  NEXT_PUBLIC_APP_URL
  DATABASE_URL
  DATABASE_URL_UNPOOLED
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  NEXT_PUBLIC_CLERK_SIGN_IN_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_URL
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
  NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY
  LIVEBLOCKS_SECRET_KEY
  BROWSERBASE_API_KEY
  BROWSERBASE_PROJECT_ID
  TRIGGER_SECRET_KEY
)

missing=()
for key in "${REQUIRED[@]}"; do
  # Matches `KEY=value`, ignoring commented lines. Empty value counts as missing.
  value="$(sed -n "s/^${key}=//p" .env | head -1 | tr -d '[:space:]')"
  [ -z "$value" ] && missing+=("$key")
done

if [ ${#missing[@]} -gt 0 ]; then
  printf '\n%sThese values are still empty in .env:%s\n\n' "$RED" "$RESET"
  for key in "${missing[@]}"; do printf '  - %s\n' "$key"; done
  printf '\nEach one is explained in content/docs/environment-variables.md\n\n'
  exit 1
fi
ok "all required values are set"

if ! grep -q '^DEPLOYMENT_MODE=self-hosted' .env; then
  warn "DEPLOYMENT_MODE is not 'self-hosted'. The app will require a paid subscription."
fi

# ------------------------------------------------------------------ 4. Boot ---
step "Building and starting (the first build takes several minutes)"
docker compose up -d --build
ok "containers started"

step "Waiting for the application to come up"
for _ in $(seq 1 60); do
  status="$(docker compose ps --format '{{.Health}}' app 2>/dev/null | head -1 || true)"
  [ "$status" = "healthy" ] && break
  sleep 5
done

if [ "${status:-}" != "healthy" ]; then
  warn "The app did not report healthy in five minutes. Recent logs:"
  docker compose logs --tail 40 app || true
  printf '\nIf the app never started, check the migration step:\n  docker compose logs migrate\n\n'
  exit 1
fi
ok "application is healthy"

# ------------------------------------------------------------- 5. Autostart ---
step "Making the stack survive a reboot"

if [ "$OS" = mac ] && command -v brew >/dev/null 2>&1; then
  brew services start colima >/dev/null 2>&1 && ok "colima will start at login" \
    || warn "Could not register colima as a service. Run: brew services start colima"
  warn "On macOS this starts at login, not at boot, and a sleeping laptop stops the stack."
elif [ "$OS" = linux ]; then
  sudo systemctl enable docker >/dev/null 2>&1 && ok "Docker will start at boot" \
    || warn "Could not enable Docker at boot. Run: sudo systemctl enable docker"
fi

# -------------------------------------------------------------- 6. Workflows --
step "Deploying the workflow tasks"

if grep -q '^TRIGGER_ACCESS_TOKEN=.\+' .env; then
  if docker compose run --rm trigger-deploy; then
    ok "workflow tasks deployed"
  else
    warn "The deploy failed. Workflow runs will not work until it succeeds."
    warn "See content/docs/trigger-dev.md"
  fi
else
  warn "TRIGGER_ACCESS_TOKEN is not set, so the workflow tasks were not deployed."
  warn "Runs will fail until you deploy them. See content/docs/trigger-dev.md"
fi

# ------------------------------------------------------------------- Done ----
APP_URL="$(sed -n 's/^NEXT_PUBLIC_APP_URL=//p' .env | head -1)"
printf '\n%sReady.%s Open %s\n\n' "$GREEN" "$RESET" "${APP_URL:-http://localhost:3000}"
printf 'Useful commands:\n'
printf '  docker compose logs -f app    follow the logs\n'
printf '  docker compose ps             check status\n'
printf '  docker compose down           stop everything\n'
printf '  ./scripts/setup.sh            re-run after pulling new code\n\n'
