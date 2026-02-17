-- Create roles and grants for Supabase services
-- This script should be mounted at /docker-entrypoint-initdb.d/init-scripts/99-roles.sql in the db container

-- Authenticator role (used by PostgREST)
create role authenticator noinherit login password 'postgres';
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

grant anon to authenticator;
grant authenticated to authenticator;
grant service_role to authenticator;

grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

alter default privileges in schema public grant all on tables to postgres;
alter default privileges in schema public grant all on functions to postgres;
alter default privileges in schema public grant all on sequences to postgres;

alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant select on tables to service_role;

-- Supabase Admin (used by Realtime, Storage, etc)
create role supabase_admin login password 'postgres';
grant all privileges on database postgres to supabase_admin;
alter role supabase_admin with superuser;

-- Auth Admin (used by GoTrue)
create role supabase_auth_admin login password 'postgres' noinherit;
grant all privileges on schema auth to supabase_auth_admin;
grant all privileges on schema public to supabase_auth_admin;

-- Storage Admin (used by Storage)
create role supabase_storage_admin login password 'postgres' noinherit;
grant all privileges on schema storage to supabase_storage_admin;
