import { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { EmployerFactory, EmployerClient } from '../contracts/Employer'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const STORAGE_KEY = 'payroll_contract'

interface PersistedState {
  appId: string
  usdcAssetId: string
}

function saveToStorage(appId: bigint, usdcAssetId: bigint) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    appId: appId.toString(),
    usdcAssetId: usdcAssetId.toString(),
  }))
}

function loadFromStorage(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export interface PayrollContractState {
  appId: bigint | null
  appAddress: string | null
  client: EmployerClient | null
  isInitialized: boolean
  isBootstrapped: boolean
  usdcAssetId: bigint
  employerAddress: string | null
}

export function usePayrollContract() {
  const { transactionSigner, activeAddress } = useWallet()
  const [state, setState] = useState<PayrollContractState>({
    appId: null,
    appAddress: null,
    client: null,
    isInitialized: false,
    isBootstrapped: false,
    usdcAssetId: 0n,
    employerAddress: null,
  })
  const [loading, setLoading] = useState(false)
  const autoDiscoveryDone = useRef(false)

  const getAlgorand = useCallback(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return algorand
  }, [transactionSigner])

  // Check contract status by reading global state + asset holdings
  const checkContractStatus = useCallback(
    async (client: EmployerClient) => {
      try {
        const globalState = await client.state.global.getAll()
        const initialized = globalState.employer !== undefined
        const employerAddress = globalState.employer?.toString() ?? null
        const usdcAssetId = globalState.usdcAssetId ?? 0n
        let bootstrapped = false

        if (initialized && usdcAssetId > 0n) {
          try {
            const algorand = getAlgorand()
            const info = await algorand.account.getInformation(client.appAddress)
            bootstrapped = info.assets?.some((a) => a.assetId === usdcAssetId) ?? false
          } catch {
            bootstrapped = false
          }
        }

        return { initialized, bootstrapped, usdcAssetId, employerAddress }
      } catch {
        return { initialized: false, bootstrapped: false, usdcAssetId: 0n, employerAddress: null }
      }
    },
    [getAlgorand],
  )

  // Auto-discover existing contract on wallet connect / page refresh
  useEffect(() => {
    if (!activeAddress || autoDiscoveryDone.current || state.client) return
    autoDiscoveryDone.current = true

    const discover = async () => {
      setLoading(true)
      try {
        const algorand = getAlgorand()

        // First try localStorage for a previously connected contract
        const persisted = loadFromStorage()
        if (persisted) {
          try {
            const appId = BigInt(persisted.appId)
            const client = algorand.client.getTypedAppClientById(EmployerClient, {
              appId,
              defaultSender: activeAddress,
            })
            const status = await checkContractStatus(client)
            const usdcAssetId = status.usdcAssetId > 0n ? status.usdcAssetId : BigInt(persisted.usdcAssetId || '0')

            setState({
              appId,
              appAddress: client.appAddress.toString(),
              client,
              isInitialized: status.initialized,
              isBootstrapped: status.bootstrapped,
              usdcAssetId,
              employerAddress: status.employerAddress,
            })
            return
          } catch {
            // Persisted app no longer valid, try factory lookup
          }
        }

        // Fall back to factory lookup by creator + app name
        try {
          const factory = algorand.client.getTypedAppFactory(EmployerFactory, {
            defaultSender: activeAddress,
          })
          // deploy is idempotent — if an app already exists for this creator+name
          // it returns it with operationPerformed === 'nothing'
          const { appClient, result } = await factory.deploy({
            onUpdate: 'append',
            onSchemaBreak: 'append',
          })

          // Only auto-connect if it found an existing app (not a fresh create)
          if (result.operationPerformed === 'nothing') {
            const status = await checkContractStatus(appClient)
            if (status.usdcAssetId > 0n) {
              saveToStorage(appClient.appId, status.usdcAssetId)
            }
            setState({
              appId: appClient.appId,
              appAddress: appClient.appAddress.toString(),
              client: appClient,
              isInitialized: status.initialized,
              isBootstrapped: status.bootstrapped,
              usdcAssetId: status.usdcAssetId,
              employerAddress: status.employerAddress,
            })
          }
        } catch {
          // No existing contract found — user needs to deploy
        }
      } finally {
        setLoading(false)
      }
    }

    discover()
  }, [activeAddress, getAlgorand, checkContractStatus, state.client])

  // Reset auto-discovery when wallet changes
  useEffect(() => {
    if (!activeAddress) {
      autoDiscoveryDone.current = false
      setState({
        appId: null,
        appAddress: null,
        client: null,
        isInitialized: false,
        isBootstrapped: false,
        usdcAssetId: 0n,
        employerAddress: null,
      })
    }
  }, [activeAddress])

  const deploy = useCallback(async () => {
    if (!activeAddress) throw new Error('Wallet not connected')
    setLoading(true)
    try {
      const algorand = getAlgorand()
      const factory = algorand.client.getTypedAppFactory(EmployerFactory, {
        defaultSender: activeAddress,
      })

      const { appClient, result } = await factory.deploy({
        onUpdate: 'append',
        onSchemaBreak: 'append',
      })

      if (['create', 'replace'].includes(result.operationPerformed)) {
        await algorand.send.payment({
          amount: (1).algo(),
          sender: activeAddress,
          receiver: appClient.appAddress,
        })
      }

      setState({
        appId: appClient.appId,
        appAddress: appClient.appAddress.toString(),
        client: appClient,
        isInitialized: false,
        isBootstrapped: false,
        usdcAssetId: 0n,
        employerAddress: null,
      })
      return appClient
    } finally {
      setLoading(false)
    }
  }, [activeAddress, getAlgorand])

  const connectToExisting = useCallback(
    async (appId: bigint) => {
      if (!activeAddress) throw new Error('Wallet not connected')
      const algorand = getAlgorand()
      const client = algorand.client.getTypedAppClientById(EmployerClient, {
        appId,
        defaultSender: activeAddress,
      })

      const status = await checkContractStatus(client)

      if (status.usdcAssetId > 0n) {
        saveToStorage(appId, status.usdcAssetId)
      }

      setState({
        appId,
        appAddress: client.appAddress.toString(),
        client,
        isInitialized: status.initialized,
        isBootstrapped: status.bootstrapped,
        usdcAssetId: status.usdcAssetId,
        employerAddress: status.employerAddress,
      })
      return client
    },
    [activeAddress, getAlgorand, checkContractStatus],
  )

  const initialize = useCallback(
    async (usdcAssetId: bigint) => {
      if (!state.client || !activeAddress) throw new Error('Contract not deployed')
      setLoading(true)
      try {
        await state.client.send.initialize({
          args: { usdcAsset: usdcAssetId },
        })
        saveToStorage(state.appId!, usdcAssetId)
        setState((prev) => ({ ...prev, isInitialized: true, usdcAssetId, employerAddress: activeAddress }))
      } finally {
        setLoading(false)
      }
    },
    [state.client, state.appId, activeAddress],
  )

  const bootstrap = useCallback(async () => {
    if (!state.client || !activeAddress) throw new Error('Contract not deployed')
    setLoading(true)
    try {
      const algorand = getAlgorand()
      const mbrPayTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: state.client.appAddress,
        amount: (0.1).algo(),
      })

      await state.client.send.bootstrap({
        args: { mbrPayment: mbrPayTxn },
        populateAppCallResources: true,
        maxFee: (3000).microAlgo(),
        coverAppCallInnerTransactionFees: true,
      })
      setState((prev) => ({ ...prev, isBootstrapped: true }))
    } finally {
      setLoading(false)
    }
  }, [state.client, activeAddress, getAlgorand])

  const addEmployee = useCallback(
    async (employeeAddress: string, salaryMicroUnits: bigint) => {
      if (!state.client || !activeAddress) throw new Error('Contract not deployed')
      if (!state.isInitialized) throw new Error('Contract not initialized. Go to Settings to initialize first.')
      setLoading(true)
      try {
        const algorand = getAlgorand()
        const mbrPayTxn = await algorand.createTransaction.payment({
          sender: activeAddress,
          receiver: state.client.appAddress,
          amount: (0.1).algo(),
        })

        await state.client.send.addEmployee({
          args: { employee: employeeAddress, salary: salaryMicroUnits, mbrPay: mbrPayTxn },
          populateAppCallResources: true,
        })
      } finally {
        setLoading(false)
      }
    },
    [state.client, state.isInitialized, activeAddress, getAlgorand],
  )

  const removeEmployee = useCallback(
    async (employeeAddress: string) => {
      if (!state.client || !activeAddress) throw new Error('Contract not deployed')
      setLoading(true)
      try {
        await state.client.send.removeEmployee({
          args: { employee: employeeAddress },
          populateAppCallResources: true,
        })
      } finally {
        setLoading(false)
      }
    },
    [state.client, activeAddress],
  )

  const updateSalary = useCallback(
    async (employeeAddress: string, newSalary: bigint) => {
      if (!state.client || !activeAddress) throw new Error('Contract not deployed')
      setLoading(true)
      try {
        await state.client.send.updateSalary({
          args: { employee: employeeAddress, newSalary },
          populateAppCallResources: true,
        })
      } finally {
        setLoading(false)
      }
    },
    [state.client, activeAddress],
  )

  const payEmployee = useCallback(
    async (employeeAddress: string) => {
      if (!state.client || !activeAddress) throw new Error('Contract not deployed')
      setLoading(true)
      try {
        await state.client.send.payEmployee({
          args: { employee: employeeAddress },
          populateAppCallResources: true,
          maxFee: (3000).microAlgo(),
          coverAppCallInnerTransactionFees: true,
        })
      } finally {
        setLoading(false)
      }
    },
    [state.client, activeAddress],
  )

  // Admin check: either contract is not yet initialized (deployer is setting up),
  // or the connected wallet matches the employer stored in global state
  const isAdmin = !state.isInitialized || (state.employerAddress !== null && state.employerAddress === activeAddress)

  return {
    ...state,
    loading,
    isAdmin,
    deploy,
    connectToExisting,
    initialize,
    bootstrap,
    addEmployee,
    removeEmployee,
    updateSalary,
    payEmployee,
    getAlgorand,
  }
}
