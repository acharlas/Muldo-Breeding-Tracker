'use client'

const GEN_COLORS: Record<number, { bg: string; text: string }> = {
  1:  { bg: '#1C1C1E', text: '#6B7280' },
  2:  { bg: '#1F1F22', text: '#6B7280' },
  3:  { bg: '#222226', text: '#9CA3AF' },
  4:  { bg: '#26262B', text: '#9CA3AF' },
  5:  { bg: '#2A2A30', text: '#D1D5DB' },
  6:  { bg: '#2E2E35', text: '#D1D5DB' },
  7:  { bg: '#323239', text: '#E5E7EB' },
  8:  { bg: '#36363E', text: '#F3F4F6' },
  9:  { bg: '#3A3A44', text: '#F9FAFB' },
  10: { bg: '#424250', text: '#FFFFFF' },
}

export function GenBadge({ gen }: { gen: number }) {
  const c = GEN_COLORS[gen] ?? GEN_COLORS[1]
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.text}22`,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      G{gen}
    </span>
  )
}
