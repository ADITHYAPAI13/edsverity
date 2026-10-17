-- EdsVerity: additive Supabase migration, based on the user's existing repository.
-- Run ONCE in the Supabase dashboard SQL Editor after backing up important data.
-- Re-running is designed to be safe: only EdsVerity-named policies/triggers are replaced.
-- Does not delete tables, accounts, or existing rows.
BEGIN;

-- The previously created tables are the starting point. Fail helpfully if missing.
DO $$ BEGIN
  IF to_regclass('public.profiles') IS NULL OR to_regclass('public.jobs') IS NULL OR to_regclass('public.projects') IS NULL THEN
    RAISE EXCEPTION 'Expected public.profiles, public.projects, public.jobs. Create the three base tables first.';
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_instructions text;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ev_profiles_own_select ON public.profiles;
CREATE POLICY ev_profiles_own_select ON public.profiles FOR SELECT TO authenticated USING(id=(select auth.uid()));
DROP POLICY IF EXISTS ev_profiles_own_insert ON public.profiles;
CREATE POLICY ev_profiles_own_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK(id=(select auth.uid()));
DROP POLICY IF EXISTS ev_profiles_own_update ON public.profiles;
CREATE POLICY ev_profiles_own_update ON public.profiles FOR UPDATE TO authenticated
USING(id=(select auth.uid())) WITH CHECK(id=(select auth.uid()));
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Member directory is opt-in. Existing own-profile SELECT policies remain in place.
DROP POLICY IF EXISTS ev_profiles_discoverable_read ON public.profiles;
CREATE POLICY ev_profiles_discoverable_read ON public.profiles FOR SELECT TO anon,authenticated
USING (discoverable IS TRUE);
-- Applicants explicitly sharing their profile by applying can be discovered by that job's owner.
DROP POLICY IF EXISTS ev_profiles_applicant_employer_read ON public.profiles;
-- This policy is added after job_applications exists below.

-- Public avatar bucket. The owner can upload only under their user-id/ prefix.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('avatars','avatars',true,2097152,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=true,file_size_limit=2097152,
 allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS ev_avatar_read ON storage.objects;
CREATE POLICY ev_avatar_read ON storage.objects FOR SELECT TO anon,authenticated
USING (bucket_id='avatars');
DROP POLICY IF EXISTS ev_avatar_insert ON storage.objects;
CREATE POLICY ev_avatar_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text);
DROP POLICY IF EXISTS ev_avatar_update ON storage.objects;
CREATE POLICY ev_avatar_update ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text)
WITH CHECK(bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text);
DROP POLICY IF EXISTS ev_avatar_delete ON storage.objects;
CREATE POLICY ev_avatar_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text);

-- If an earlier EdsVerity prototype migration was installed, retire its
-- older overlapping application policies before applying the stricter versions.
-- They belong only to this platform and are safe to replace.
-- Job applications: one per member per listing.
CREATE TABLE IF NOT EXISTS public.job_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
 applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 cover_note text NOT NULL CHECK (char_length(cover_note) BETWEEN 10 AND 2000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','shortlisted','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,applicant_id)
);
CREATE INDEX IF NOT EXISTS ev_job_apps_job_idx ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS ev_job_apps_applicant_idx ON public.job_applications(applicant_id);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS edsverity_applicant_or_owner_read ON public.job_applications;
DROP POLICY IF EXISTS edsverity_applicant_insert ON public.job_applications;
DROP POLICY IF EXISTS edsverity_employer_review ON public.job_applications;
DROP POLICY IF EXISTS ev_job_apps_read ON public.job_applications;
CREATE POLICY ev_job_apps_read ON public.job_applications FOR SELECT TO authenticated
USING (applicant_id=(select auth.uid()) OR EXISTS(
  SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by=(select auth.uid())
));
DROP POLICY IF EXISTS ev_job_apps_insert ON public.job_applications;
CREATE POLICY ev_job_apps_insert ON public.job_applications FOR INSERT TO authenticated
WITH CHECK (
 applicant_id=(select auth.uid()) AND status='submitted'
 AND EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by<>(select auth.uid()))
);
DROP POLICY IF EXISTS ev_job_apps_employer_update ON public.job_applications;
CREATE POLICY ev_job_apps_employer_update ON public.job_applications FOR UPDATE TO authenticated
USING (EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by=(select auth.uid())))
WITH CHECK (EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by=(select auth.uid())));

CREATE OR REPLACE FUNCTION public.ev_job_application_review_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.job_id IS DISTINCT FROM OLD.job_id
  OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
  OR NEW.cover_note IS DISTINCT FROM OLD.cover_note
  OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Only application status may be changed';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS edsverity_application_immutable ON public.job_applications;
DROP TRIGGER IF EXISTS ev_job_application_review_guard ON public.job_applications;
CREATE TRIGGER ev_job_application_review_guard BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.ev_job_application_review_guard();

-- Job owners can see the profile of people who explicitly applied to their listing.
CREATE POLICY ev_profiles_applicant_employer_read ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.job_applications a JOIN public.jobs j ON a.job_id=j.id
 WHERE a.applicant_id=profiles.id AND j.posted_by=(select auth.uid())));

-- Forum: live discussions and replies, not fictional content.
CREATE TABLE IF NOT EXISTS public.forum_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(char_length(title) BETWEEN 8 AND 180),
 body text NOT NULL CHECK(char_length(body) BETWEEN 10 AND 5000),
 category text NOT NULL DEFAULT 'General' CHECK(char_length(category) BETWEEN 2 AND 60),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.forum_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 thread_id uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(char_length(body) BETWEEN 2 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ev_forum_replies_thread_idx ON public.forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS ev_forum_threads_created_idx ON public.forum_threads(created_at DESC);
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ev_forum_threads_read ON public.forum_threads;
CREATE POLICY ev_forum_threads_read ON public.forum_threads FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS ev_forum_threads_insert ON public.forum_threads;
CREATE POLICY ev_forum_threads_insert ON public.forum_threads FOR INSERT TO authenticated
WITH CHECK(author_id=(select auth.uid()));
DROP POLICY IF EXISTS ev_forum_threads_delete ON public.forum_threads;
CREATE POLICY ev_forum_threads_delete ON public.forum_threads FOR DELETE TO authenticated
USING(author_id=(select auth.uid()));
DROP POLICY IF EXISTS ev_forum_replies_read ON public.forum_replies;
CREATE POLICY ev_forum_replies_read ON public.forum_replies FOR SELECT TO anon,authenticated USING (true);
DROP POLICY IF EXISTS ev_forum_replies_insert ON public.forum_replies;
CREATE POLICY ev_forum_replies_insert ON public.forum_replies FOR INSERT TO authenticated
WITH CHECK(author_id=(select auth.uid()));
DROP POLICY IF EXISTS ev_forum_replies_delete ON public.forum_replies;
CREATE POLICY ev_forum_replies_delete ON public.forum_replies FOR DELETE TO authenticated
USING(author_id=(select auth.uid()));
COMMIT;

-- Confirm in Table Editor: profiles, projects, jobs, job_applications, forum_threads, forum_replies.
-- Confirm in Storage: avatars.
-- Configure email redirects in Authentication > URL Configuration separately if needed.
