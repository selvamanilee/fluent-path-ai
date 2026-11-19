# FluentPath AI: complete free-tier setup (Vercel + Neon + Groq)

Total cost: **₹0 / $0**. Everything below uses free plans:

| Service | Used for | Free plan |
|---|---|---|
| **Vercel** Hobby | hosting web, api, agent | free for personal projects |
| **Neon** (through Vercel Storage) | PostgreSQL database | 0.5 GB storage, auto-suspend, no card |
| **Groq** | AI model for the tutor | free API key with rate limits, no card |

Your three Vercel projects (already created from this repo):

| Project | Root Directory | URL |
|---|---|---|
| web | `apps/web` | https://web-green-three-50.vercel.app |
| api | `apps/api` | https://api-rouge-five-51.vercel.app |
| agent | `services/agent` | https://agent-ashen-five.vercel.app |

> **Why sign-up fails right now:** the api and agent projects have **no environment variables at all**. You can check at any time by opening
> https://web-green-three-50.vercel.app/api/v1/health. Everything under `config` must be `true` and `missing` must be empty.

---

## Step 1: Create the free database (Neon) and connect it to **api** (about 3 minutes)

1. Open https://vercel.com/dashboard and sign in.
2. Open the **api** project (not web, not agent).
3. Tap the **Storage** tab, then **Create Database** (or **Connect Database**, then **Create New**).
4. Choose **Neon (Serverless Postgres)**, then **Continue**.
5. Region: **Singapore (aws-ap-southeast-1)**, the closest to India. Plan: **Free**. Name: `fluentpath`. Tap **Create**.
6. On **Connect Project**, choose project **api**, tick **Development, Preview and Production**, and **leave the "Custom Prefix" empty**. Tap **Connect**.

Vercel now adds `DATABASE_URL` (and a few `POSTGRES_*` / `PG*` variables) to the api project for you. Don't change them.

---

## Step 2: Get a free Groq API key (about 2 minutes)

1. Open https://console.groq.com and sign in with Google or GitHub.
2. Go to **API Keys**, then **Create API Key**, and name it `fluentpath`.
3. **Copy the key now** (it starts with `gsk_`). It's shown only once. Keep it private and paste it only into Vercel (Step 4).

---

## Step 3: Create two secret values

You need two long random strings:
- **Secret A** → `JWT_SECRET` (signs login sessions)
- **Secret B** → `AGENT_SERVICE_TOKEN` (lets only your API call your agent)

Get each one with **any** of these:
- On a computer: `openssl rand -base64 48`
- In a browser: open https://generate-secret.vercel.app/48 (refresh for a second one)
- A password manager's generator, set to 48+ characters

Keep them private: don't post them in chats or commit them to GitHub.

---

## Step 4: Add the environment variables

For every variable below: project → **Settings** → **Environment Variables** → enter **Key** and **Value**, tick **Production, Preview and Development**, then **Save**.

### agent project
| Key | Value |
|---|---|
| `MODEL_PROVIDER` | `groq` |
| `GROQ_API_KEY` | your `gsk_...` key from Step 2 |
| `AGENT_SERVICE_TOKEN` | **Secret B** |

### api project (`DATABASE_URL` is already there from Step 1)
| Key | Value |
|---|---|
| `JWT_SECRET` | **Secret A** |
| `AGENT_URL` | `https://agent-ashen-five.vercel.app` |
| `AGENT_SERVICE_TOKEN` | **Secret B** (exactly the same as on agent) |
| `AGENT_TIMEOUT_MS` | `25000` |
| `COOKIE_SECURE` | `true` |

### web project
Nothing to add.

---

## Step 5: Redeploy (variables only apply to new deployments)

In this order, **agent** first and then **api**:
1. Open the project, go to the **Deployments** tab, open the top (latest) **Production** deployment.
2. Tap **⋯**, then **Redeploy**, then **Redeploy** again.
3. Wait for **Ready** (about 1–2 minutes).

The api redeploy also creates all database tables and loads the Day 1 content automatically. Its build log shows `applied 001_init.sql` and `seeded: 28 categories, 177 words …`.

---

## Step 6: Check that everything works

Open https://web-green-three-50.vercel.app/api/v1/health. You should see:

```json
{"data":{"db":true,"missing":[],
  "agent":{"reachable":true,"provider":"openai-compatible","model_ready":true},
  "evaluation":"llm",
  "config":{"databaseUrl":true,"jwtSecret":true,"agentUrl":true,"agentToken":true,"cookieSecure":true}}}
```

Then open https://web-green-three-50.vercel.app, tap **Start learning**, create an account and start Day 1.

---

## Troubleshooting (read the health page)

| What the health page shows | Cause | Fix |
|---|---|---|
| `"databaseUrl": false` | Neon not connected to **api**, or connected with a custom prefix | Step 1 (connect to the **api** project, empty prefix), then redeploy api |
| `"jwtSecret": false` | `JWT_SECRET` missing or shorter than 32 characters | Step 3 + 4, then redeploy api |
| `"db": false` with `"dbError": "3D000"` or `"28P01"` | wrong database name / password in `DATABASE_URL` | Reconnect Neon in Storage; redeploy api |
| `"db": true` but sign-up says *relation "users" does not exist* | tables weren't created (build ran before the database was connected) | Redeploy api once more |
| `"agentUrl": false` / `"agentToken": false` | missing on **api** | Step 4, redeploy api |
| `"agent": {"reachable": false}` but agentUrl/agentToken are true | agent still asleep, or the agent wasn't redeployed | Open https://agent-ashen-five.vercel.app/health once, then reload the api health page |
| agent `/health` shows `"provider":"ollama"` | `MODEL_PROVIDER` not set on **agent** | Step 4 (agent), redeploy agent |
| agent `/health` shows `"service_token_set": false` | `AGENT_SERVICE_TOKEN` not set on **agent** | Step 4 (agent), redeploy agent |
| `"model_ready": true` but `"evaluation": "rules"` | tokens differ between api and agent | Make `AGENT_SERVICE_TOKEN` identical on both, redeploy both |
| Sign-up shows *"The server isn't set up yet (missing: …)"* | exactly the settings listed are missing | Add them, redeploy api |

Free-tier notes: Neon pauses the database after ~5 idle minutes and the first request afterwards takes about 1 s to wake it. Groq's free tier has per-minute limits; when it's exceeded, the app falls back to rule-based feedback, labelled as such.
