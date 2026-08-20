-- RH & Folha — fluxo de fechamento da competencia
-- Normaliza os estados legados e protege competencias fechadas contra sobrescrita.

begin;

alter table public.rh_competencias drop constraint if exists rh_competencias_status_check;
update public.rh_competencias set status='importado' where status='processado';
update public.rh_competencias set status='fechado' where status='arquivado';
alter table public.rh_competencias add constraint rh_competencias_status_check
  check (status in ('rascunho','processado','importado','conferido','conciliado','fechado','arquivado'));

create or replace function public.rh_competencia_status_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.status = 'fechado' then
    raise exception 'Competencia fechada. Reabra a competencia antes de altera-la.' using errcode = '55000';
  end if;
  if tg_op <> 'DELETE' then
    if new.status = 'processado' then new.status := 'importado'; end if;
    if new.status = 'arquivado' then new.status := 'fechado'; end if;
    new.atualizado_em := now();
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_rh_competencia_status_guard on public.rh_competencias;
create trigger trg_rh_competencia_status_guard
before insert or update or delete on public.rh_competencias
for each row execute function public.rh_competencia_status_guard();

create or replace function public.rh_atualizar_status_competencia(p_competencia_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_atual text;
  v_novo text := lower(trim(coalesce(p_status,'')));
  v_permitido boolean := false;
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para alterar o status da competencia.' using errcode = '42501';
  end if;
  if v_novo not in ('importado','conferido','conciliado','fechado') then
    raise exception 'Status de competencia invalido.' using errcode = '22023';
  end if;

  select case status when 'processado' then 'importado' when 'arquivado' then 'fechado' else status end
    into v_atual
  from public.rh_competencias
  where id = p_competencia_id
  for update;

  if v_atual is null then
    raise exception 'Competencia nao encontrada.' using errcode = 'P0002';
  end if;

  if v_atual = v_novo then return v_atual; end if;
  v_permitido := (v_atual='importado' and v_novo='conferido')
             or (v_atual='conferido' and v_novo='conciliado')
             or (v_atual='conciliado' and v_novo='fechado');
  if not v_permitido then
    raise exception 'Transicao de status nao permitida: % -> %.', v_atual, v_novo using errcode = '22023';
  end if;

  update public.rh_competencias set status=v_novo where id=p_competencia_id;
  insert into public.rh_auditoria(evento,entidade,entidade_id,detalhes,usuario_id)
  values('status_competencia_alterado','rh_competencias',p_competencia_id::text,
         jsonb_build_object('de',v_atual,'para',v_novo),v_uid);
  return v_novo;
end;
$$;

revoke all on function public.rh_atualizar_status_competencia(uuid,text) from public, anon;
grant execute on function public.rh_atualizar_status_competencia(uuid,text) to authenticated;

commit;
