import { CdnIcon, Heading, Span } from '@pcln/horizon'
import { packageExcludes, packageIncludes } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'

export function IncludesExcludes({ pkg }: { pkg: NormalizedPackage }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-xl border border-success-5 bg-success-3 p-4">
        <Heading as="h3" textStyle="heading5" palette="primary" shade="13">Package Includes</Heading>
        <ul className="flex flex-col gap-2">
          {packageIncludes(pkg).map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CdnIcon iconName="check_circle" size="20" palette="success" shade="8" />
              <Span textStyle="body2" palette="primary" shade="13">{item}</Span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-error-5 bg-error-2 p-4">
        <Heading as="h3" textStyle="heading5" palette="primary" shade="13">Package Excludes</Heading>
        <ul className="flex flex-col gap-2">
          {packageExcludes(pkg).map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CdnIcon iconName="cancel" size="20" palette="error" shade="8" />
              <Span textStyle="body2" palette="primary" shade="13">{item}</Span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
