import { CdnIcon, Divider, Price, Span } from '@pcln/horizon'
import type { ReactNode } from 'react'
import { formatAmount, priceBreakdown, travelersLabel } from '../../lib/itinerary'
import type { NormalizedPackage } from '../../types'
import { Section } from './Section'

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <Span textStyle="body2" bold={strong} palette="primary" shade={strong ? '13' : '10'}>{label}</Span>
      {children}
    </div>
  )
}

export function PriceBreakdown({ pkg }: { pkg: NormalizedPackage }) {
  const { perTravelerLine, lines, total, perPerson, savings, resortFee } = priceBreakdown(pkg)
  const symbol = pkg.currencySymbol
  return (
    <Section title="Price details">
      <div className="flex flex-1 flex-col gap-3 rounded-xl border border-primary-4 bg-neutral-1 p-4">
        {perPerson > 0 ? (
          <div className="flex">
            <Price type="priceSale" textStyle="heading2" bold currencySymbol={symbol} price={formatAmount(perPerson)} suffix="/person" />
          </div>
        ) : null}
        {perTravelerLine ? (
          <Row label={perTravelerLine.label} strong>
            <Price type="neutral" textStyle="body2" bold currencySymbol={symbol} price={formatAmount(perTravelerLine.amount)} />
          </Row>
        ) : null}
        {lines.map((line) => (
          <Row key={line.label} label={line.label}>
            <Price type="neutral" textStyle="body2" currencySymbol={symbol} price={formatAmount(line.amount)} />
          </Row>
        ))}
        <Divider />
        <Row label={`Total for ${travelersLabel(pkg.travelers)}`} strong>
          <Price type="priceSale" textStyle="heading5" bold currencySymbol={symbol} price={formatAmount(total)} />
        </Row>
        {savings > 0 ? (
          <Row label="You save">
            <Price type="socSavings" textStyle="body2" bold currencySymbol={symbol} price={formatAmount(savings)} />
          </Row>
        ) : null}
        {resortFee > 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-caution-3 p-3">
            <CdnIcon iconName="info" size="20" palette="caution" shade="9" />
            <Span textStyle="body2" palette="primary" shade="13">
              A {symbol}{formatAmount(resortFee)} resort fee is paid at the hotel and isn't included in the total.
            </Span>
          </div>
        ) : null}
      </div>
    </Section>
  )
}
