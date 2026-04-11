import {
  Contract,
  GlobalState,
  BoxMap,
  Account,
  Asset,
  Txn,
  Global,
  assert,
  Uint64,
  itxn,
  gtxn,
  readonly,
  clone,
} from '@algorandfoundation/algorand-typescript'
import type { uint64 } from '@algorandfoundation/algorand-typescript'

type EmployeeRecord = {
  salaryUsdcMicrounits: uint64
  isActive: uint64
  lastPaidRound: uint64
  usdcPercentage: uint64 // 0–100: portion paid in USDC. Remainder paid in ALGO.
}

export class Employer extends Contract {
  // ── Global state ──
  employer = GlobalState<Account>()
  usdcAssetId = GlobalState<Asset>()
  employeeCount = GlobalState<uint64>({ initialValue: Uint64(0) })
  totalPayrollRuns = GlobalState<uint64>({ initialValue: Uint64(0) })

  // ── Box storage ──
  employees = BoxMap<Account, EmployeeRecord>({ keyPrefix: 'emp' })
  algoReceivers = BoxMap<Account, Account>({ keyPrefix: 'rcv' }) // alt wallet for ALGO portion

  // ────────────────────────────────────────────────────────────
  // Admin setup
  // ────────────────────────────────────────────────────────────

  /**
   * Initialize the contract. Sets caller as employer and stores the
   * USDC asset ID used for payroll.  Can only be called once.
   */
  public initialize(usdcAsset: Asset): void {
    assert(!this.employer.hasValue, 'Already initialized')
    this.employer.value = Txn.sender
    this.usdcAssetId.value = usdcAsset
  }

