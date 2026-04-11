import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import SectionLabel from './SectionLabel'

const codeLines = [
  { text: 'import { Contract, GlobalState, BoxMap, Account, Asset,', type: 'keyword' },
  { text: '         Txn, assert, Uint64, itxn } from', type: 'keyword' },
  { text: "  '@algorandfoundation/algorand-typescript'", type: 'string' },
  { text: '', type: 'blank' },
  { text: 'export class Employer extends Contract {', type: 'keyword' },
  { text: '  employer = GlobalState<Account>()', type: 'default' },
  { text: '  usdcAssetId = GlobalState<Asset>()', type: 'default' },
  { text: "  employees = BoxMap<Account, EmployeeRecord>({ keyPrefix: 'emp' })", type: 'default' },
  { text: '', type: 'blank' },
  { text: '  public initialize(usdcAsset: Asset): void {', type: 'function' },
  { text: "    assert(!this.employer.hasValue, 'Already initialized')", type: 'default' },
  { text: '    this.employer.value = Txn.sender', type: 'default' },
  { text: '    this.usdcAssetId.value = usdcAsset', type: 'default' },
  { text: '  }', type: 'keyword' },
  { text: '', type: 'blank' },
  { text: '  public payEmployee(employee: Account): void {', type: 'function' },
  { text: '    assert(Txn.sender === this.employer.value)', type: 'default' },
  { text: '    const salary = this.employees(employee).value.salaryUsdcMicrounits', type: 'default' },
  { text: '', type: 'blank' },
  { text: '    itxn.assetTransfer({', type: 'keyword' },
  { text: '      assetReceiver: employee,', type: 'default' },
  { text: '      xferAsset: this.usdcAssetId.value,', type: 'default' },
  { text: '      assetAmount: salary,', type: 'default' },
  { text: '      fee: 0,', type: 'default' },
  { text: '    }).submit()', type: 'keyword' },
  { text: '  }', type: 'keyword' },
  { text: '}', type: 'keyword' },
]

const colorMap: Record<string, string> = {
  keyword: '#D4D4D4',
  string: '#9CA3AF',
  function: '#E5E5E5',
  default: '#6B7280',
  blank: 'transparent',
}

export default function DeveloperSection() {
  return (
    <section id="developers" className="px-6 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel number="05" />

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light mb-8">
              <span className="block leading-none">TypeScript contracts</span>
              <span className="block font-serif italic leading-none mt-3 lg:mt-5">you can actually read.</span>
            </h2>
            <p className="text-[15px] leading-relaxed mb-6" style={{ color: 'var(--l-muted)' }}>
              Built with Algorand TypeScript and AlgoKit. React frontend. Vitest for testing.
              The entire codebase is open source — fork it, extend it, make it yours.
            </p>
            <p className="font-mono text-[13px] mb-10" style={{ color: 'var(--l-muted)', opacity: 0.5 }}>
              // Yes, we could have used Solidity. We chose happiness instead.
            </p>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-[14px] font-semibold transition-opacity hover:opacity-60"
              style={{ color: 'var(--l-fg)' }}
            >
              View on GitHub
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#111111', border: '1px solid rgba(250,250,247,0.06)', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6)' }}>
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(250,250,247,0.15)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(250,250,247,0.15)' }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'rgba(250,250,247,0.15)' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-md" style={{ backgroundColor: 'rgba(250,250,247,0.04)' }}>
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(250,250,247,0.2)' }} />
                  <span className="font-mono text-[11px]" style={{ color: 'rgba(250,250,247,0.35)' }}>contract.algo.ts</span>
                </div>
                <span className="font-mono text-[10px]" style={{ color: 'rgba(250,250,247,0.2)' }}>UTF-8</span>
              </div>

              {/* Code */}
              <div className="overflow-x-auto">
                <div className="py-4 min-w-max">
                  {codeLines.map((line, i) => (
                    <div key={i} className="flex font-mono text-[12px] sm:text-[13px] leading-[1.85] group">
                      <span className="w-12 text-right pr-4 shrink-0 select-none" style={{ color: 'rgba(250,250,247,0.15)' }}>{i + 1}</span>
                      <span className="flex-1 pr-5 transition-colors duration-150 group-hover:bg-white/[0.02]" style={{ color: colorMap[line.type] }}>
                        {line.text || '\u00A0'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-5 py-2 font-mono text-[10px]" style={{ backgroundColor: 'rgba(250,250,247,0.04)', color: 'rgba(250,250,247,0.4)', borderTop: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="flex items-center gap-4">
                  <span>main</span>
                  <span>Ln 27, Col 1</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Spaces: 2</span>
                  <span>Algorand TypeScript</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
