-- Fix RLS policies to allow service role (webhook) to insert subscription and payment data
-- This migration adds policies that allow the service role to bypass RLS for webhook operations

-- Drop existing restrictive policies for subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.subscriptions;

-- Drop existing restrictive policies for payment_history
DROP POLICY IF EXISTS "Users can insert their own payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Users can delete their own payment history" ON public.payment_history;

-- Create new policies for subscriptions that allow both user access and service role access
CREATE POLICY "Users and service role can insert subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users and service role can update subscriptions" ON public.subscriptions
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    ) WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users and service role can delete subscriptions" ON public.subscriptions
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Create new policies for payment_history that allow both user access and service role access
CREATE POLICY "Users and service role can insert payment history" ON public.payment_history
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users and service role can update payment history" ON public.payment_history
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    ) WITH CHECK (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "Users and service role can delete payment history" ON public.payment_history
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Ensure RLS is enabled on both tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;