  /**
   * Opt the contract into USDC so it can hold and send the asset.
   * A payment covering the minimum-balance increase must be attached.
   */
  public bootstrap(mbrPayment: gtxn.PaymentTxn): void {
    assert(Txn.sender === this.employer.value, 'Only employer can bootstrap')
    assert(
      mbrPayment.receiver === Global.currentApplicationAddress,
      'MBR payment must be sent to the app',
    )

    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        xferAsset: this.usdcAssetId.value,
        assetAmount: 0,
        fee: 0,
      })
      .submit()
  }

  // ────────────────────────────────────────────────────────────
  // Employee registry (employer only)
  // ────────────────────────────────────────────────────────────

  /**
   * Register a new employee.  Default allocation = 100 % USDC.
   */
  public addEmployee(employee: Account, salary: uint64, mbrPay: gtxn.PaymentTxn): void {
    assert(Txn.sender === this.employer.value, 'Only employer can add employees')
    assert(
      mbrPay.receiver === Global.currentApplicationAddress,
      'MBR payment must be sent to the app',
    )
    assert(!this.employees(employee).exists, 'Employee already exists')

    const record: EmployeeRecord = {
      salaryUsdcMicrounits: salary,
      isActive: Uint64(1),
      lastPaidRound: Uint64(0),
      usdcPercentage: Uint64(100),
    }
    this.employees(employee).value = clone(record)
    this.employeeCount.value = this.employeeCount.value + 1
  }

  /**
   * Soft-delete an employee (set isActive = 0).
   */
  public removeEmployee(employee: Account): void {
    assert(Txn.sender === this.employer.value, 'Only employer can remove employees')
    assert(this.employees(employee).exists, 'Employee does not exist')

    this.employees(employee).value.isActive = Uint64(0)
    this.employeeCount.value = this.employeeCount.value - 1
  }

  /**
   * Update an employee's monthly salary (in USDC micro-units).
   */
  public updateSalary(employee: Account, newSalary: uint64): void {
    assert(Txn.sender === this.employer.value, 'Only employer can update salary')
    assert(this.employees(employee).exists, 'Employee does not exist')

    this.employees(employee).value.salaryUsdcMicrounits = newSalary
  }

  // ────────────────────────────────────────────────────────────
  // Allocation (employee OR employer)
  // ────────────────────────────────────────────────────────────

  /**
   * Set the USDC / ALGO split for an employee.
   * `usdcPct` is 0–100.  The remainder is paid in ALGO.
   * Callable by the employee themselves or by the employer.
   */
  public setAllocation(employee: Account, usdcPct: uint64): void {
    assert(
      Txn.sender === employee || Txn.sender === this.employer.value,
      'Only employee or employer can set allocation',
    )
    assert(this.employees(employee).exists, 'Employee does not exist')
    assert(usdcPct <= Uint64(100), 'Percentage must be 0-100')

    this.employees(employee).value.usdcPercentage = usdcPct
  }

  /**
   * Set an alternate wallet address that receives the ALGO portion.
   * If not set the ALGO portion goes to the employee's primary address.
   * Requires an MBR payment for box creation on first call.
   */
  public setAlgoReceiver(
    employee: Account,
    receiver: Account,
    mbrPay: gtxn.PaymentTxn,
  ): void {
    assert(
      Txn.sender === employee || Txn.sender === this.employer.value,
      'Only employee or employer',
    )
    assert(this.employees(employee).exists, 'Employee does not exist')
    assert(
      mbrPay.receiver === Global.currentApplicationAddress,
      'MBR payment must be sent to the app',
    )

    this.algoReceivers(employee).value = receiver
  }

  // ────────────────────────────────────────────────────────────
  // Payroll execution
  // ────────────────────────────────────────────────────────────

  /**
   * Pay a single employee according to their allocation.
   *
   * `algoRate` = how many micro-ALGO equal 1 USDC (10^6 micro-units).
   * Example: if 1 ALGO = $0.20 ⇒ 1 USDC = 5 ALGO ⇒ pass 5_000_000.
   *
   * The contract sends:
   *   • USDC portion via inner asset-transfer to the employee address
   *   • ALGO portion via inner payment to algoReceiver (or employee)
   *
   * Employee must have opted into USDC before the USDC transfer.
   * The contract must hold enough ALGO for the ALGO portion.
   */
  public payEmployee(employee: Account, algoRate: uint64): void {
    assert(Txn.sender === this.employer.value, 'Only employer can pay employees')
    assert(this.employees(employee).exists, 'Employee does not exist')
    assert(this.employees(employee).value.isActive === Uint64(1), 'Employee is not active')

    const salary = this.employees(employee).value.salaryUsdcMicrounits
    const usdcPct = this.employees(employee).value.usdcPercentage

    // ── USDC portion ──
    const usdcAmount: uint64 = (salary * usdcPct) / Uint64(100)

    if (usdcAmount > Uint64(0)) {
      itxn
        .assetTransfer({
          assetReceiver: employee,
          xferAsset: this.usdcAssetId.value,
          assetAmount: usdcAmount,
          fee: 0,
        })
        .submit()
    }

    // ── ALGO portion ──
    const algoPct: uint64 = Uint64(100) - usdcPct
    if (algoPct > Uint64(0)) {
      assert(algoRate > Uint64(0), 'ALGO rate must be > 0 for split payments')

      const usdcForAlgo: uint64 = (salary * algoPct) / Uint64(100)
      // microALGO = usdcMicro × (microALGO per USDC) / 10^6
      const algoAmount: uint64 = (usdcForAlgo * algoRate) / Uint64(1_000_000)

      const receiver = this.algoReceivers(employee).exists
        ? this.algoReceivers(employee).value
        : employee

      itxn
        .payment({
          receiver: receiver,
          amount: algoAmount,
          fee: 0,
        })
        .submit()
    }

    this.employees(employee).value.lastPaidRound = Global.round
    this.totalPayrollRuns.value = this.totalPayrollRuns.value + 1
  }

  // ────────────────────────────────────────────────────────────
  // Read-only
  // ────────────────────────────────────────────────────────────

  @readonly
  public getEmployee(employee: Account): EmployeeRecord {
    assert(this.employees(employee).exists, 'Employee does not exist')
    return this.employees(employee).value
  }
}
