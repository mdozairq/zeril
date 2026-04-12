const TINYMAN_API_V2 = 'https://mainnet.analytics.tinyman.org/api'
const TINYMAN_TESTNET_API = 'https://testnet.analytics.tinyman.org/api'

export interface SwapQuote {
  amountIn: number
  amountOut: number
  priceImpact: number
  rate: number
}

export async function getAlgoUsdcPrice(network: string): Promise<number> {
  try {
    const baseUrl = network === 'mainnet' ? TINYMAN_API_V2 : TINYMAN_TESTNET_API
    const algoAssetId = 0
    const usdcAssetId = network === 'mainnet' ? 31566704 : 10458941

    const res = await fetch(`${baseUrl}/v1/pools/?asset_1_id=${algoAssetId}&asset_2_id=${usdcAssetId}`)
    if (!res.ok) throw new Error('Failed to fetch pool')
    const data = await res.json()

    if (data.results && data.results.length > 0) {
      const pool = data.results[0]
      return parseFloat(pool.current_asset_2_price || '0')
    }

    return 0
  } catch {
    return 0
  }
}

export function calculateSwapAmounts(
  totalUsdcMicro: bigint,
  algoPercentage: number,
  algoPrice: number,
): { usdcAmount: bigint; algoAmount: number } {
  const usdcForAlgo = Number(totalUsdcMicro) * (algoPercentage / 100)
  const usdcRemaining = Number(totalUsdcMicro) - usdcForAlgo

  const algoAmount = algoPrice > 0 ? (usdcForAlgo / 1_000_000) / algoPrice : 0

  return {
    usdcAmount: BigInt(Math.round(usdcRemaining)),
    algoAmount,
  }
}
