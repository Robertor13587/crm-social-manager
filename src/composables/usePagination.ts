import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface PaginationReturn<T> {
  page: Ref<number>
  pageSize: Ref<number>
  totalPages: ComputedRef<number>
  paged: ComputedRef<T[]>
  goTo: (n: number) => void
  next: () => void
  prev: () => void
  reset: () => void
}

/**
 * Client-side pagination over a reactive list.
 *
 * @param list  A computed or ref array (passed by reference — do NOT destructure)
 * @param defaultPageSize  Items per page (default 25)
 */
export function usePagination<T>(
  list: Ref<T[]> | ComputedRef<T[]>,
  defaultPageSize = 25
): PaginationReturn<T> {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const totalPages = computed(() => Math.max(1, Math.ceil(list.value.length / pageSize.value)))

  const paged = computed<T[]>(() => {
    const start = (page.value - 1) * pageSize.value
    return list.value.slice(start, start + pageSize.value)
  })

  const goTo = (n: number) => {
    page.value = Math.max(1, Math.min(totalPages.value, n))
  }
  const next = () => goTo(page.value + 1)
  const prev = () => goTo(page.value - 1)
  const reset = () => { page.value = 1 }

  return { page, pageSize, totalPages, paged, goTo, next, prev, reset }
}
