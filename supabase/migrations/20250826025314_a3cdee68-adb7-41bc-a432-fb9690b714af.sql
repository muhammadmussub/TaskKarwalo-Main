-- Add is_banned column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;

-- Add RLS policies to prevent banned users from accessing data
CREATE POLICY "Banned users cannot access services" 
ON public.services 
FOR ALL 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN TRUE
    ELSE NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_banned = TRUE
    )
  END
);

CREATE POLICY "Banned users cannot access bookings" 
ON public.bookings 
FOR ALL 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN TRUE
    ELSE NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_banned = TRUE
    )
  END
);

-- Create function to check ban status
CREATE OR REPLACE FUNCTION public.check_user_ban_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is banned before allowing operations
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_banned = TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied: User account is banned';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers to check ban status on important operations
CREATE TRIGGER check_ban_on_service_operations
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_ban_status();

CREATE TRIGGER check_ban_on_booking_operations
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_ban_status();