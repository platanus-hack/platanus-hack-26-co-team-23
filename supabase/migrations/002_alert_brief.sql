-- Notice content (what changed, why it affects you, what happens if you do nothing, steps).
-- Generated once per alert so every channel and the PDF guide say the same thing.
alter table alerts add column if not exists brief jsonb;
