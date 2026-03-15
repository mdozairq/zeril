const USDC_DECIMALS = 6
const USDC_FACTOR = 10 ** USDC_DECIMALS

export function microUnitsToUsdc(microunits: bigint | number): string {
  const val = Number(microunits) / USDC_FACTOR
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function usdcToMicroUnits(usdc: number): bigint {
  return BigInt(Math.round(usdc * USDC_FACTOR))
}

export function formatUsdcDisplay(microunits: bigint | number): string {
  return `$${microUnitsToUsdc(microunits)} USDC`
}
