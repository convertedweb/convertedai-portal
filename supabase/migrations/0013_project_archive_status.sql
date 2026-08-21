alter table projects
  drop constraint if exists projects_status_check;

alter table projects
  add constraint projects_status_check
  check (status in ('draft', 'building', 'live', 'paused', 'archived'));

revoke update (status, deleted_at) on projects from authenticated;
