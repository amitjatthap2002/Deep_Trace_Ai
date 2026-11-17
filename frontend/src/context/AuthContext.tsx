import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

interface User {
  user_id: string
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, refresh_token } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    // Decode user from JWT (basic parse)
    const payload = JSON.parse(atob(access_token.split('.')[1]))
    const userObj = { user_id: payload.sub, name: email.split('@')[0], email, role: 'client' }
    localStorage.setItem('user', JSON.stringify(userObj))
    setUser(userObj)
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password })
    const { access_token, refresh_token } = res.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    const payload = JSON.parse(atob(access_token.split('.')[1]))
    const userObj = { user_id: payload.sub, name, email, role: 'client' }
    localStorage.setItem('user', JSON.stringify(userObj))
    setUser(userObj)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
