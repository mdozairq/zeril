import { useState, useCallback } from 'react'
import { EmployerClient, EmployeeRecord } from '../contracts/Employer'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

export interface Employee {
  address: string
  salary: bigint
  isActive: boolean
  lastPaidRound: bigint
  optedIntoUsdc: boolean
}

function recordToEmployee(address: string, record: EmployeeRecord, optedIn: boolean): Employee {
  return {
    address,
    salary: record.salaryUsdcMicrounits,
    isActive: record.isActive === 1n,
    lastPaidRound: record.lastPaidRound,
    optedIntoUsdc: optedIn,
  }
}

async function checkUsdcOptIn(algorand: AlgorandClient, address: string, usdcAssetId: bigint): Promise<boolean> {
  if (usdcAssetId === 0n) return false
  try {
    const info = await algorand.account.getInformation(address)
    return info.assets?.some((a) => a.assetId === usdcAssetId) ?? false
  } catch {
    return false
  }
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEmployees = useCallback(async (client: EmployerClient, algorand?: AlgorandClient, usdcAssetId?: bigint) => {
    setLoading(true)
    try {
      const boxMap = await client.state.box.employees.getMap()
      const result: Employee[] = []
      for (const [address, record] of boxMap) {
        let optedIn = false
        if (algorand && usdcAssetId && usdcAssetId > 0n) {
          optedIn = await checkUsdcOptIn(algorand, address, usdcAssetId)
        }
        result.push(recordToEmployee(address, record, optedIn))
      }
      setEmployees(result)
      return result
    } catch {
      setEmployees([])
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const activeEmployees = employees.filter((e) => e.isActive)

  return {
    employees,
    activeEmployees,
    loading,
    fetchEmployees,
  }
}
