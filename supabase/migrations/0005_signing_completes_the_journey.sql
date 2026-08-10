-- Signing, from the prospect's own browser.
--
-- Two gaps close here.
--
-- 1. Declining had nowhere to go. The app offers "I'm not moving forward" and
--    asks why, but `documents` has no column for the reason and an anonymous
--    signer has no table access — so the answer went into localStorage and
--    nobody ever saw it.
--
-- 2. Signing did not move the person. The app updated `prospects` from the
--    browser, which works for a signed-in admin and never for the signer: RLS
--    on `prospects` requires an authenticated identity, so the update was
--    rejected and the pipeline sat at "contract sent" forever. It belongs
--    server-side, in the same statement that records the signature.
--
-- Both go through SECURITY DEFINER functions keyed by the document token, the
-- same capability pattern as `get_document` — the token is what the caller
-- already holds, and it identifies exactly one row.

alter table documents add column if not exists decline_reason text;

-- Recording a signature also completes the journey: the prospect linked to this
-- document moves to `signed` and is dated today. `signed_on` is the one stamp
-- the pipeline puts on a record (R5), so it is written here rather than left to
-- whichever client happened to be watching.
create or replace function sign_document(p_token uuid, p_signature text, p_form jsonb)
  returns setof documents
  language plpgsql volatile security definer set search_path = public as $$
declare v_doc documents;
begin
  update documents
     set status = 'signed', signature = p_signature,
         form_data = coalesce(p_form, form_data), signed_at = now(),
         reminders_stopped = true, updated_at = now()
   where token = p_token and status <> 'signed'
  returning * into v_doc;

  if v_doc.id is null then
    -- Already signed, or no such token. Hand back whatever the token points at
    -- so the page can show the executed copy rather than an error.
    return query select * from documents where token = p_token;
    return;
  end if;

  update prospects
     set stage = 'signed', signed_on = coalesce(signed_on, current_date)
   where document_id = v_doc.id;

  return next v_doc;
end $$;

-- Declining stops the chase too — nothing should keep nudging someone who has
-- said no. The prospect is moved to owner follow-up rather than left in the
-- reminder sequence: a decline is exactly the case a person should handle (R4).
create or replace function decline_document(p_token uuid, p_reason text)
  returns setof documents
  language plpgsql volatile security definer set search_path = public as $$
declare v_doc documents;
begin
  update documents
     set status = 'declined', decline_reason = p_reason,
         reminders_stopped = true, updated_at = now()
   where token = p_token and status <> 'signed'
  returning * into v_doc;

  if v_doc.id is null then
    return query select * from documents where token = p_token;
    return;
  end if;

  update prospects set stage = 'followup' where document_id = v_doc.id;

  return next v_doc;
end $$;

grant execute on function sign_document(uuid,text,jsonb)  to anon, authenticated;
grant execute on function decline_document(uuid,text)     to anon, authenticated;
