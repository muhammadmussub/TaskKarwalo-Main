-- Create commission payments view with related information
CREATE OR REPLACE VIEW public.commission_payments_view AS
SELECT
  cp.id,
  cp.provider_id,
  cp.amount,
  cp.payment_method,
  cp.screenshot_url,
  cp.booking_count,
  cp.status,
  cp.rejection_reason,
  cp.submitted_at,
  cp.reviewed_at,
  cp.reviewed_by,
  p.full_name AS provider_name,
  p.email AS provider_email,
  pp.business_name AS provider_business,
  rev.full_name AS reviewer_name
FROM
  public.commission_payments cp
LEFT JOIN
  public.profiles p ON cp.provider_id = p.user_id
LEFT JOIN
  public.provider_profiles pp ON cp.provider_id = pp.user_id
LEFT JOIN
  public.profiles rev ON cp.reviewed_by = rev.user_id;

-- Set up RLS policies for the view
COMMENT ON VIEW public.commission_payments_view IS 'View for commission payments with related information';

-- Add policy to allow providers to see only their own payments
CREATE POLICY "Providers can see their own commission payments in view"
ON public.commission_payments_view FOR SELECT
USING (auth.uid() = provider_id);

-- Add policy to allow admins to see all payments
CREATE POLICY "Admins can see all commission payments in view"
ON public.commission_payments_view FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'admin'
  )
);