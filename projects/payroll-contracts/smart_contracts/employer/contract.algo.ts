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
}

export class Employer extends Contract {
  // Global state
  employer = GlobalState<Account>()
  usdcAssetId = GlobalState<Asset>()
  employeeCount = GlobalState<uint64>({ initialValue: Uint64(0) })
  totalPayrollRuns = GlobalState<uint64>({ initialValue: Uint64(0) })

  // Box storage for employee registry
  employees = BoxMap<Account, EmployeeRecord>({ keyPrefix: 'emp' })

  /**
   * Initialize the contract with employer and USDC asset.
   * Can only be called once (when employer is not yet set).
   */
  public initialize(usdcAsset: Asset): void {
    assert(!this.employer.hasValue, 'Already initialized')
    this.employer.value = Txn.sender
    this.usdcAssetId.value = usdcAsset
  }

  /**
   * Opts the contract into the USDC ASA.
   * Requires a payment to cover the MBR for the asset opt-in.
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

  /**
   * Register a new employee with their salary.
   * Requires a payment to cover box MBR.
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
    }
    this.employees(employee).value = clone(record)
    this.employeeCount.value = this.employeeCount.value + 1
  }

  /**
   * Soft-delete an employee (set isActive = 0)
   */
  public removeEmployee(employee: Account): void {
    assert(Txn.sender === this.employer.value, 'Only employer can remove employees')
    assert(this.employees(employee).exists, 'Employee does not exist')

    this.employees(employee).value.isActive = Uint64(0)
    this.employeeCount.value = this.employeeCount.value - 1
  }

  /**
   * Update an employee's salary
   */
  public updateSalary(employee: Account, newSalary: uint64): void {
    assert(Txn.sender === this.employer.value, 'Only employer can update salary')
    assert(this.employees(employee).exists, 'Employee does not exist')

    this.employees(employee).value.salaryUsdcMicrounits = newSalary
  }

  /**
   * Pay a single employee their salary in USDC via inner transaction.
   * Employee must have opted into USDC ASA before receiving payment.
   */
  public payEmployee(employee: Account): void {
    assert(Txn.sender === this.employer.value, 'Only employer can pay employees')
    assert(this.employees(employee).exists, 'Employee does not exist')
    assert(this.employees(employee).value.isActive === Uint64(1), 'Employee is not active')

    const salary = this.employees(employee).value.salaryUsdcMicrounits

    itxn
      .assetTransfer({
        assetReceiver: employee,
        xferAsset: this.usdcAssetId.value,
        assetAmount: salary,
        fee: 0,
      })
      .submit()

    this.employees(employee).value.lastPaidRound = Global.round
    this.totalPayrollRuns.value = this.totalPayrollRuns.value + 1
  }

  /**
   * Readonly getter for employee data
   */
  @readonly
  public getEmployee(employee: Account): EmployeeRecord {
    assert(this.employees(employee).exists, 'Employee does not exist')
    return this.employees(employee).value
  }
}
