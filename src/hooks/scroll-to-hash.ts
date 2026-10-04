import { useEffect } from 'preact/hooks'

/** Scrolls to the element named in the URL hash (/vendors#example-noodles) once the page renders. */
export function useScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])
}
