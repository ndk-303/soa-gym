import { createContext, useContext, useState } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('gym_token') || null)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gym_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const response = await authApi.login({ email, password })
      const { access_token, user: userData } = response.data

      localStorage.setItem('gym_token', access_token)
      localStorage.setItem('gym_user', JSON.stringify(userData))

      setToken(access_token)
      setUser(userData)
      return userData
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('gym_token')
    localStorage.removeItem('gym_user')
    setToken(null)
    setUser(null)
  }

  const isAuthenticated = Boolean(token && user)
  const isAdmin = user?.role === 'admin'
  const isTrainer = user?.role === 'trainer'
  const isMember = user?.role === 'member' || user?.role === 'user' || (!isAdmin && !isTrainer)

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated,
        isAdmin,
        isTrainer,
        isMember,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
