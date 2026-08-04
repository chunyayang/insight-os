import type { ApiListResponse, Customer } from '../../../app/types/api'

const DEFAULT_PAGE_SIZE = 20
/** A page is a UI unit, not a bulk-export hatch — a whole-list export needs its own route. */
const MAX_PAGE_SIZE = 100

/**
 * GET /api/customers — the reference implementation of the shared list contract.
 *
 * Every documented list param is honoured for real (page, pageSize, sort, order, q, market,
 * segment, status), because the point of this endpoint is to prove the table's server-side
 * sorting and pagination against something that can actually refuse to cooperate. A mock
 * that ignored `sort` would let a client-side sort masquerade as a working one.
 */
export default defineEventHandler(async (event): Promise<ApiListResponse<Customer>> => {
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE))
  const order = query.order === 'desc' ? 'desc' : query.order === 'asc' ? 'asc' : undefined

  await mockLatency('customers')

  const { rows, total } = queryCustomers(customerPool(), {
    page,
    pageSize,
    sort: query.sort as string | undefined,
    order,
    q: query.q as string | undefined,
    market: query.market as string | undefined,
    segment: query.segment as string | undefined,
    status: query.status as string | undefined,
  })

  return okList(rows, page, pageSize, total)
})
