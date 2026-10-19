-- Onboarding számválasztás: meglévő szám átirányítása ('existing'), új országos 06 21-es ('hu_21'), új körzetes szám ('local').
-- A korábbi 'local_company' / 'local_private' értékek érvényesek maradnak (régi projektek).
alter table projects drop constraint if exists projects_phone_request_type_check;
alter table projects
  add constraint projects_phone_request_type_check
  check (phone_request_type in ('hu_21', 'local_company', 'local_private', 'existing', 'local'));

-- A számot igénylő típusa: dönti el, melyik azonosító dokumentum kell. Írás csak szerveroldali admin klienssel.
alter table projects
  add column phone_owner_type text
  check (phone_owner_type in ('company', 'sole_trader', 'private'));
