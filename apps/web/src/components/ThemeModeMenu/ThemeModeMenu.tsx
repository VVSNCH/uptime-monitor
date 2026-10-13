import CheckRounded from '@mui/icons-material/CheckRounded'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import { type MouseEvent, useState } from 'react'

import { THEME_MODE_ORDER, THEME_MODES, type ThemeMode } from '../../constants/appearance'
import { useThemeMode } from '../../hooks/useThemeMode'

export function ThemeModeMenu() {
  const [mode, setMode] = useThemeMode()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const CurrentIcon = THEME_MODES[mode].icon

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)
  const handleClose = () => setAnchor(null)
  const handleSelect = (value: ThemeMode) => {
    setMode(value)
    handleClose()
  }

  return (
    <>
      <Tooltip title={`Theme: ${THEME_MODES[mode].label}`}>
        <IconButton aria-label="Change theme" onClick={handleOpen}>
          <CurrentIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={handleClose}>
        {THEME_MODE_ORDER.map((value) => {
          const { label, icon: Icon } = THEME_MODES[value]
          return (
            <MenuItem key={value} selected={value === mode} onClick={() => handleSelect(value)}>
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{label}</ListItemText>
              {value === mode && <CheckRounded fontSize="small" />}
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
