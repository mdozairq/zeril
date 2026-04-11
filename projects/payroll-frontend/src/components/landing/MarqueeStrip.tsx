const items = [
  'USDC PAYMENTS',
  'SMART CONTRACTS',
  'ON-CHAIN REGISTRY',
  'INSTANT SETTLEMENT',
  'FULLY TRANSPARENT',
  'ALGORAND',
  'OPEN SOURCE',
  'ZERO INTERMEDIARIES',
]

export default function MarqueeStrip() {
  const row = items.map((item, i) => (
    <span key={i} className="flex items-center gap-8 px-4">
      <span className="text-[13px] font-medium tracking-[0.2em] whitespace-nowrap" style={{ color: 'rgba(250,250,247,0.35)' }}>
        {item}
      </span>
      <span className="text-[8px]" style={{ color: 'rgba(250,250,247,0.15)' }}>&#9679;</span>
    </span>
  ))

  return (
    <div
      className="overflow-hidden py-4 border-y"
      style={{
        backgroundColor: '#050505',
        color: 'var(--l-light)',
        borderColor: 'var(--l-border)',
      }}
    >
      <div className="marquee-track">
        <div className="flex shrink-0">{row}</div>
        <div className="flex shrink-0">{row}</div>
      </div>
    </div>
  )
}
