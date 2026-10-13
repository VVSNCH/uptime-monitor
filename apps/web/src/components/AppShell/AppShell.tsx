import MenuRounded from '@mui/icons-material/MenuRounded'
import MonitorHeartRounded from '@mui/icons-material/MonitorHeartRounded'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router'

import type { NavItem } from '../../types/navigation'
import { Brand, DesktopNav, DrawerNav, Main, MenuButton } from './AppShell.styles'

interface AppShellProps {
  navItems: NavItem[]
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ navItems, actions, children }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleMenuOpen = () => setIsMenuOpen(true)
  const handleMenuClose = () => setIsMenuOpen(false)

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <MenuButton edge="start" aria-label="Open navigation" onClick={handleMenuOpen}>
            <MenuRounded />
          </MenuButton>
          <Brand>
            <MonitorHeartRounded color="primary" />
            <Typography variant="h3" component="span">
              Uptime Monitor
            </Typography>
          </Brand>
          <DesktopNav aria-label="Main">
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                end
                color="inherit"
                startIcon={<item.icon />}
              >
                {item.label}
              </Button>
            ))}
          </DesktopNav>
          {actions}
        </Toolbar>
      </AppBar>

      <Drawer open={isMenuOpen} onClose={handleMenuClose}>
        <DrawerNav aria-label="Main">
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end
                onClick={handleMenuClose}
              >
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </DrawerNav>
      </Drawer>

      <Main>{children}</Main>
    </>
  )
}
