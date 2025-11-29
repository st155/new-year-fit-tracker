-- Fix missing UPDATE RLS policy for supplement_products
-- This allows authenticated users to update image_url after photo upload

CREATE POLICY "Authenticated users can update supplement products"
ON supplement_products
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);