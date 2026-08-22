const PAGE_SIZE = 1000

type RangeQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
}

export async function fetchAllRows<T>(query: RangeQuery<T>): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}
