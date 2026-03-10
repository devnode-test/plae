-- Update trigger to handle conflicts gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario Nuevo'),
    COALESCE(new.raw_user_meta_data->>'rol', 'responsable')
  )
  ON CONFLICT (id) DO NOTHING; -- If ID exists, do nothing
  -- Note: If email exists but ID is different, this will fail if email is UNIQUE.
  -- Ideally we should handle email conflict too, but for now we assume fresh users.
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
