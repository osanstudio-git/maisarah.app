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

    if (action === 'get_recruits') {
      const { data, error } = await supabaseAdmin
        .from('hr_recruits')
        .select('*')
        .order('created_at', { ascending: false })
      return new Response(
        JSON.stringify({ success: !error, data: data || [], error: error?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'upsert_recruit') {
      const recruitData = body.recruit
      if (!recruitData) {
        return new Response(
          JSON.stringify({ error: 'Recruit data is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Defensively sanitize placement_status against check constraints
      if (recruitData.placement_status !== 'pending_placement' && recruitData.placement_status !== 'placed') {
        recruitData.placement_status = null
      }

      const { data, error } = await supabaseAdmin
        .from('hr_recruits')
        .upsert(recruitData, { onConflict: 'id' })
        .select()
        .single()
      return new Response(
        JSON.stringify({ success: !error, data, error: error?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_recruit') {
      const { recruit_id, updates } = body
      if (!recruit_id || !updates) {
        return new Response(
          JSON.stringify({ error: 'recruit_id and updates are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Defensively sanitize placement_status against check constraints
      if (updates.placement_status !== undefined && updates.placement_status !== 'pending_placement' && updates.placement_status !== 'placed') {
        updates.placement_status = null
      }

      const { data, error } = await supabaseAdmin
        .from('hr_recruits')
        .update(updates)
        .eq('id', recruit_id)
        .select()
        .single()
      return new Response(
        JSON.stringify({ success: !error, data, error: error?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'upload_storage_file') {
      const { bucket, file_path, file_base64, content_type } = body
      if (!bucket || !file_path || !file_base64) {
        return new Response(
          JSON.stringify({ error: 'bucket, file_path and file_base64 are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Ensure bucket exists
      try {
        await supabaseAdmin.storage.createBucket(bucket, { public: true })
      } catch {}

      const binaryStr = atob(file_base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(file_path, bytes, {
          contentType: content_type || 'application/octet-stream',
          upsert: true
        })

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(file_path)

      return new Response(
        JSON.stringify({ success: true, url: publicUrlData.publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete_recruit') {
      const { recruit_id } = body
      if (recruit_id) {
        await supabaseAdmin.from('hr_recruits').delete().eq('id', recruit_id)
      }
      return new Response(
        JSON.stringify({ success: true, message: 'Recruit deleted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // 3. Ensure hr_employees record is upserted with full info
    const hrData: any = {
      id: userId,
      email: cleanEmail,
      full_name: full_name || '',
      phone: body.phone || '',
      dept: body.dept || department_id || 'Audit',
      role: body.job_title || role || 'Staff Member',
      accessRole: role,
      secondary_roles: secondary_roles || []
    }
    if (body.basic_salary) hrData.basic_salary = body.basic_salary
    if (body.joined_date) hrData.joined_date = body.joined_date
    if (body.immediate_supervisor) hrData.immediate_supervisor = body.immediate_supervisor
    if (body.employee_type) hrData.employee_type = body.employee_type

    try {
      await supabaseAdmin.from('hr_employees').upsert(hrData, { onConflict: 'id' })
    } catch (hrErr: any) {
      console.warn('hr_employees upsert warning in manage-auth:', hrErr.message)
    }

    return new Response(
      JSON.stringify({ success: true, userId, user: { id: userId } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
