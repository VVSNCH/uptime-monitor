import styled from 'styled-components'

export const BackLink = styled.div`
  margin: ${({ theme }) => theme.spacing(-1, 0, 1, -1)};
`

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`

export const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(2)};

  ${({ theme }) => theme.breakpoints.up('md')} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

// One column on phones and tablets; from the md breakpoint the history and
// chart take two thirds, incidents and settings the rest.
export const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing(3)};

  ${({ theme }) => theme.breakpoints.up('md')} {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    align-items: start;
  }
`

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
`
