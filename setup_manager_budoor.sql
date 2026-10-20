-- ==============================================================================
-- MAISARAH FINANCIAL & AUDITING PORTAL
-- Setup Master Manager User: Budoor Alhasani (Managing Partner & General Manager)
-- ==============================================================================
-- Run this script in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- Fixes:
-- 1. Populates auth.identities (Prevents the 500 'Database error querying schema')
-- 2. Sets all GoTrue token string fields to '' instead of NULL
-- 3. Sets auth.users.role to 'authenticated' and public.profiles.role to 'manager'
-- ==============================================================================

-- 1. Ensure user_role enum and constraints allow 'manager'
DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('employee', 'manager', 'hr', 'accountant', 'client', 'department_head', 'crm', 'sales'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Ensure hr_employees has status column if ever queried
DO $$
BEGIN
    ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Create or Synchronize Auth User and Identities
DO $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT := extensions.crypt('Password@123', extensions.gen_salt('bf'));
BEGIN
    -- Check if user already exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'info@mafcfinance.com';

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change,
            email_change_token_new,
            email_change_token_current,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            'info@mafcfinance.com',
            v_encrypted_pw,
            now(),
            now(),
            now(),
            '',
            '',
            '',
            '',
            '',
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'full_name', 'Budoor Alhasani',
                'role', 'manager',
                'company_phone', '+968 7259 6533',
                'nationality', 'Oman',
                'gender', 'female',
                'marital_status', 'single'
            ),
            false
        );
    ELSE
        -- Update existing user to fix all GoTrue token fields and password
        UPDATE auth.users
        SET 
            encrypted_password = v_encrypted_pw,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now(),
            aud = 'authenticated',
            role = 'authenticated',
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change = COALESCE(email_change, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change_token_current = COALESCE(email_change_token_current, ''),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = jsonb_build_object(
                'full_name', 'Budoor Alhasani',
                'role', 'manager',
                'company_phone', '+968 7259 6533',
                'nationality', 'Oman',
                'gender', 'female',
                'marital_status', 'single'
            )
        WHERE id = v_user_id;
    END IF;

    -- 4. Create or Update Identity in auth.identities (CRITICAL: Fixes the 500 error!)
    BEGIN
        DELETE FROM auth.identities WHERE user_id = v_user_id;
        
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', 'info@mafcfinance.com'),
            'email',
            v_user_id::text,
            now(),
            now(),
            now()
        );
    EXCEPTION WHEN undefined_column THEN
        -- Fallback for schema variants without provider_id column
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_user_id::text,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', 'info@mafcfinance.com'),
            'email',
            now(),
            now(),
            now()
        );
    END;

    -- 5. Upsert into public.profiles (Strictly role = 'manager')
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        department_id,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        'info@mafcfinance.com',
        'Budoor Alhasani',
        'manager',
        'management',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'manager',
        full_name = 'Budoor Alhasani',
        email = 'info@mafcfinance.com',
        department_id = 'management',
        updated_at = now();

    -- Safely update secondary_roles on profiles if the column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'secondary_roles'
    ) THEN
        BEGIN
            UPDATE public.profiles SET secondary_roles = '{}'::text[] WHERE id = v_user_id;
        EXCEPTION WHEN others THEN
            UPDATE public.profiles SET secondary_roles = '[]'::jsonb WHERE id = v_user_id;
        END;
    END IF;

    -- 6. Upsert into public.hr_employees (Matching exact columns)
    INSERT INTO public.hr_employees (
        id,
        full_name,
        email,
        phone,
        company_phone,
        nationality,
        gender,
        marital_status,
        role,
        dept,
        accessrole,
        department_id,
        employee_type,
        basic_salary,
        joined_date,
        secondary_roles,
        updated_at
    ) VALUES (
        v_user_id,
        'Budoor Alhasani',
        'info@mafcfinance.com',
        '+968 7259 6533',
        '+968 7259 6533',
        'Oman',
        'female',
        'single',
        'Managing Partner & General Manager',
        'Executive Management',
        'manager',
        'management',
        'Experienced',
        0,
        CURRENT_DATE,
        '[]'::jsonb,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = 'Budoor Alhasani',
        email = 'info@mafcfinance.com',
        phone = '+968 7259 6533',
        company_phone = '+968 7259 6533',
        nationality = 'Oman',
        gender = 'female',
        marital_status = 'single',
        role = 'Managing Partner & General Manager',
        dept = 'Executive Management',
        accessrole = 'manager',
        department_id = 'management',
        secondary_roles = '[]'::jsonb,
        updated_at = now();

    -- 7. Ensure Leave Balances exist (if table present)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hr_leave_balances' AND table_schema = 'public') THEN
        INSERT INTO public.hr_leave_balances (employee_id, annual, sick, maternity, paternity)
        VALUES (v_user_id, 30, 15, 98, 7)
        ON CONFLICT (employee_id) DO NOTHING;
    END IF;

END $$;

-- 8. Verification: Check auth user, identity, profile, and HR record
SELECT 
    u.id, 
    u.email, 
    u.role AS auth_role,
    p.role AS profile_role, 
    i.provider AS identity_provider,
    h.company_phone, 
    h.nationality, 
    h.gender, 
    h.marital_status, 
    h.role AS designation, 
    h.dept
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
LEFT JOIN auth.identities i ON i.user_id = u.id
LEFT JOIN public.hr_employees h ON h.id = u.id
WHERE u.email = 'info@mafcfinance.com';
