import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json()
    const { action, email, password, full_name, role, department_id, secondary_roles, user_id } = body

    if (action === 'delete' || body.delete === true) {
      let targetUserId = user_id
      const cleanEmail = (email || '').trim().toLowerCase()

      if (!targetUserId && cleanEmail) {
        const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
        if (!listErr) {
          const found = users?.find(u => u.email?.toLowerCase() === cleanEmail)
          if (found) targetUserId = found.id
        }
      }

      if (targetUserId) {
        try {
          await supabaseAdmin.from('services').update({ employee_id: null }).eq('employee_id', targetUserId)
          await supabaseAdmin.from('clients').update({ assigned_employee_id: null }).eq('assigned_employee_id', targetUserId)
          await supabaseAdmin.from('hr_leave_requests').delete().eq('employee_id', targetUserId)
          await supabaseAdmin.from('hr_leave_balances').delete().eq('employee_id', targetUserId)
          await supabaseAdmin.from('hr_attendance').delete().eq('employee_id', targetUserId)
          await supabaseAdmin.from('hr_employees').delete().eq('id', targetUserId)
          await supabaseAdmin.from('profiles').delete().eq('id', targetUserId)
          await supabaseAdmin.auth.admin.deleteUser(targetUserId)
        } catch (delErr: any) {
          console.warn('Cascade delete notice in manage-auth:', delErr.message)
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanEmail = email.trim().toLowerCase()

    // 1. Check if user already exists in auth.users
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr

    const existingUser = users?.find(u => u.email?.toLowerCase() === cleanEmail)
    let userId: string

    if (existingUser) {
      userId = existingUser.id
      const updateData: any = {
        user_metadata: { 
          full_name, 
          role, 
          department_id, 
          secondary_roles: Array.isArray(secondary_roles) ? secondary_roles : [] 
        }
      }
      if (password) {
        updateData.password = password
      }
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)
      if (updateErr) throw updateErr
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { 
          full_name, 
          role, 
          department_id, 
          secondary_roles: Array.isArray(secondary_roles) ? secondary_roles : [] 
        }
      })
      if (createErr) throw createErr
      userId = created.user.id
    }

    // 2. Ensure profile record is upserted with correct role and secondary_roles
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: cleanEmail,
      full_name,
      role,
      department_id,
      secondary_roles: secondary_roles || []
    }, { onConflict: 'id' })

    if (profErr) {
      console.warn('Profiles upsert warning:', profErr.message)
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
