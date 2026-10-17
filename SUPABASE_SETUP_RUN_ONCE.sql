-- EdsVerity core upgrade, run once in Supabase SQL Editor.
-- Supabase Authentication owns credentials. Never create a public password table.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS application_instructions text;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('avatars','avatars',true,2097152,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Avatar images are public; uploads/edits limited to account owner.
CREATE POLICY "edsverity_avatars_public_read" ON storage.objects FOR SELECT TO public
USING (bucket_id='avatars');
CREATE POLICY "edsverity_avatars_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text);
CREATE POLICY "edsverity_avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text)
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(select auth.uid())::text);

CREATE TABLE IF NOT EXISTS public.job_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
 applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 cover_note text NOT NULL CHECK (length(cover_note) BETWEEN 10 AND 2000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','reviewing','shortlisted','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,applicant_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS job_applications_job_idx ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS job_applications_applicant_idx ON public.job_applications(applicant_id);
CREATE POLICY "edsverity_applicant_or_owner_read" ON public.job_applications FOR SELECT TO authenticated
USING (applicant_id=(select auth.uid()) OR EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by=(select auth.uid())));
CREATE POLICY "edsverity_applicant_insert" ON public.job_applications FOR INSERT TO authenticated
WITH CHECK (applicant_id=(select auth.uid()) AND EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by<>(select auth.uid())));
-- Prevent listing owners from changing the applicant, job, or application text after submission.
CREATE OR REPLACE FUNCTION public.edsverity_application_status_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.job_id IS DISTINCT FROM OLD.job_id
    OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
    OR NEW.cover_note IS DISTINCT FROM OLD.cover_note
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
  RAISE EXCEPTION 'Only application status can be updated';
 END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER edsverity_application_immutable
BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.edsverity_application_status_only();

CREATE POLICY "edsverity_employer_review" ON public.job_applications FOR UPDATE TO authenticated
USING (EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by=(select auth.uid())))
WITH CHECK (EXISTS(SELECT 1 FROM public.jobs j WHERE j.id=job_id AND j.posted_by=(select auth.uid())));
