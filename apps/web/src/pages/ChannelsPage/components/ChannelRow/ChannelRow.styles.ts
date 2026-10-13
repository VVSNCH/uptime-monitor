import styled from 'styled-components'

export const Row = styled.div<{ $isMuted: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    'icon details'
    'actions actions';
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1, 2)};
  padding: ${({ theme }) => theme.spacing(1.5, 2)};

  & + & {
    border-top: 1px solid ${({ theme }) => theme.vars.palette.divider};
  }

  > :not(:last-child) {
    opacity: ${({ $isMuted }) => ($isMuted ? 0.6 : 1)};
  }

  ${({ theme }) => theme.breakpoints.up('sm')} {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'icon details actions';
  }
`

export const Icon = styled.div`
  grid-area: icon;
  display: flex;
  color: ${({ theme }) => theme.vars.palette.text.secondary};
`

export const Details = styled.div`
  grid-area: details;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

export const Actions = styled.div`
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(0.5)};
`
