# Deployment

* **Compose (local / single VM):** `JWT_SECRET=... AGENT_SERVICE_TOKEN=... docker compose up --build`. The API container runs migrations and the idempotent seed on start. *These Dockerfiles have not yet been built in CI; the dev environment had no Docker daemon.*
* **TLS / reverse proxy:** serve web + `/api` from the same origin (the refresh cookie is `SameSite=Strict`, `Path=/api/v1/auth`). Set `COOKIE_SECURE=true` behind HTTPS.
* **Scaling the API:** the rate limiter is in-memory, so with more than one instance, move it to Redis. The agent's chat memory uses LangGraph `MemorySaver`; for multiple replicas switch to a Postgres checkpointer.
* **Secrets:** `JWT_SECRET` (≥32 chars), `AGENT_SERVICE_TOKEN`, optional `OPENAI_API_KEY`, all from a secret store. Nothing secret ships to the browser.
* **Rate limits:** `RATE_LIMIT_AUTH` (default 10/min/IP for login & register), `RATE_LIMIT_AI` (30/min/user), `RATE_LIMIT_DEFAULT` (120/min; unauthenticated calls like `/auth/refresh` are keyed by IP, so raise it if many learners share one office NAT IP).
* **Refresh tokens** rotate on every use. A just-rotated token is accepted again for 30 s (interrupted responses, two tabs); later reuse revokes all of that user's sessions.
* **Backups:** `pg_dump` daily. Learner data is deleted by cascade when an account is deleted.
