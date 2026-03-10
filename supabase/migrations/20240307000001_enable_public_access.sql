-- Eliminar políticas anteriores restrictivas
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ejes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON ejes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON ejes;

-- Crear políticas permisivas para desarrollo (permitir todo a anon y authenticated)
CREATE POLICY "Enable insert for all users" ON ejes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON ejes FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON ejes FOR DELETE USING (true);

-- Hacer lo mismo para las otras tablas para evitar futuros errores en desarrollo
CREATE POLICY "Enable insert for all users" ON focos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON focos FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON focos FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON objetivos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON objetivos FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON objetivos FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON indicadores FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON indicadores FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON indicadores FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON metas_anuales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON metas_anuales FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON metas_anuales FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON acciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON acciones FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON acciones FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON evidencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON evidencias FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON evidencias FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON usuarios FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON usuarios FOR DELETE USING (true);
