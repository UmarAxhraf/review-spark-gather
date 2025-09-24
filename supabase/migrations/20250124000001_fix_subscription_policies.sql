-- Fix missing RLS policies for subscriptions table

-- Add INSERT policy for subscriptions
CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for subscriptions  
CREATE POLICY "Users can delete own subscription" ON public.subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Add INSERT policy for payment_history
CREATE POLICY "Users can insert own payment history" ON public.payment_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for payment_history
CREATE POLICY "Users can delete own payment history" ON public.payment_history
  FOR DELETE USING (auth.uid() = user_id);