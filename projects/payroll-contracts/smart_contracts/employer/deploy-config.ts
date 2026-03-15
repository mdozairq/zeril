import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { EmployerFactory } from '../artifacts/employer/EmployerClient'

// Testnet USDC ASA ID
const TESTNET_USDC_ASSET_ID = 10458941n

export async function deploy() {
  console.log('=== Deploying Employer Payroll Contract to TestNet ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  console.log(`Deployer address: ${deployer.addr}`)

  // Check deployer balance
  const info = await algorand.account.getInformation(deployer.addr)
  console.log(`Deployer balance: ${info.balance} microAlgo`)

  const factory = algorand.client.getTypedAppFactory(EmployerFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  console.log(`Deploy operation: ${result.operationPerformed}`)

  // Fund app account for MBR (asset opt-in + boxes)
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
    console.log('Funded app account with 1 ALGO for MBR')
  }

  // Initialize with testnet USDC
  try {
    await appClient.send.initialize({
      args: { usdcAsset: TESTNET_USDC_ASSET_ID },
    })
    console.log(`Initialized contract with USDC asset ID: ${TESTNET_USDC_ASSET_ID}`)
  } catch (e) {
    console.log('Initialize skipped (likely already initialized)')
  }

  // Bootstrap: opt contract into USDC
  try {
    const mbrPayTxn = await algorand.createTransaction.payment({
      sender: deployer.addr,
      receiver: appClient.appAddress,
      amount: (0.1).algo(),
    })

    await appClient.send.bootstrap({
      args: { mbrPayment: mbrPayTxn },
      populateAppCallResources: true,
      maxFee: (3000).microAlgo(),
      coverAppCallInnerTransactionFees: true,
    })
    console.log('Contract bootstrapped (opted into USDC)')
  } catch (e) {
    console.log('Bootstrap skipped (likely already bootstrapped)')
  }

  console.log(`\n=== Deployment Complete ===`)
  console.log(`App ID: ${appClient.appClient.appId}`)
  console.log(`App Address: ${appClient.appAddress}`)
  console.log(`USDC Asset ID: ${TESTNET_USDC_ASSET_ID}`)
  console.log(`\nNext steps:`)
  console.log(`1. Fund the contract with testnet USDC to pay employees`)
  console.log(`2. Connect the frontend to App ID ${appClient.appClient.appId}`)
}
