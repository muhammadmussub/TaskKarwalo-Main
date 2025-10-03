-- Create payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_details TEXT NOT NULL,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_payment_methods_timestamp();

-- Set up RLS policies for the payment_methods table
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Everyone can read payment methods
CREATE POLICY "Everyone can read payment methods"
ON public.payment_methods FOR SELECT
USING (true);

-- Only admins can modify payment methods
CREATE POLICY "Only admins can modify payment methods"
ON public.payment_methods FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND user_type = 'admin'
  )
);

-- Insert initial payment methods if none exist
INSERT INTO public.payment_methods (method_name, display_name, account_details, instructions)
SELECT 'easypaisa', 'Easypaisa', 'Account Title: TaskKarwalo Services\nPhone: 0300-1234567', 'Send payment to the Easypaisa account and upload screenshot as proof.'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE method_name = 'easypaisa');

INSERT INTO public.payment_methods (method_name, display_name, account_details, instructions)
SELECT 'jazzcash', 'JazzCash', 'Account Title: TaskKarwalo Services\nPhone: 0300-7654321', 'Send payment to the JazzCash account and upload screenshot as proof.'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE method_name = 'jazzcash');

INSERT INTO public.payment_methods (method_name, display_name, account_details, instructions)
SELECT 'bank_transfer', 'Bank Transfer', 'Bank: HBL\nAccount Title: TaskKarwalo Services\nAccount Number: 12345678901\nIBAN: PK36HABB0012345678901', 'Transfer the amount to our bank account and upload the receipt as proof.'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE method_name = 'bank_transfer');