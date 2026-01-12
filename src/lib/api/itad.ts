/**
 * IsThereAnyDeal API Client
 *
 * Documentation: https://docs.isthereanydeal.com/
 *
 * This client provides access to ITAD's game deal and pricing APIs.
 * Authentication uses an API key passed as a query parameter.
 *
 * For OAuth redirect URL in testing: http://localhost:3002/api/auth/callback/itad
 */

const ITAD_API_BASE = 'https://api.isthereanydeal.com'
const ITAD_API_KEY = process.env.ITAD_API_KEY || ''

interface ITADGamePrice {
  id: string
  historyLow: {
    all?: {
      price: number
      regular: number
      cut: number
      shop: { id: number; name: string }
      timestamp: number
    }
    y1?: {
      price: number
      regular: number
      cut: number
      shop: { id: number; name: string }
      timestamp: number
    }
    m3?: {
      price: number
      regular: number
      cut: number
      shop: { id: number; name: string }
      timestamp: number
    }
  }
  deals: Array<{
    shop: { id: number; name: string }
    price: {
      amount: number
      amountInt: number
      currency: string
    }
    regular: {
      amount: number
      amountInt: number
      currency: string
    }
    cut: number
    voucher?: string
    flag?: string
    drm: Array<{ id: number; name: string }>
    platforms: Array<{ id: number; name: string }>
    timestamp: number
    expiry?: number
    url: string
  }>
}

interface ITADSearchResult {
  id: string
  slug: string
  title: string
  type: string | null
  mature: boolean
}

interface ITADGameInfo {
  id: string
  slug: string
  title: string
  type: string | null
  mature: boolean
  assets?: {
    banner145?: string
    banner300?: string
    banner400?: string
    banner600?: string
    boxart?: string
    boxart2?: string
  }
  earlyAccess: boolean
  achievements: boolean
  tradingCards: boolean
  appid: number | null
  tags: string[]
  released?: string
  releaseDate?: string
  reviews?: {
    steam?: {
      perc_positive: number
      total: number
      text: string
      timestamp: number
    }
  }
}

/**
 * Search for games by title
 */
export async function searchGames(title: string, limit: number = 20): Promise<ITADSearchResult[]> {
  if (!ITAD_API_KEY) {
    console.warn('ITAD_API_KEY not configured')
    return []
  }

  try {
    const params = new URLSearchParams({
      key: ITAD_API_KEY,
      title,
      results: String(limit)
    })

    const response = await fetch(`${ITAD_API_BASE}/games/search/v1?${params}`)

    if (!response.ok) {
      console.error('ITAD search error:', response.status, await response.text())
      return []
    }

    const data = await response.json()
    return data || []
  } catch (error) {
    console.error('ITAD search error:', error)
    return []
  }
}

/**
 * Get game info by ITAD game ID
 */
