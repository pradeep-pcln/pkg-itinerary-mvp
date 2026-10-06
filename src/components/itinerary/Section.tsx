import { Heading } from '@pcln/horizon'
import type { ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Heading as="h3" textStyle="heading4" palette="primary" shade="13">{title}</Heading>
      {children}
    </section>
  )
}
