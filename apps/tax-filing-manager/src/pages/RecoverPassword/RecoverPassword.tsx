import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button, Input } from '../../components/atoms'
import { Field, Notice } from '../../components/molecules'
import { useData } from '../../store'
import { RECOVERY_SENT } from './RecoverPassword.constants'
import { emailError, isValidEmail } from './RecoverPassword.utils'

export default function RecoverPassword() {
  const { userId } = useParams()
  const sessionId = useData((s) => s.userId)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sent, setSent] = useState(false)

  if (sessionId) return <Navigate to="/" replace />

  const error = emailError(email, submitted)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!isValidEmail(email)) return
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-fg-strong text-center pb-2">Recupera tu cuenta</h1>
        <p className="mt-1 text-sm text-fg-muted text-center">
          Ingresa tu correo electrónico para recuperar tu cuenta.
        </p>

        {sent && (
          <div className="mt-4">
            <Notice tone="success" role="status">
              {RECOVERY_SENT}
            </Notice>
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <Field label="Correo Electrónico" error={error}>
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
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <Input
                type="email"
                value={email}
                placeholder="usuario@dominio.com"
                autoComplete="email"
                autoFocus
                className="pl-9"
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSent(false)
                }}
              />
            </div>
          </Field>

          <Button type="submit" variant="primary" className="w-full">
            Recuperar
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate(userId ? `/login/${userId}` : '/login')}
            className="text-sm font-medium text-brand hover:underline transition-colors"
          >
            Regresar a Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
