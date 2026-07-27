begin;

-- A match record is reused when two people match again. Apologies are limited
-- to once per ending by the API, rather than once for the lifetime of that
-- reusable record.
alter table match_apology_notes
  drop constraint if exists match_apology_notes_match_id_sender_id_key;

commit;
