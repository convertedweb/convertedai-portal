-- A lead_sources tábla a Meta űrlapok mellett weboldal-űrlapokat is tud tárolni.
-- A meta_form_name oszlop mindkét típusnál a megjelenített név; a meglévő sorok meta_form típusúak maradnak.
alter table lead_sources
  add column source_type text not null default 'meta_form'
    check (source_type in ('meta_form', 'website_form')),
  add column website_url text
    check (website_url is null or char_length(website_url) between 4 and 500);

alter table lead_sources
  alter column meta_form_id drop not null,
  alter column integration_connection_id drop not null;

alter table lead_sources
  add constraint lead_sources_source_type_fields_check check (
    (
      source_type = 'meta_form'
      and meta_form_id is not null
      and integration_connection_id is not null
      and website_url is null
    )
    or (
      source_type = 'website_form'
      and website_url is not null
      and meta_form_id is null
      and integration_connection_id is null
    )
  );

create unique index lead_sources_active_website_url_idx
  on lead_sources(project_id, website_url)
  where deleted_at is null and source_type = 'website_form';
