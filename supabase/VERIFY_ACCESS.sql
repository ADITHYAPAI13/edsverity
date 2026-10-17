-- Read-only inventory. Run in the existing Supabase project's SQL Editor.
-- No rows, policies, grants, storage settings or provider settings are changed.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('profiles','projects','jobs','job_applications','forum_threads','forum_replies');

SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
FROM pg_policies
WHERE (schemaname='public' AND tablename IN
 ('profiles','projects','jobs','job_applications','forum_threads','forum_replies'))
 OR (schemaname='storage' AND tablename='objects')
ORDER BY schemaname,tablename,policyname;

SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN
 ('profiles','projects','jobs','job_applications','forum_threads','forum_replies')
ORDER BY table_name,ordinal_position;

SELECT table_name,grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='public' AND grantee IN ('anon','authenticated')
ORDER BY table_name,grantee,privilege_type;

SELECT c.conrelid::regclass AS table_name,c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c WHERE c.conrelid=to_regclass('public.job_applications');
SELECT t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.job_applications') AND NOT t.tgisinternal;
SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='avatars';
-- Review each policy and grant, including non-ev_* names, before proposing changes.
-- Metadata alone does not prove isolation: also execute the A/B/C/anonymous checks
-- described in docs/TECHNICAL_AUDIT.md using authorized test accounts.
