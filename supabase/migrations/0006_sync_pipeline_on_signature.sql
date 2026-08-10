-- Keep the pipeline in step with the documents, whoever signs them.
--
-- `sign_document` already advances the prospect for agreements this platform
-- raised. It cannot do anything about the ones the contract platform raises and
-- signs on its own — and those are the majority. Three people were found sitting
-- at "Discovery scheduled" with executed agreements against their names, which
-- is how the Contracts page came to report "Signed 0" beside three signed rows.
--
-- A trigger on the document is the only place that catches both. Whichever
-- application writes the signature, the pipeline hears about it.

create or replace function sync_prospect_on_sign() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- Only on the transition into a terminal state, so re-saving a signed
  -- document does not keep rewriting the prospect.
  if new.status = 'signed' and (tg_op = 'INSERT' or old.status is distinct from 'signed') then
    update prospects p
       set stage       = 'signed',
           signed_on   = coalesce(p.signed_on, new.signed_at::date, current_date),
           document_id = coalesce(p.document_id, new.id)
     -- Their own office's agreement, never another's: matching on email alone
     -- would mark someone signed off a contract from an office they never came
     -- through, which is precisely what R3 forbids.
     where lower(p.email) = lower(new.recipient_email)
       and p.owner_id = new.owner_id
       and p.stage <> 'signed';

  elsif new.status = 'declined' and (tg_op = 'INSERT' or old.status is distinct from 'declined') then
    -- A decline is the case a person should handle, so it goes to the owner
    -- rather than staying in an automated sequence (R4).
    update prospects p
       set stage = 'followup'
     where lower(p.email) = lower(new.recipient_email)
       and p.owner_id = new.owner_id
       and p.stage not in ('signed', 'orientation', 'onboarded');
  end if;

  return new;
end $$;

drop trigger if exists documents_sync_prospect on documents;
create trigger documents_sync_prospect
  after insert or update on documents
  for each row execute function sync_prospect_on_sign();
