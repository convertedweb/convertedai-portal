-- Fiókonként {"email": "...", "secretUrl": "https://onetimesecret.com/..."}; a kulcsokat az alkalmazás validálja.
-- Írás csak szerveroldali admin klienssel (a projects táblán a tábla-szintű jogok miatt az RLS véd, lásd HANDOFF).
alter table projects
  add column onboarding_account_details jsonb not null default '{}'::jsonb;
