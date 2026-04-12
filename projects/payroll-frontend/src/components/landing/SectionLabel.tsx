export default function SectionLabel({ number }: { number: string }) {
  return (
    <div className="flex items-center gap-4 mb-10">
      <span
        className="font-mono text-[13px] tracking-wider shrink-0"
        style={{ color: 'var(--l-muted)' }}
      >
        {number}
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: 'var(--l-border)' }} />
    </div>
  )
}
