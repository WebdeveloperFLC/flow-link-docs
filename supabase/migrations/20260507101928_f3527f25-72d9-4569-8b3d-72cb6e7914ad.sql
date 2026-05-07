-- Countries
CREATE TABLE public.cf_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  is_pr_friendly BOOLEAN NOT NULL DEFAULT false,
  visa_success_rate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Universities
CREATE TABLE public.cf_universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  country_code TEXT NOT NULL REFERENCES public.cf_countries(code),
  city TEXT,
  province TEXT,
  logo_url TEXT,
  cover_url TEXT,
  ranking INTEGER,
  institution_type TEXT NOT NULL DEFAULT 'public', -- public | private
  is_partner BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cf_universities_country ON public.cf_universities(country_code);

-- Courses
CREATE TABLE public.cf_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.cf_universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  study_level TEXT NOT NULL, -- diploma|undergraduate|postgraduate|master|phd
  field_of_study TEXT NOT NULL,
  specialization TEXT,
  duration_months INTEGER,
  intake_months TEXT[] NOT NULL DEFAULT '{}',
  intake_year INTEGER,
  tuition_fee NUMERIC,
  currency TEXT,
  ielts_overall NUMERIC,
  ielts_no_band_less_than NUMERIC,
  pte_score NUMERIC,
  toefl_score NUMERIC,
  duolingo_accepted BOOLEAN NOT NULL DEFAULT false,
  moi_accepted BOOLEAN NOT NULL DEFAULT false,
  scholarship_available BOOLEAN NOT NULL DEFAULT false,
  coop_available BOOLEAN NOT NULL DEFAULT false,
  internship_included BOOLEAN NOT NULL DEFAULT false,
  pr_friendly BOOLEAN NOT NULL DEFAULT false,
  pgwp_eligible BOOLEAN NOT NULL DEFAULT false,
  stem_eligible BOOLEAN NOT NULL DEFAULT false,
  visa_success_indicator TEXT, -- low|medium|high
  mode TEXT NOT NULL DEFAULT 'full_time', -- full_time|part_time
  gpa_min NUMERIC,
  backlogs_allowed INTEGER,
  gap_accepted_years INTEGER,
  work_experience_required BOOLEAN NOT NULL DEFAULT false,
  applications_open BOOLEAN NOT NULL DEFAULT true,
  employability_score INTEGER,
  description TEXT,
  career_outcomes TEXT,
  scholarship_info TEXT,
  pr_visa_notes TEXT,
  apply_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cf_courses_university ON public.cf_courses(university_id);
CREATE INDEX idx_cf_courses_level ON public.cf_courses(study_level);
CREATE INDEX idx_cf_courses_field ON public.cf_courses(field_of_study);

-- Shortlists
CREATE TABLE public.cf_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.cf_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- Saved searches
CREATE TABLE public.cf_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for updated_at
CREATE TRIGGER cf_universities_touch BEFORE UPDATE ON public.cf_universities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER cf_courses_touch BEFORE UPDATE ON public.cf_courses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.cf_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_saved_searches ENABLE ROW LEVEL SECURITY;

-- Public read on catalog tables
CREATE POLICY "cf_countries public read" ON public.cf_countries FOR SELECT USING (true);
CREATE POLICY "cf_universities public read" ON public.cf_universities FOR SELECT USING (true);
CREATE POLICY "cf_courses public read" ON public.cf_courses FOR SELECT USING (true);

-- Admin-only writes on catalog
CREATE POLICY "cf_countries admin write" ON public.cf_countries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cf_universities admin write" ON public.cf_universities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cf_courses admin write" ON public.cf_courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User-owned shortlists / saved searches
CREATE POLICY "cf_shortlists own" ON public.cf_shortlists FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cf_saved_searches own" ON public.cf_saved_searches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());