import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { type MouseEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { ROUTES } from '../../constants/navigation'
import { useAuth } from '../../hooks/useAuth'
import { Account, DemoChip, Wrapper } from './AccountMenu.styles'

export function AccountMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)
  const handleClose = () => setAnchor(null)
  const handleSettings = () => {
    handleClose()
    void navigate(ROUTES.settings)
  }
  const handleSignOut = () => {
    handleClose()
    void signOut()
  }

  return (
    <Wrapper>
      {user?.isDemo && (
        <DemoChip label="Demo account" size="small" color="primary" variant="outlined" />
      )}
      <IconButton aria-label="Account" onClick={handleOpen}>
        <AccountCircleRounded />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={handleClose}>
        <Account>
          <Typography variant="caption" color="textSecondary">
            Signed in as
          </Typography>
          <Typography variant="body2" noWrap>
            {user?.email}
          </Typography>
        </Account>
        <Divider />
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsRounded fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </Wrapper>
  )
}
