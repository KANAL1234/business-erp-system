export function emitSoftRefresh() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('soft-refresh'))
}
