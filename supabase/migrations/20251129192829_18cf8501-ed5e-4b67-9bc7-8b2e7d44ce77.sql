-- Fix UPDATE RLS policy for supplement_products table
-- CRITICAL: Must use 'authenticated' role, not 'public'

DROP POLICY IF EXISTS "Authenticated users can update supplement products" ON supplement_products;

CREATE POLICY "Authenticated users can update supplement products"
ON supplement_products
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);