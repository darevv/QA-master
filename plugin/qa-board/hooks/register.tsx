import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'
import type { Finding, Severity, Status } from '../types'

const PANE = 'qa-board'
const TOOL = 'mcp__qa-board__update'
const findings = atom({ plugin: 'qa-board', key: 'findings' } as const, [] as Finding[])
const phase = atom({ plugin: 'qa-board', key: 'phase' } as const, '')

const SEVERITIES: readonly Severity[] = ['Blocker', 'Major', 'Minor', 'Polish']
const COLOR: Record<Severity, string> = { Blocker: 'error', Major: 'warning', Minor: 'suggestion', Polish: 'subtle' }
const GLYPH: Record<Status, string> = { open: '○', fixing: '◐', fixed: '●', verified: '✓', failed: '✗', skipped: '–' }

type UpdateInput = {
  phase?: string
  reset?: boolean
  findings?: Finding[]
  set?: { id: string; status: Status; agent?: string }[]
}

const counts = (list: Finding[]) =>
  SEVERITIES.map(s => {
    const of = list.filter(f => f.severity === s)
    return of.length ? `${s[0]}${of.length}` : ''
  }).filter(Boolean).join(' ')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'update',
      description:
        'Update the QA board sidebar. reset clears it; phase sets the headline; findings adds or replaces findings by id; set changes status (open|fixing|fixed|verified|failed|skipped) and optionally names the agent working on it.',
      isDeferred: false,
      inputSchema: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          reset: { type: 'boolean' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                severity: { type: 'string', enum: [...SEVERITIES] },
                status: { type: 'string', enum: Object.keys(GLYPH) },
                fix_with: { type: 'string' },
                agent: { type: 'string' },
              },
              required: ['id', 'title', 'severity', 'status'],
            },
          },
          set: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, status: { type: 'string', enum: Object.keys(GLYPH) }, agent: { type: 'string' } },
              required: ['id', 'status'],
            },
          },
        },
      },
    })
    await $.command.register({ name: 'qa-board', description: 'Open the QA findings sidebar' })
    return next(e)
  })

  on('command.run', { command: 'qa-board' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'QA board' })
    return { text: opened.isPlaced ? 'QA board opened.' : `QA board waiting: ${opened.reason}` }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as UpdateInput
    if (input.reset) {
      await update($, findings, () => [])
      await update($, phase, () => '')
    }
    if (input.phase !== undefined) await update($, phase, () => input.phase ?? '')
    if (input.findings?.length) {
      const incoming = input.findings
      await update($, findings, list => {
        const kept = list.filter(f => !incoming.some(n => n.id === f.id))
        return [...kept, ...incoming]
      })
    }
    if (input.set?.length) {
      const changes = input.set
      await update($, findings, list =>
        list.map(f => {
          const c = changes.find(x => x.id === f.id)
          return c ? { ...f, status: c.status, agent: c.agent ?? f.agent } : f
        }),
      )
    }
    const list = await read($, findings)
    const head = await read($, phase)
    const isUp = (await $.ui.panes()).some(p => p.id === PANE)
    if (!isUp) await $.ui.open({ id: PANE, title: 'QA board' })
    $.ui.status(list.length ? `QA ${head}: ${counts(list)}` : undefined)
    return { result: `board: ${list.length} findings; ${counts(list) || 'none'}; phase: ${head || 'none'}` }
  }).catch(($, e, next) => (next.called ? next(e) : { result: `qa-board: update failed, board unchanged` }))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, findings)
    const head = await read($, phase)
    const width = Math.max(20, (e.props.bodyColumns ?? 40) - 1)

    return (
      <Box flexDirection="column">
        <Text bold>{head || 'QA board'}</Text>
        {list.length === 0 && <Text dimColor>No findings yet. Run /qa.</Text>}
        {SEVERITIES.map(sev => {
          const group = list.filter(f => f.severity === sev)
          if (!group.length) return null
          const done = group.filter(f => f.status === 'verified').length
          return (
            <Box flexDirection="column" marginTop={1}>
              <Text color={COLOR[sev]} bold>
                {sev} {done}/{group.length}
              </Text>
              {group.map(f => {
                const isDone = f.status === 'verified' || f.status === 'skipped'
                const who = f.status === 'fixing' && f.agent ? ` ← ${f.agent}` : ''
                const line = `${GLYPH[f.status]} ${f.id} ${f.title}${who}`
                return (
                  <Text color={isDone ? undefined : COLOR[sev]} dimColor={isDone} wrap="truncate-end">
                    {line.slice(0, width)}
                  </Text>
                )
              })}
            </Box>
          )
        })}
        <Box marginTop={1}>
          <Text dimColor>○ open ◐ fixing ● fixed ✓ verified ✗ failed</Text>
        </Box>
      </Box>
    )
  })
}
