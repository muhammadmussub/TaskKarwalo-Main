-- Add rejection_reason column to services table
-- This allows admins to provide feedback when rejecting services

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_services_rejection_reason ON public.services(rejection_reason);
CREATE INDEX IF NOT EXISTS idx_services_rejected_at ON public.services(rejected_at);

-- Update the services_updated_at trigger to include the new columns
DROP TRIGGER IF EXISTS services_updated_at ON public.services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();