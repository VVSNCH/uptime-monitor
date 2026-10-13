import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

import { ConfirmDialog, DateTime, PageHeader, SectionCard } from '../../components'
import { THEME_MODE_ORDER, THEME_MODES, type ThemeMode } from '../../constants/appearance'
import type { TimeZoneMode } from '../../constants/time'
import { useSignOutEverywhere } from '../../hooks/useAccount'
import { useAuth } from '../../hooks/useAuth'
import { useNow } from '../../hooks/useNow'
import { useSnackbar } from '../../hooks/useSnackbar'
import { useThemeMode } from '../../hooks/useThemeMode'
import { useTimeZone } from '../../hooks/useTimeZone'
import { PasswordForm } from './components/PasswordForm/PasswordForm'
import { Example, ModeButton, Sections } from './SettingsPage.styles'

export function SettingsPage() {
  const { user } = useAuth()
  const [timeZone, setTimeZone] = useTimeZone()
  const [themeMode, setThemeMode] = useThemeMode()
  const now = useNow()
  const signOutEverywhere = useSignOutEverywhere()
  const notify = useSnackbar()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleTimeZone = (_event: unknown, value: TimeZoneMode | null) => {
    if (value) setTimeZone(value)
  }
  const handleThemeMode = (_event: unknown, value: ThemeMode | null) => {
    if (value) setThemeMode(value)
  }
  const handleSignOutEverywhere = () =>
    signOutEverywhere.mutate(undefined, {
      onError: (error) => {
        setIsConfirming(false)
        notify(error.message, 'error')
      },
    })

  return (
    <>
      <PageHeader title="Settings" />
      <Sections>
        <SectionCard title="Account">
          <Typography variant="body2" color="textSecondary">
            Signed in as
          </Typography>
          <Typography variant="body1">{user?.email}</Typography>
        </SectionCard>

        <SectionCard title="Password">
          {user?.isDemo ? (
            <Alert severity="info">
              Everyone trying the app shares the demo account, so its password cannot be changed.
            </Alert>
          ) : (
            <PasswordForm />
          )}
        </SectionCard>

        <SectionCard title="Sessions">
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Signs this account out everywhere it is signed in, this browser included. Use it if you
            signed in on a device you no longer have.
          </Typography>
          <Button variant="outlined" color="error" onClick={() => setIsConfirming(true)}>
            Sign out of all devices
          </Button>
        </SectionCard>

        <SectionCard title="Appearance">
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Light or dark, or follow your operating system. Kept in this browser only.
          </Typography>
          <ToggleButtonGroup exclusive size="small" value={themeMode} onChange={handleThemeMode}>
            {THEME_MODE_ORDER.map((value) => {
              const { label, icon: Icon } = THEME_MODES[value]
              return (
                <ModeButton key={value} value={value}>
                  <Icon fontSize="small" />
                  {label}
                </ModeButton>
              )
            })}
          </ToggleButtonGroup>
        </SectionCard>

        <SectionCard title="Time zone">
          <Typography variant="body2" color="textSecondary" gutterBottom>
            How times are shown across the dashboard. Kept in this browser only.
          </Typography>
          <ToggleButtonGroup exclusive size="small" value={timeZone} onChange={handleTimeZone}>
            <ToggleButton value="local">Local time</ToggleButton>
            <ToggleButton value="utc">UTC</ToggleButton>
          </ToggleButtonGroup>
          <Example>
            <Typography variant="body2" color="textSecondary">
              Now: <DateTime value={new Date(now).toISOString()} />
            </Typography>
          </Example>
        </SectionCard>
      </Sections>

      <ConfirmDialog
        open={isConfirming}
        title="Sign out of all devices?"
        message="Every session of this account ends, including this one. You will need to sign in again."
        confirmLabel="Sign out everywhere"
        tone="danger"
        isConfirming={signOutEverywhere.isPending}
        onConfirm={handleSignOutEverywhere}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  )
}
