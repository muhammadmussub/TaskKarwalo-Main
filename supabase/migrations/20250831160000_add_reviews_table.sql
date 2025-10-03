-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security if not already enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for reviews if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Anyone can view reviews'
  ) THEN
    CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Customers can create reviews for their completed bookings'
  ) THEN
    CREATE POLICY "Customers can create reviews for their completed bookings" ON public.reviews 
    FOR INSERT WITH CHECK (
      auth.uid() = customer_id AND
      booking_id IN (
        SELECT id FROM public.bookings 
        WHERE customer_id = auth.uid() AND status = 'completed'
      )
    );
  END IF;
END $$;

-- Create index on provider_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id);

-- Create index on booking_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);

-- Update the handle_booking_completion function to properly calculate ratings
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
    
    -- Update provider's rating based on reviews (if any exist)
    UPDATE public.provider_profiles 
    SET rating = (
      SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2) 
      FROM public.reviews 
      WHERE provider_id = NEW.provider_id
    )
    WHERE user_id = NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;