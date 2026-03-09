CREATE POLICY "Users can insert own transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() = created_by);