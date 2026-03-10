-- Create OTP Codes table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secure it (Admin only via Service Role, public shouldn't read)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies for public/authenticated roles means only Service Role can access.
