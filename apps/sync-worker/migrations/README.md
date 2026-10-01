# D1 migrations

SQL files applied in order by `wrangler d1 migrations apply`, which the dev
deploy runs against `wordfarer-dev` BEFORE it deploys the Worker, so new code
never meets an old schema. Name each one `NNNN_what_it_does.sql`
(`wrangler d1 migrations create wordfarer-dev <what_it_does>` does this).
The first arrives with the data model in M4 (spec §6.7).
