-- Fix security warnings by setting search_path for functions

-- Update handle_updated_at function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_new_user function with proper search_path  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_booking_completion function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_booking_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'completed' and final_price is set
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.final_price IS NOT NULL THEN
    -- Calculate 10% commission
    NEW.commission_amount = NEW.final_price * 0.10;
    
    -- Update provider's total earnings and commission
    UPDATE public.provider_profiles 
    SET 
      total_earnings = total_earnings + (NEW.final_price - NEW.commission_amount),
      total_commission = total_commission + NEW.commission_amount,
      total_jobs = total_jobs + 1
    WHERE user_id = NEW.provider_id;
    
    -- Update provider's rating (simplified - could be more complex)
    UPDATE public.provider_profiles 
    SET rating = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM public.reviews 
      WHERE provider_id = NEW.provider_id
    )
    WHERE user_id = NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;