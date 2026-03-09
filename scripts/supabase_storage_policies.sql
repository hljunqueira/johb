-- ============================================================
-- Políticas do bucket "Fotos" no Supabase Storage
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- Leitura pública (qualquer um pode ver as imagens)
CREATE POLICY "Fotos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'Fotos');

-- Upload apenas para usuários autenticados via service_role (backend)
CREATE POLICY "Backend pode fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'Fotos');

-- Atualização permitida para service_role
CREATE POLICY "Backend pode atualizar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Fotos');

-- Deleção permitida para service_role
CREATE POLICY "Backend pode deletar"
ON storage.objects FOR DELETE
USING (bucket_id = 'Fotos');
