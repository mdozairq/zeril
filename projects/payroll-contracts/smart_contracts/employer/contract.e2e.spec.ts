import { Config } from '@algorandfoundation/algokit-utils'
import { registerDebugEventHandlers } from '@algorandfoundation/algokit-utils-debug'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { Address } from 'algosdk'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { EmployerFactory } from '../artifacts/employer/EmployerClient'

describe('Employer payroll contract', () => {
  const localnet = algorandFixture()

  beforeAll(() => {
    Config.configure({ debug: true })
    registerDebugEventHandlers()
  })
  beforeEach(localnet.newScope)

  const createMockUsdc = async (creator: Address) => {
    const result = await localnet.algorand.send.assetCreate({
      sender: creator,
      total: 10_000_000_000n,
      decimals: 6,
      assetName: 'USDC',
      unitName: 'USDC',
    })
    return result.assetId
  }

  const deployAndInit = async (account: Address, usdcAssetId: bigint) => {
    const factory = localnet.algorand.client.getTypedAppFactory(EmployerFactory, {
      defaultSender: account,
    })
    const { appClient } = await factory.deploy({
      onUpdate: 'append',
      onSchemaBreak: 'append',
    })

    // Fund app for MBR
    await localnet.algorand.send.payment({
      amount: (1).algo(),
      sender: account,
      receiver: appClient.appAddress,
    })

    // Initialize with USDC
    await appClient.send.initialize({
      args: { usdcAsset: usdcAssetId },
    })

    return { client: appClient }
  }

  const bootstrapContract = async (client: Awaited<ReturnType<typeof deployAndInit>>['client'], sender: Address) => {
    const mbrPayTxn = await localnet.algorand.createTransaction.payment({
      sender,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.bootstrap({
      args: { mbrPayment: mbrPayTxn },
      populateAppCallResources: true,
      maxFee: (3000).microAlgo(),
      coverAppCallInnerTransactionFees: true,
    })
  }

  const addEmployee = async (
    client: Awaited<ReturnType<typeof deployAndInit>>['client'],
    sender: Address,
    employee: Address,
    salary: bigint,
  ) => {
    const mbrPayTxn = await localnet.algorand.createTransaction.payment({
      sender,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await client.send.addEmployee({
      args: { employee: employee.toString(), salary, mbrPay: mbrPayTxn },
      populateAppCallResources: true,
    })
  }

  test('deploy, initialize, and bootstrap', async () => {
    const { testAccount } = localnet.context
    const usdcId = await createMockUsdc(testAccount)
    const { client } = await deployAndInit(testAccount, usdcId)

    await bootstrapContract(client, testAccount)

    const globalState = await client.state.global.getAll()
    expect(globalState.employeeCount).toBe(0n)
    expect(globalState.totalPayrollRuns).toBe(0n)
  })

  test('add employees and verify data', async () => {
    const { testAccount } = localnet.context
    const usdcId = await createMockUsdc(testAccount)
    const { client } = await deployAndInit(testAccount, usdcId)
    await bootstrapContract(client, testAccount)

    const emp1 = await localnet.algorand.account.random()
    const emp2 = await localnet.algorand.account.random()

    await addEmployee(client, testAccount, emp1.addr, 5_000_000_000n)
    await addEmployee(client, testAccount, emp2.addr, 3_000_000_000n)

    const globalState = await client.state.global.getAll()
    expect(globalState.employeeCount).toBe(2n)

    const emp1Data = await client.send.getEmployee({
      args: { employee: emp1.addr.toString() },
      populateAppCallResources: true,
    })

    const empRecord = emp1Data.return!
    expect(empRecord.salaryUsdcMicrounits).toBe(5_000_000_000n)
    expect(empRecord.isActive).toBe(1n)
    expect(empRecord.lastPaidRound).toBe(0n)
  })

  test('full payroll flow: add, fund, pay', async () => {
    const { testAccount } = localnet.context
    const usdcId = await createMockUsdc(testAccount)
    const { client } = await deployAndInit(testAccount, usdcId)
    await bootstrapContract(client, testAccount)

    const emp1 = await localnet.algorand.account.random()
    await localnet.algorand.send.payment({
      sender: testAccount,
      receiver: emp1.addr,
      amount: (0.5).algo(),
    })

    await addEmployee(client, testAccount, emp1.addr, 1_000_000_000n)

    // Fund contract with USDC
    await localnet.algorand.send.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: usdcId,
      amount: 5_000_000_000n,
    })

    // Employee opts into USDC
    await localnet.algorand.send.assetOptIn({
      sender: emp1.addr,
      assetId: usdcId,
    })

    // Pay employee
    await client.send.payEmployee({
      args: { employee: emp1.addr.toString() },
      populateAppCallResources: true,
      maxFee: (3000).microAlgo(),
      coverAppCallInnerTransactionFees: true,
    })

    // Verify employee received USDC
    const empAcctInfo = await localnet.algorand.account.getInformation(emp1.addr)
    const usdcHolding = empAcctInfo.assets?.find((a) => a.assetId === usdcId)
    expect(usdcHolding?.amount).toBe(1_000_000_000n)

    const globalState = await client.state.global.getAll()
    expect(globalState.totalPayrollRuns).toBe(1n)
  })

  test('remove employee prevents payment', async () => {
    const { testAccount } = localnet.context
    const usdcId = await createMockUsdc(testAccount)
    const { client } = await deployAndInit(testAccount, usdcId)
    await bootstrapContract(client, testAccount)

    const emp1 = await localnet.algorand.account.random()
    await localnet.algorand.send.payment({
      sender: testAccount,
      receiver: emp1.addr,
      amount: (0.5).algo(),
    })

    await addEmployee(client, testAccount, emp1.addr, 1_000_000_000n)

    await client.send.removeEmployee({
      args: { employee: emp1.addr.toString() },
      populateAppCallResources: true,
    })

    const globalState = await client.state.global.getAll()
    expect(globalState.employeeCount).toBe(0n)

    // Fund and opt-in for payment attempt
    await localnet.algorand.send.assetTransfer({
      sender: testAccount,
      receiver: client.appAddress,
      assetId: usdcId,
      amount: 5_000_000_000n,
    })
    await localnet.algorand.send.assetOptIn({
      sender: emp1.addr,
      assetId: usdcId,
    })

    await expect(
      client.send.payEmployee({
        args: { employee: emp1.addr.toString() },
        populateAppCallResources: true,
        maxFee: (3000).microAlgo(),
      coverAppCallInnerTransactionFees: true,
      }),
    ).rejects.toThrow()
  })

  test('update salary', async () => {
    const { testAccount } = localnet.context
    const usdcId = await createMockUsdc(testAccount)
    const { client } = await deployAndInit(testAccount, usdcId)
    await bootstrapContract(client, testAccount)

    const emp1 = await localnet.algorand.account.random()
    await addEmployee(client, testAccount, emp1.addr, 1_000_000_000n)

    await client.send.updateSalary({
      args: { employee: emp1.addr.toString(), newSalary: 2_000_000_000n },
      populateAppCallResources: true,
    })

    const empData = await client.send.getEmployee({
      args: { employee: emp1.addr.toString() },
      populateAppCallResources: true,
    })

    expect(empData.return!.salaryUsdcMicrounits).toBe(2_000_000_000n)
  })

  test('non-employer cannot add employees', async () => {
    const { testAccount } = localnet.context
    const usdcId = await createMockUsdc(testAccount)
    const { client } = await deployAndInit(testAccount, usdcId)

    const nonEmployer = await localnet.algorand.account.random()
    await localnet.algorand.send.payment({
      sender: testAccount,
      receiver: nonEmployer.addr,
      amount: (1).algo(),
    })

    const emp1 = await localnet.algorand.account.random()

    const mbrPayTxn = await localnet.algorand.createTransaction.payment({
      sender: nonEmployer.addr,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })

    await expect(
      client.send.addEmployee({
        args: { employee: emp1.addr.toString(), salary: 1_000_000_000n, mbrPay: mbrPayTxn },
        sender: nonEmployer.addr,
        populateAppCallResources: true,
      }),
    ).rejects.toThrow()
  })
})
