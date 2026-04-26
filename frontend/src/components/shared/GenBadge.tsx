'use client'

const GEN_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1:  { bg: 'rgba(96,165,250,0.15)',  text: '#60A5FA', border: 'rgba(96,165,250,0.35)'  },
  2:  { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA', border: 'rgba(167,139,250,0.35)' },
  3:  { bg: 'rgba(52,211,153,0.15)',  text: '#34D399', border: 'rgba(52,211,153,0.35)'  },
  4:  { bg: 'rgba(74,222,128,0.15)',  text: '#4ADE80', border: 'rgba(74,222,128,0.35)'  },
  5:  { bg: 'rgba(163,230,53,0.15)',  text: '#A3E635', border: 'rgba(163,230,53,0.35)'  },
  6:  { bg: 'rgba(250,204,21,0.15)',  text: '#FACC15', border: 'rgba(250,204,21,0.35)'  },
  7:  { bg: 'rgba(251,146,60,0.15)',  text: '#FB923C', border: 'rgba(251,146,60,0.35)'  },
  8:  { bg: 'rgba(248,113,113,0.15)', text: '#F87171', border: 'rgba(248,113,113,0.35)' },
  9:  { bg: 'rgba(232,121,249,0.15)', text: '#E879F9', border: 'rgba(232,121,249,0.35)' },
  10: { bg: 'rgba(245,158,11,0.2)',   text: '#F59E0B', border: 'rgba(245,158,11,0.4)'   },
}

export function GenBadge({ gen }: { gen: number }) {
  const c = GEN_COLORS[gen] ?? GEN_COLORS[1]
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      G{gen}
    </span>
  )
}
