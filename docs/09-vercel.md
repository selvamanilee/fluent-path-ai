# Deploying on Vercel

> **Start here for a step-by-step free-tier setup: [10-free-tier-setup.md](10-free-tier-setup.md).**

Three Vercel projects from this one repository, each with its own **Root Directory**:

| Project | Root Directory | URL |
|---|---|---|
| web | `apps/web` | https://web-green-three-50.vercel.app |
| api | `apps/api` | https://api-rouge-five-51.vercel.app |
| agent | `services/agent` | https://agent-ashen-five.vercel.app |

The web app rewrites `/api/*` to the API project (`apps/web/vercel.json`), so the browser only ever talks to the web domain. That keeps the `SameSite=Strict` refresh cookie working and needs no CORS. If the API URL changes, update that rewrite.

## Web project build settings
Framework preset **Angular**, Output Directory **`dist/web`** (the default). `ng build` writes `index.html` directly into `dist/web` (`outputPath.browser = ""`), so the site root isn't empty.

## 1. Database: Neon
API project → **Storage** → **Create Database** → **Neon** → connect to all environments. This sets `DATABASE_URL`, and the API build then runs migrations + the idempotent seed (`npm run vercel-build`).

## 2. Environment variables

**agent** project
| Name | Value |
|---|---|
| `MODEL_PROVIDER` | `groq` |
| `GROQ_API_KEY` | your key from console.groq.com → API Keys |
| `GROQ_MODEL` | optional, default `llama-3.3-70b-versatile` (or `llama-3.1-8b-instant`, faster) |
| `AGENT_SERVICE_TOKEN` | a long random string (same value as on the API) |

**api** project
| Name | Value |
|---|---|
| `DATABASE_URL` | set by the Neon integration |
| `JWT_SECRET` | a long random string, 32+ characters |
| `AGENT_URL` | `https://agent-ashen-five.vercel.app` |
| `AGENT_SERVICE_TOKEN` | same value as on the agent |
| `AGENT_TIMEOUT_MS` | `25000` |
| `COOKIE_SECURE` | `true` |

**web** project: no variables.

Generate the two random strings with:
```bash
openssl rand -base64 48
```

## 3. Redeploy
Variables only apply to new deployments: redeploy **agent**, then **api**, then **web**. Production deployments build from the branch set in each project's Git settings (usually `main`).

## 4. Check
* `https://api-rouge-five-51.vercel.app/api/v1/health` → `{"db":true,"agent":{"reachable":true,"model_ready":true},"evaluation":"llm"}`
* `https://web-green-three-50.vercel.app/api/v1/health` → the same JSON (proves the rewrite)
* Open the web URL, create an account, and start Day 1.

## Serverless notes
* Agent chat memory (LangGraph `MemorySaver`) lives in one function instance, so free-conversation context can reset between messages. Exercise evaluation is stateless and unaffected.
* The rate limiter is per function instance, which is less strict than on a single server.
* The first request after idle has a cold start of a few seconds; the API waits up to `AGENT_TIMEOUT_MS`, then falls back to rule-based checking.
