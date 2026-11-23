import { Courthouse } from 'reicon-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Badge, Button, Input } from '../../components/atoms'
import { Field } from '../../components/molecules'
import { canLogIn, fullName, roleLabel } from '../../lib'
import { useData } from '../../store'
import { DEMO_CREDENTIALS, INVALID_CREDENTIALS } from './LoginCredentials.constants'
import fondo from './fondo.png'

export default function LoginCredentials() {
  const { userId: chosenId } = useParams()
  const sessionId = useData((s) => s.userId)
  const users = useData((s) => s.users)
  const municipalities = useData((s) => s.municipalities)
  const logIn = useData((s) => s.logIn)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (sessionId) return <Navigate to="/" replace />
  const user = users.find((u) => u.id === chosenId)
  if (!user || !canLogIn(user, municipalities)) return <Navigate to="/login" replace />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (username.trim() === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
      logIn(user.id)
      navigate('/')
    } else {
      setError(INVALID_CREDENTIALS)
    }
  }

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden bg-surface lg:grid-cols-12">
      {/* Panel izquierdo: Formulario */}
      <div className="flex flex-col justify-between overflow-y-auto px-6 py-6 sm:px-12 lg:col-span-5">
        <div className="mx-auto my-auto w-full max-w-sm">
          {/* Logo y nombre */}
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm">
              <Courthouse className="size-6" aria-hidden />
            </span>
            <span className="text-[25px] font-semibold text-fg-strong">Gestor Autoliquidables</span>
          </div>

          {/* Bloque de perfil seleccionado */}
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-brand-surface p-3.5">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg-strong">{fullName(user)}</p>
              <p className="text-sm text-fg">{roleLabel[user.role]}</p>
              <div>
                <Badge tone={user.role === '1cero1' ? 'info' : 'neutral'}>
                  {municipalities.find((m) => m.id === user.municipalityId)?.name ??
                    'Todos los municipios'}
                </Badge>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="shrink-0 text-sm font-medium text-brand hover:underline"
            >
              Cambiar usuario
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Usuario">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <Input
                  value={username}
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  autoFocus
                  className="pl-9"
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError('')
                  }}
                />
              </div>
            </Field>

            <Field label="Contraseña" error={error}>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-9 pr-10"
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                >
                  {showPassword ? (
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              className="w-full border-transparent! bg-[#1d63b8]! text-white! hover:bg-[#1a59a5]!"
            >
              Ingresar
            </Button>
          </form>

          {/* Nota de credenciales demo */}
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-brand-surface px-3 py-2.5 text-xs text-fg-muted">
            <svg
              className="size-4 shrink-0 text-brand"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>Demo: usuario admin, contraseña admin</span>
          </div>
        </div>
      </div>

      {/* Panel derecho: Imagen */}
      <div className="relative hidden overflow-hidden bg-brand-surface lg:col-span-7 lg:block">
        <img
          src={fondo}
          alt="Gestor Autoliquidables"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}
