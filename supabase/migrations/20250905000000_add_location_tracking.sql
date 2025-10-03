-- Add location tracking fields to bookings table
ALTER TABLE bookings 
ADD COLUMN customer_location_lat DOUBLE PRECISION,
ADD COLUMN customer_location_lng DOUBLE PRECISION,
ADD COLUMN customer_location_shared_at TIMESTAMPTZ,
ADD COLUMN location_access_expires_at TIMESTAMPTZ,
ADD COLUMN location_access_active BOOLEAN DEFAULT FALSE;

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS bookings_location_idx ON bookings (customer_location_lat, customer_location_lng);

-- Create function to auto-expire location access after 2 hours
CREATE OR REPLACE FUNCTION set_location_expiry() RETURNS TRIGGER AS $$
BEGIN
  NEW.location_access_expires_at := NEW.customer_location_shared_at + INTERVAL '2 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set expiry time when location is shared
CREATE TRIGGER set_location_expiry_trigger
BEFORE INSERT OR UPDATE OF customer_location_shared_at ON bookings
FOR EACH ROW
WHEN (NEW.customer_location_shared_at IS NOT NULL)
EXECUTE FUNCTION set_location_expiry();

-- Create RLS policy to ensure only assigned provider can view location data
CREATE POLICY "Providers can only view location for their bookings" ON bookings
FOR SELECT
USING (auth.uid() = provider_id AND location_access_active = TRUE AND (location_access_expires_at > now() OR status = 'confirmed'));

-- Comment to help understand this migration
COMMENT ON TABLE bookings IS 'Stores booking information including location data with automatic 2-hour expiry';