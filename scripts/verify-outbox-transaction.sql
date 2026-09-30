\set ON_ERROR_STOP on
create temp table outbox_atomicity_probe_state(
  id uuid primary key,
  marker text not null
);

create or replace function pg_temp.bootstrap_outbox_atomicity_probe(
  p_state_id uuid,
  p_event_id uuid,
  p_force_failure boolean
) returns void
language plpgsql
as $$
begin
  insert into outbox_atomicity_probe_state(id,marker)
  values (p_state_id,'state-written');

  insert into private.outbox_messages(
    event_id,event_type,event_version,aggregate_id,occurred_at,source,
    owner_user_id,correlation_id,idempotency_key,payload
  ) values (
    p_event_id,'BootstrapAtomicityProbe',1,p_state_id,now(),'bootstrap-verification',
    null,null,'bootstrap-atomicity:'||p_event_id::text,
    jsonb_build_object('state_id',p_state_id::text)
  );

  if p_force_failure then
    raise exception 'forced outbox atomicity rollback';
  end if;
end;
$$;

begin;
select pg_temp.bootstrap_outbox_atomicity_probe(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  false
);
commit;

do $$
begin
  if (select count(*) from outbox_atomicity_probe_state where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 1 then
    raise exception 'commit test failed: state row missing';
  end if;
  if (select count(*) from private.outbox_messages where event_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') <> 1 then
    raise exception 'commit test failed: outbox row missing';
  end if;
end;
$$;

begin;
select pg_temp.bootstrap_outbox_atomicity_probe(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  true
);
\set ON_ERROR_STOP on
rollback;

do $$
begin
  if (select count(*) from outbox_atomicity_probe_state where id='cccccccc-cccc-cccc-cccc-cccccccccccc') <> 0 then
    raise exception 'rollback test failed: state row survived';
  end if;
  if (select count(*) from private.outbox_messages where event_id='dddddddd-dddd-dddd-dddd-dddddddddddd') <> 0 then
    raise exception 'rollback test failed: outbox row survived';
  end if;
end;
$$;

select 'OUTBOX_TRANSACTION_VERIFICATION=PASS' as verification,
       (select count(*) from outbox_atomicity_probe_state where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as commit_state_count,
       (select count(*) from private.outbox_messages where event_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') as commit_outbox_count,
       (select count(*) from outbox_atomicity_probe_state where id='cccccccc-cccc-cccc-cccc-cccccccccccc') as rollback_state_count,
       (select count(*) from private.outbox_messages where event_id='dddddddd-dddd-dddd-dddd-dddddddddddd') as rollback_outbox_count;
