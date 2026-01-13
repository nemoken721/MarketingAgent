-- Add is_admin column to users table for admin privileges
-- Admins get unlimited credits (credit check bypassed)

-- Add is_admin column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = true;

-- Comment for documentation
COMMENT ON COLUMN public.users.is_admin IS 'Admin flag - admins bypass credit checks for unlimited Ma-Point usage';
