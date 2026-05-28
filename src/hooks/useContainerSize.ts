import { useEffect, useRef, useState } from 'react'

export interface ContainerSize {
  w: number
  h: number
  xs: boolean   // w < 240
  sm: boolean   // w < 360
  md: boolean   // w < 520
  lg: boolean   // w >= 520
  tall: boolean // h > w
  wide: boolean // w > h * 1.5
}

const EMPTY: ContainerSize = { w: 0, h: 0, xs: false, sm: false, md: false, lg: false, tall: false, wide: false }

function classify(w: number, h: number): ContainerSize {
  return {
    w, h,
    xs:   w < 240,
    sm:   w < 360,
    md:   w < 520,
    lg:   w >= 520,
    tall: h > w,
    wide: w > h * 1.5,
  }
}

export function useContainerSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<ContainerSize>(EMPTY)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (!e) return
      const { width, height } = e.contentRect
      setSize(classify(Math.round(width), Math.round(height)))
    })
    ro.observe(el)
    const rect = el.getBoundingClientRect()
    setSize(classify(Math.round(rect.width), Math.round(rect.height)))
    return () => ro.disconnect()
  }, [])

  return { ref, size }
}

export function sizeClasses(size: ContainerSize): string {
  const cls: string[] = []
  if (size.xs)   cls.push('cq-xs')
  if (size.sm)   cls.push('cq-sm')
  if (size.md)   cls.push('cq-md')
  if (size.lg)   cls.push('cq-lg')
  if (size.tall) cls.push('cq-tall')
  if (size.wide) cls.push('cq-wide')
  return cls.join(' ')
}
