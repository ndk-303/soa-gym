import { membersApi } from '../services/api'

export async function resolveCurrentMember(user) {
  if (!user) return null
  const defaultFullName = user.full_name && user.full_name.trim()
    ? user.full_name.trim()
    : user.email ? user.email.split('@')[0] : `Hội viên #${user.id}`

  try {
    const res = await membersApi.getAll()
    const members = res.data || []
    let member = members.find((m) => String(m.user_id) === String(user.id))
    if (!member) {
      const createRes = await membersApi.create({
        user_id: user.id,
        full_name: defaultFullName,
        email: user.email || `member${user.id}@gym.com`,
        status: 'active',
        membership_plan_id: null,
      })
      member = createRes.data
    } else if (user.full_name && (!member.full_name || member.full_name === user.email.split('@')[0])) {
      // Auto-sync full_name if member had dummy name
      try {
        const updateRes = await membersApi.update(member.id, {
          user_id: member.user_id,
          full_name: user.full_name,
          email: member.email,
          status: member.status,
          membership_plan_id: member.membership_plan_id,
        })
        member = updateRes.data
      } catch {
        // Non-blocking sync
      }
    }
    return member
  } catch (err) {
    console.error('Failed to resolve member profile:', err)
    return {
      id: user.id,
      user_id: user.id,
      full_name: defaultFullName,
      email: user.email,
      status: 'active',
      membership_plan_id: null,
    }
  }
}
