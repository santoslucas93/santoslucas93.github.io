-- Não inferir adesão histórica a VR/VA sem uma fonte mensal persistida.
update public.rh_colaboradores set opta_vr_va = false;
