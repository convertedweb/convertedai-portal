-- null = alapértelmezett fiókok; a kulcsokat az alkalmazás katalógusa (lib/onboarding-accounts.ts) validálja.
-- Írás csak szerveroldali admin klienssel: authenticated nem kap UPDATE jogot ezekre az oszlopokra.
alter table projects
  add column onboarding_accounts text[],
  add column onboarding_accounts_done text[] not null default '{}';

grant select (onboarding_accounts, onboarding_accounts_done) on projects to authenticated;
