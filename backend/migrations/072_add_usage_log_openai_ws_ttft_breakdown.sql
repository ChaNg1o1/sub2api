-- Persist OpenAI WS TTFT breakdown metadata for request-level diagnostics.
ALTER TABLE IF EXISTS usage_logs
    ADD COLUMN IF NOT EXISTS openai_ws_queue_wait_ms INT,
    ADD COLUMN IF NOT EXISTS openai_ws_conn_pick_ms INT,
    ADD COLUMN IF NOT EXISTS openai_ws_conn_reused BOOLEAN;
