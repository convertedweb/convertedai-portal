-- Feladat projekt nélkül is létrehozható; az ügyfél (organization_id) továbbra is kötelező.
-- A (project_id, organization_id) összetett idegen kulcs NULL project_id esetén nem ellenőrződik (MATCH SIMPLE).
alter table public.tasks alter column project_id drop not null;
