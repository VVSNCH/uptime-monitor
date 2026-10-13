import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import { PASSWORD_RULES } from '@uptime/shared'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'

import { AuthCard } from '../../components'
import { ROUTES } from '../../constants/navigation'
import { useRegister } from '../../hooks/useAccount'
import { validateEmail, validateNewPassword } from '../../services/validation'

type Field = 'email' | 'password'

export function RegisterPage() {
  const register = useRegister()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})

  const emailError = touched.email ? validateEmail(email) : null
  const passwordError = touched.password ? validateNewPassword(password) : null

  const handleBlur = (field: Field) => () =>
    setTouched((current) => ({ ...current, [field]: true }))

  const handleSubmit = () => {
    setTouched({ email: true, password: true })
    if (validateEmail(email) !== null || validateNewPassword(password) !== null) return
    register.mutate({ email: email.trim(), password })
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Add a URL and get told when it goes down, and when it comes back."
      error={register.error?.message}
      onSubmit={handleSubmit}
      footer={
        <>
          Already have an account?{' '}
          <Link component={RouterLink} to={ROUTES.login}>
            Sign in
          </Link>
        </>
      }
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        error={emailError !== null}
        helperText={emailError}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={handleBlur('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        error={passwordError !== null}
        helperText={passwordError ?? `At least ${PASSWORD_RULES.minLength} characters`}
        onChange={(event) => setPassword(event.target.value)}
        onBlur={handleBlur('password')}
      />
      <Button type="submit" variant="contained" size="large" loading={register.isPending}>
        Create account
      </Button>
    </AuthCard>
  )
}
