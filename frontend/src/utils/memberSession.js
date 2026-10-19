import { membersApi } from '../services/api'

export async function resolveCurrentMember(user) {
  if (!user) return null
  try {
    const res = await membersApi.getAll()
    const members = res.data || []
    let member = members.find((m) => String(m.user_id) === String(user.id))
    if (!member) {
      const createRes = await membersApi.create({
        user_id: user.id,
        full_name: user.email ? user.email.split('@')[0] : `Hội viên #${user.id}`,
        email: user.email || `member${user.id}@gym.com`,
        status: 'active',
        membership_plan_id: null,
      })
      member = createRes.data
    }
    return member
  } catch (err) {
    console.error('Failed to resolve member profile:', err)
    return {
      id: user.id,
      user_id: user.id,
      full_name: user.email ? user.email.split('@')[0] : 'Hội viên',
      email: user.email,
      status: 'active',
      membership_plan_id: null,
    }
  }
}
