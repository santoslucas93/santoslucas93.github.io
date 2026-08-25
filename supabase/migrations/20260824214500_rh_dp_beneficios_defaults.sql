-- Cadastros históricos sem correspondência não podem ser tratados como optantes.
alter table public.rh_colaboradores alter column opta_vr_va set default false;
alter table public.rh_colaboradores alter column opta_seguro_vida set default false;

update public.rh_colaboradores
set opta_vale_transporte = false,
    opta_vr_va = false,
    opta_plano_saude = false,
    opta_seguro_vida = false
where beneficios_sincronizados_em is null;
