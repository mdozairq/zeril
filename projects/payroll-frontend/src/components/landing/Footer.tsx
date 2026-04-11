export default function Footer() {
  return (
    <footer className="px-6 pb-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="h-px w-full mb-8" style={{ backgroundColor: 'var(--l-border)' }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 flex items-center justify-center"
              style={{ backgroundColor: 'var(--l-accent)' }}
            >
              <span className="text-white font-mono text-[8px] font-medium">PR</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight">
              Pay<span className="font-serif italic">Roll</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] transition-opacity hover:opacity-60"
              style={{ color: 'var(--l-muted)' }}
            >
              GitHub
            </a>
            <a
              href="https://algorand.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] transition-opacity hover:opacity-60"
              style={{ color: 'var(--l-muted)' }}
            >
              Algorand
            </a>
            <a
              href="#"
              className="text-[13px] transition-opacity hover:opacity-60"
              style={{ color: 'var(--l-muted)' }}
            >
              Docs
            </a>
          </div>

          {/* Copyright */}
          <span className="text-[12px]" style={{ color: 'var(--l-muted)', opacity: 0.5 }}>
            {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  )
}
