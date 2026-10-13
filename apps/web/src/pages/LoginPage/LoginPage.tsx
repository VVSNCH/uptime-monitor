import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import { DEMO_ACCOUNT } from '@uptime/shared'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'

import { AuthCard } from '../../components'
import { ROUTES } from '../../constants/navigation'
import { useLogin } from '../../hooks/useAccount'
import { validateEmail } from '../../services/validation'

export function LoginPage() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const emailError = hasSubmitted ? validateEmail(email) : null
  const passwordError = hasSubmitted && password === '' ? 'Enter your password' : null

  const handleSubmit = () => {
    setHasSubmitted(true)
    if (validateEmail(email) !== null || password === '') return
    login.mutate({ email: email.trim(), password })
  }

  const handleDemo = () => login.mutate({ ...DEMO_ACCOUNT })

  return (
    <AuthCard
      title="Sign in"
      subtitle="See how everything you monitor is doing."
      error={login.error?.message}
      onSubmit={handleSubmit}
      footer={
        <>
          No account yet?{' '}
          <Link component={RouterLink} to={ROUTES.register}>
            Create one
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
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        error={passwordError !== null}
        helperText={passwordError}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" variant="contained" size="large" loading={login.isPending}>
        Sign in
      </Button>
      <Divider>or</Divider>
      <Button variant="outlined" onClick={handleDemo} disabled={login.isPending}>
        Try the demo account
      </Button>
    </AuthCard>
  )
}
