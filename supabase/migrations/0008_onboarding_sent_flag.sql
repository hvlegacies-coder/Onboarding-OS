-- Track the manual "Send onboarding message" button per document.
--
-- Without a stored flag, the Messages page could only remember who staff had
-- already messaged for the length of one browser tab -- a reload, or a second
-- admin opening the same page, would show everyone as unsent and invite a
-- duplicate message. `documents_rw` (0001) already gives `authenticated` full
-- read/write on this table, so the app can set this directly.

alter table documents add column if not exists onboarding_sent_at timestamptz;
