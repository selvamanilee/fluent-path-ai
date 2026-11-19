-- Distinguish "rotated" from "revoked by logout/theft" so a just-rotated token can be
-- reused briefly (navigation interrupted the refresh response; two tabs refreshing at once).
ALTER TABLE refresh_tokens ADD COLUMN rotated_at timestamptz;
