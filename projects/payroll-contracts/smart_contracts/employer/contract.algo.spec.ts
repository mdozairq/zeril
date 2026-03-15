import { Uint64 } from '@algorandfoundation/algorand-typescript'
import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { afterEach, describe, expect, it } from 'vitest'
import { Employer } from './contract.algo'

describe('Employer contract unit tests', () => {
  const ctx = new TestExecutionContext()

  afterEach(() => {
    ctx.reset()
  })

  it('initializes global state correctly', () => {
    const contract = ctx.contract.create(Employer)
    const asset = ctx.any.asset()

    contract.initialize(asset)

    expect(contract.employeeCount.value).toStrictEqual(Uint64(0))
    expect(contract.totalPayrollRuns.value).toStrictEqual(Uint64(0))
    expect(contract.employer.hasValue).toBe(true)
    expect(contract.usdcAssetId.hasValue).toBe(true)
  })

  it('cannot initialize twice', () => {
    const contract = ctx.contract.create(Employer)
    const asset = ctx.any.asset()

    contract.initialize(asset)

    expect(() => contract.initialize(asset)).toThrow()
  })
})
