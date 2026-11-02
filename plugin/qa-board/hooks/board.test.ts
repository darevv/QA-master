import { test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'

const TOOL = 'mcp__qa-board__update'
const PANE = {
  plugin: 'qa-board',
  component: 'Pane',
  requestId: 'qa-board',
  props: { title: 'QA board', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

const bottom = (on: On) => {
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
}

test('update tool stores findings and the pane draws them by severity', async ($, on) => {
  bottom(on)
  const first = await $.tool.call({
    tool: TOOL,
    reset: true,
    phase: 'round 1 · testing',
    findings: [
      { id: 'QA-001', title: 'Donate spinner never ends', severity: 'Blocker', status: 'open', fix_with: 'fable' },
      { id: 'QA-002', title: 'Label unclear', severity: 'Minor', status: 'open', fix_with: 'sonnet' },
    ],
  })
  expect(first.result).toBe('board: 2 findings; B1 M1; phase: round 1 · testing')

  await $.tool.call({ tool: TOOL, set: [{ id: 'QA-001', status: 'fixing', agent: 'fable' }] })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Blocker 0\/1/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /◐ QA-001 Donate spinner never ends ← fable/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Minor 0\/1/ })).toBeDefined()
    await ui.unmount()
  }
})

test('replacing a finding by id keeps one row', async ($, on) => {
  bottom(on)
  await $.tool.call({ tool: TOOL, reset: true, findings: [{ id: 'QA-003', title: 'a', severity: 'Major', status: 'open' }] })
  const second = await $.tool.call({ tool: TOOL, findings: [{ id: 'QA-003', title: 'b', severity: 'Major', status: 'verified' }] })
  expect(second.result).toBe('board: 1 findings; M1; phase: none')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Major 1\/1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /✓ QA-003 b/ })).toBeDefined()
  await ui.unmount()
})
