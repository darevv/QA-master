export type Severity = 'Blocker' | 'Major' | 'Minor' | 'Polish'
export type Status = 'open' | 'fixing' | 'fixed' | 'verified' | 'failed' | 'skipped'
export type Finding = {
  id: string
  title: string
  severity: Severity
  status: Status
  fix_with?: string
  agent?: string
}

declare module 'claude-code' {
  interface PluginState {
    'qa-board': { findings: Finding[]; phase: string }
  }
}