export async function getGameInfo(gameId: string): Promise<ITADGameInfo | null> {
  if (!ITAD_API_KEY) {
    console.warn('ITAD_API_KEY not configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      key: ITAD_API_KEY,
      id: gameId
    })

    const response = await fetch(`${ITAD_API_BASE}/games/info/v2?${params}`)

    if (!response.ok) {
      console.error('ITAD game info error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('ITAD game info error:', error)
    return null
  }
}

/**
 * Get current prices for games
 */
export async function getGamePrices(
  gameIds: string[],
  options: {
    country?: string
    shops?: number[]
    dealsOnly?: boolean
  } = {}
): Promise<ITADGamePrice[]> {
  if (!ITAD_API_KEY) {
    console.warn('ITAD_API_KEY not configured')
    return []
  }

  if (gameIds.length === 0 || gameIds.length > 200) {
    console.warn('ITAD prices: must provide 1-200 game IDs')
    return []
  }

  try {
    const params = new URLSearchParams({
      key: ITAD_API_KEY,
      country: options.country || 'US'
    })

    if (options.dealsOnly) {
      params.set('deals', 'true')
    }

    if (options.shops) {
      options.shops.forEach(shop => params.append('shops', String(shop)))
    }

    const response = await fetch(`${ITAD_API_BASE}/games/prices/v3?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameIds)
    })

    if (!response.ok) {
      console.error('ITAD prices error:', response.status, await response.text())
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('ITAD prices error:', error)
    return []
  }
}

/**
 * Get price overview for games (includes historical lows and bundle info)
 */
export async function getGameOverview(
  gameIds: string[],
  options: { country?: string } = {}
): Promise<any[]> {
  if (!ITAD_API_KEY) {
    console.warn('ITAD_API_KEY not configured')
    return []
  }

  if (gameIds.length === 0 || gameIds.length > 200) {
    console.warn('ITAD overview: must provide 1-200 game IDs')
    return []
  }

  try {
    const params = new URLSearchParams({
      key: ITAD_API_KEY,
      country: options.country || 'US'
    })

    const response = await fetch(`${ITAD_API_BASE}/games/overview/v2?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameIds)
    })

    if (!response.ok) {
      console.error('ITAD overview error:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('ITAD overview error:', error)
    return []
  }
}

/**
 * Get current deals with filtering options
 */
export async function getDeals(options: {
  offset?: number
  limit?: number
  sort?: 'time:asc' | 'time:desc' | 'price:asc' | 'price:desc' | 'cut:asc' | 'cut:desc' | 'expiry:asc' | 'expiry:desc'
  nondeals?: boolean
  mature?: boolean
  shops?: number[]
  filter?: string
  country?: string
} = {}): Promise<{ list: any[]; count: number; urls: any } | null> {
  if (!ITAD_API_KEY) {
    console.warn('ITAD_API_KEY not configured')
    return null
  }

  try {
    const params = new URLSearchParams({
      key: ITAD_API_KEY,
      offset: String(options.offset || 0),
      limit: String(options.limit || 20),
      sort: options.sort || 'time:desc',
      country: options.country || 'US'
    })

    if (options.nondeals !== undefined) {
      params.set('nondeals', String(options.nondeals))
    }
    if (options.mature !== undefined) {
      params.set('mature', String(options.mature))
    }
    if (options.filter) {
      params.set('filter', options.filter)
    }
    if (options.shops) {
      options.shops.forEach(shop => params.append('shops', String(shop)))
    }

    const response = await fetch(`${ITAD_API_BASE}/deals/v2?${params}`)

    if (!response.ok) {
      console.error('ITAD deals error:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('ITAD deals error:', error)
    return null
  }
}

/**
 * Get historical low prices for games
 */
export async function getHistoricalLow(
  gameIds: string[],
  options: { country?: string; shops?: number[] } = {}
): Promise<any[]> {
  if (!ITAD_API_KEY) {
    console.warn('ITAD_API_KEY not configured')
    return []
  }

  if (gameIds.length === 0 || gameIds.length > 200) {
    return []
  }

  try {
    const params = new URLSearchParams({
      key: ITAD_API_KEY,
      country: options.country || 'US'
    })

    if (options.shops) {
      options.shops.forEach(shop => params.append('shops', String(shop)))
    }

    const response = await fetch(`${ITAD_API_BASE}/games/historylow/v1?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameIds)
    })

    if (!response.ok) {
      console.error('ITAD historical low error:', response.status)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error('ITAD historical low error:', error)
    return []
  }
}

/**
 * Match a game title to an ITAD game ID
 * This is useful for finding the ITAD ID from a game we have from another source (e.g., IGDB)
 */
export async function findGameByTitle(title: string): Promise<string | null> {
  const results = await searchGames(title, 5)

  if (results.length === 0) {
    return null
  }

  // Try to find exact match first
  const exactMatch = results.find(
    r => r.title.toLowerCase() === title.toLowerCase()
  )

  if (exactMatch) {
    return exactMatch.id
  }

  // Return first result as best guess
  return results[0]?.id || null
}

/**
 * Get deals for a game by title
 * This combines search + price fetching for convenience
 */
export async function getDealsForGameTitle(
  title: string,
  options: { country?: string } = {}
): Promise<{
  gameId: string | null
  deals: Array<{
    store: string
    price: number
    msrp: number
    discountPercent: number
    url: string
    drm: string[]
    platforms: string[]
    expiresAt?: Date
  }>
  historicalLow?: {
    price: number
    store: string
    date?: Date
  }
}> {
  try {
    const gameId = await findGameByTitle(title)

    if (!gameId) {
      console.log('ITAD: No game found for title:', title)
      return { gameId: null, deals: [] }
    }

    console.log('ITAD: Found game ID:', gameId, 'for title:', title)

    const prices = await getGamePrices([gameId], {
      country: options.country,
      dealsOnly: false
    })

    console.log('ITAD: Prices response:', JSON.stringify(prices).slice(0, 500))

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      console.log('ITAD: No prices returned')
      return { gameId, deals: [] }
    }

    const priceData = prices[0]

    if (!priceData || !priceData.deals || !Array.isArray(priceData.deals)) {
      console.log('ITAD: No deals in price data')
      return { gameId, deals: [] }
    }

    const deals = priceData.deals
      .filter(deal => deal && deal.shop && deal.price && deal.regular)
      .map(deal => ({
        store: deal.shop?.name || 'Unknown Store',
        price: deal.price?.amount || 0,
        msrp: deal.regular?.amount || 0,
        discountPercent: deal.cut || 0,
        url: deal.url || '',
        drm: Array.isArray(deal.drm) ? deal.drm.map(d => d?.name || 'Unknown').filter(Boolean) : [],
        platforms: Array.isArray(deal.platforms) ? deal.platforms.map(p => p?.name || 'Unknown').filter(Boolean) : [],
        expiresAt: deal.expiry ? new Date(deal.expiry * 1000) : undefined
      }))

    // Handle the historical low - ITAD API v3 has different structure
    // historyLow.all contains {amount, amountInt, currency} not {price, shop, timestamp}
    let historicalLow: { price: number; store: string; date?: Date } | undefined
    if (priceData.historyLow?.all) {
      const histAll = priceData.historyLow.all as any
      historicalLow = {
        price: histAll.amount || histAll.price || 0,
        store: histAll.shop?.name || 'Best Historical Price',
        date: histAll.timestamp ? new Date(histAll.timestamp * 1000) : undefined
      }
    }

    console.log('ITAD: Returning', deals.length, 'deals')
    return { gameId, deals, historicalLow }
  } catch (error) {
    console.error('ITAD getDealsForGameTitle error:', error)
    return { gameId: null, deals: [] }
  }
}

// Export types for use elsewhere
export type { ITADGamePrice, ITADSearchResult, ITADGameInfo }
