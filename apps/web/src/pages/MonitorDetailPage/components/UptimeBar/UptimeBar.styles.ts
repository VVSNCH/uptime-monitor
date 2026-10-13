import styled, { type DefaultTheme } from 'styled-components'

export type CellTone = 'good' | 'fair' | 'poor' | 'empty'

const CELL_COLOR: Record<CellTone, (theme: DefaultTheme) => string> = {
  good: (theme) => theme.vars.palette.status.up,
  fair: (theme) => theme.vars.palette.status.pending,
  poor: (theme) => theme.vars.palette.status.down,
  empty: (theme) => theme.vars.palette.action.disabledBackground,
}

// On narrow screens the bar keeps a usable cell width and scrolls instead.
export const Scroller = styled.div`
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.spacing(0.5)};
`

export const Bar = styled.div`
  display: flex;
  gap: 2px;
  min-width: 540px;
  height: 36px;
`

export const Cell = styled.div<{ $tone: CellTone }>`
  flex: 1;
  border-radius: 2px;
  background-color: ${({ theme, $tone }) => CELL_COLOR[$tone](theme)};

  &:hover {
    opacity: 0.75;
  }
`

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing(0.5)};
`
