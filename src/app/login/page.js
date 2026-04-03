"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Supabase RLS will handle company isolation automatically 
      // based on the user's role and id_empresa in the database
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl opacity-50" />
        <div className="absolute top-[60%] left-[70%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">
            Obras<span className="text-accent">OS</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Plataforma SaaS de Gestión HSE y Control de Obras
          </p>
        </div>

        <div className="bg-card border border-border shadow-xl rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-6">Bienvenido de nuevo</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="usuario@empresa.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/10"
            >
              {loading ? 'Iniciando sesión...' : 'Entrar al Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ObrasOS. Todos los derechos reservados.
            </p>
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Problemas para acceder? <a href="#" className="text-primary font-medium hover:underline">Contactar soporte</a>
        </p>
      </div>
    </div>
  )
}
