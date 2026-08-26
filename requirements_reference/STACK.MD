Storefront path (unchanged)
Next.js (frontend + API routes) → Odoo JSON-RPC
Handles browsing, cart, checkout — real-time, transactional, low-volume-per-request.

Analytics path (new)
Odoo/Postgres → data pipeline → Python analytics service → your AI layer
This runs separately from the live storefront.

Why separate them:

Don't pull analytics data through RPC. For bulk historical data (orders, customer behavior, product trends), read from Odoo's underlying Postgres database directly (read-replica if self-hosted) or sync to a separate analytics store. RPC call-by-call is far too slow for training or aggregation.
Python is where AI lives. Use a FastAPI service for the analytics/AI layer — pandas/Polars for data work, and whatever model layer you need (scikit-learn, or API calls to an LLM for things like demand forecasting, review summarization, recommendations). Next.js calls this service when it needs insights to display.
Keep live and analytical loads apart. Real-time checkout traffic and batch analytics have opposite performance profiles. Mixing them means one starves the other.

Revised minimal stack

Next.js + TypeScript + Tailwind — storefront
Next.js API routes → Odoo JSON-RPC — transactional data
FastAPI (Python) → reads Odoo Postgres (or a synced copy) — analytics + AI
Redis — cache for both hot product data and computed analytics results

Data flow

Live: Browser → Next.js API → Odoo RPC
Analytics: Odoo Postgres → (sync/ETL) → analytics store → FastAPI + AI → Next.js displays it

Growth order:

Start: Next.js → Odoo RPC (storefront working first)
Add FastAPI analytics service reading Odoo Postgres directly
When data grows, add a proper analytics store (Postgres warehouse, DuckDB, or ClickHouse) fed by scheduled ETL so you never touch the production DB
Add a queue (Celery/RQ) for scheduled model runs and heavy jobs