import styled, { css, type DefaultTheme, keyframes } from 'styled-components'

import type { LiveStatus } from '../../services/liveEvents'

const DOT_COLOR: Record<LiveStatus, (theme: DefaultTheme) => string> = {
  live: (theme) => theme.vars.palette.status.up,
  connecting: (theme) => theme.vars.palette.status.pending,
  offline: (theme) => theme.vars.palette.status.paused,
}

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 currentColor; }
  70% { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`

export const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.75)};
  margin-right: ${({ theme }) => theme.spacing(1)};
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.vars.palette.text.secondary};
`

export const Dot = styled.span<{ $status: LiveStatus }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  color: ${({ theme, $status }) => DOT_COLOR[$status](theme)};
  background-color: currentColor;
  ${({ $status }) =>
    $status === 'live' &&
    css`
      animation: ${pulse} 2s ease-out infinite;
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

// The dot alone carries the state on phones; the word needs the room.
export const Label = styled.span`
  ${({ theme }) => theme.breakpoints.down('sm')} {
    display: none;
  }
`
