# Contributing

Thank you for helping with the Mesh Things apps. This guide covers how changes reach `main`: branches, commits, pull requests, the API contract, and the deploy notes every pull request carries. Code structure and style follow [AGENTS.md](AGENTS.md) and the guides it links to in `docs/`.

## Branches

Each pull request has its own branch, created from `main` with `git switch -c` in this checkout. Do not use worktrees or a second checkout. Name the branch after the issue it addresses: `feat/<issue>-<slug>`, or `fix/` and `chore/` when those fit better. Do not reuse a branch for another pull request.

## Commits

Write each commit message as one line in the imperative, saying what the change does, for example `Copy the contract from the API's snapshot instead of editing it`. Commits carry no `Co-Authored-By` trailers or links to tools that helped write them.

## Before opening a pull request

The PR checks workflow runs the same steps you can run locally, with Node 22.18 or later:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The pre-commit hook is installed by `pnpm install`.

## API contract

The contract is `docs/openapi.json`, a copy of the schema the API serves at `https://api.sensical.es/schema`. It is never edited by hand. To bring in a new API version, sync it on a branch of its own:

```sh
git switch -c chore/openapi-<version>
pnpm openapi:sync
pnpm typecheck
```

`pnpm openapi:sync` downloads the schema and regenerates `packages/contracts`. Fix any app code the new types break in the same pull request. Syncing from `api.sensical.es` keeps the contract in step with the API in production. When a feature needs an API change that is not deployed yet, run that API locally and sync from it with `OPENAPI_URL=http://localhost pnpm openapi:sync`, and say so in the pull request.

## Pull requests

Keep the description short. Say what changes and why, as a few bullet points if there are several parts, and link the issue it closes. If the pull request depends on an API pull request, say so on the last line, for example `Depends on sensical-coop/mesh-things#75.` Descriptions carry no attribution footers.

Request a CodeRabbit review by commenting `@coderabbitai review`. Address its notes, or reply on the thread when a note does not apply.

### Deploy comment

Production `.env` is not in the repository, and deploys are run by hand, so every pull request gets a comment with what the operator needs. Post it when you open the pull request, and update it if the pull request changes.

````markdown
### .env

Variables to add, change or remove, or "Nothing to add, change or remove."

### Commands

One sentence on which images change and why, then the exact commands:

```
cd ~/meshtastic-things-apps
git pull
docker compose build <services>
docker compose up -d <services>
```

Check:

```
docker compose ps <services>   # healthy
```

Then a short check in the browser, if the change is visible there.
````

## Deploying

The server builds its own images. Run the commands from the deploy comment in the repository checkout.

The Caddyfile is mounted into the container, so a plain `up -d` does not pick up an edit to it. Recreating the container does.

| Change | Rebuild |
|---|---|
| `apps/web` or `packages/contracts` | `web` |
| `apps/docs` | `docs` |
| `packages/ui` or `packages/tsconfig`, which both apps build from | `web` and `docs` |
| `docker/Dockerfile` or `docker/Dockerfile.docs` | the image built from it |
| The root workspace files (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`) | `web` and `docs` |
| `docker/Caddyfile` | nothing: `docker compose up -d --force-recreate caddy` |
| `SITE_ADDRESS` in `.env` | nothing: `docker compose up -d caddy` |

> **Note**
> `VITE_API_URL`, `VITE_DISABLE_MOCK_API` and `VITE_WEB_URL` are compiled into the bundles when the image is built. After changing one in `.env`, rebuild the image that uses it. Restarting the container has no effect.
