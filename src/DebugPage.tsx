import { useState } from 'react'

const DEFAULT_PARAMS = {
  originAirport: 'EWR',
  originMetroCode: 'NYC',
  destinationAirport: 'CUN',
  destinationCityId: '3000061781',
  departDate: '2026-08-15',
  returnDate: '2026-08-22',
  travelers: 2,
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue }

function countLeaf(v: JsonValue): number {
  if (v === null || typeof v !== 'object') return 1
  if (Array.isArray(v)) return (v as JsonValue[]).reduce<number>((s, c) => s + countLeaf(c), 0)
  return Object.values(v as Record<string, JsonValue>).reduce<number>((s, c) => s + countLeaf(c), 0)
}

function JsonNode({ label, value, depth = 0, defaultOpen = false }: {
  label: string
  value: JsonValue
  depth?: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen || depth < 2)

  const isObj = value !== null && typeof value === 'object' && !Array.isArray(value)
  const isArr = Array.isArray(value)
  const isLeaf = !isObj && !isArr

  const leafCount = !isLeaf ? countLeaf(value) : 0
  const childCount = isArr ? (value as JsonValue[]).length : isObj ? Object.keys(value as object).length : 0

  const labelColor = depth === 0 ? '#0068ef' : depth === 1 ? '#334155' : '#496785'
  const bg = depth % 2 === 0 ? 'transparent' : 'rgba(0,104,239,0.02)'

  if (isLeaf) {
    const strVal = String(value)
    const valColor = typeof value === 'number' ? '#0053bf'
      : typeof value === 'boolean' ? '#7c3aed'
      : value === null ? '#9ca3af'
      : strVal.length > 60 ? '#374151' : '#059669'
    return (
      <div style={{ display: 'flex', gap: 8, padding: '2px 0 2px 4px', background: bg, borderRadius: 4, flexWrap: 'wrap' }}>
        <span style={{ color: labelColor, fontWeight: 700, flexShrink: 0 }}>{label}:</span>
        <span style={{ color: valColor, wordBreak: 'break-all', fontFamily: 'monospace' }}>
          {typeof value === 'string' ? `"${strVal}"` : strVal}
        </span>
      </div>
    )
  }

  return (
    <div style={{ background: bg, borderRadius: 4, marginBottom: 1 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', textAlign: 'left', background: 'none',
          border: 'none', cursor: 'pointer', padding: '3px 4px',
          fontFamily: "'Montserrat', monospace", fontSize: 12,
        }}
      >
        <span style={{ color: '#b3d4ff', fontSize: 10, width: 10, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <span style={{ color: labelColor, fontWeight: 700 }}>{label}</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>
          {isArr ? `[${childCount}]` : `{${childCount}}`}
          {!open && leafCount > 0 && <span style={{ marginLeft: 4, color: '#d2e6ff' }}>· {leafCount} values</span>}
        </span>
      </button>
      {open && (
        <div style={{ paddingLeft: 16, borderLeft: '2px solid #e8f2ff', marginLeft: 8 }}>
          {isArr
            ? (value as JsonValue[]).map((v, i) => (
                <JsonNode key={i} label={String(i)} value={v} depth={depth + 1} />
              ))
            : Object.entries(value as { [k: string]: JsonValue }).map(([k, v]) => (
                <JsonNode key={k} label={k} value={v} depth={depth + 1} />
              ))
          }
        </div>
      )}
    </div>
  )
}

function SummaryPanel({ data }: { data: JsonValue }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const d = data as Record<string, JsonValue>
  const body = d.body as Record<string, JsonValue> | undefined
  if (!body) return null

  const comps = (body.componentResponses as JsonValue[] | undefined) ?? []
  const proposals = (body.proposals as JsonValue[] | undefined) ?? []

  const flyComp = (comps as Record<string, JsonValue>[]).find((c) => c.flyResponse)
  const stayComp = (comps as Record<string, JsonValue>[]).find((c) => c.stayResponse)

  const flyItems = ((flyComp?.flyResponse as Record<string, JsonValue> | undefined)?.flyItems as JsonValue[] | undefined) ?? []
  const stayItems = ((stayComp?.stayResponse as Record<string, JsonValue> | undefined)?.stayItems as JsonValue[] | undefined) ?? []

  const flyKeys = new Set(
    (proposals as Record<string, JsonValue>[]).map((p) => {
      const refs = (p.componentReferences as Record<string, JsonValue>[] | undefined) ?? []
      const flyRef = refs.find((r) => r.componentType === 'FLY') as Record<string, JsonValue> | undefined
      const priceRef = flyRef?.itemPriceKeyReference as Record<string, JsonValue> | undefined
      return priceRef?.itemKey ?? flyRef?.itemKey ?? null
    })
  )

  const statBox = (label: string, value: string | number, highlight = false) => (
    <div key={label} style={{
      background: highlight ? '#0068ef' : '#fff',
      border: `1px solid ${highlight ? '#0068ef' : '#d2e6ff'}`,
      borderRadius: 10, padding: '10px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? '#fff' : '#001833', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.8)' : '#8399b0', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#8399b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 14 }}>
        {statBox('Proposals', proposals.length, true)}
        {statBox('Stay Items', stayItems.length)}
        {statBox('Fly Items', flyItems.length, flyItems.length <= 1)}
        {statBox('Unique Fly Keys', flyKeys.size)}
        {statBox('Components', comps.length)}
      </div>

      {flyItems.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0068ef', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Fly Items</div>
          {(flyItems as Record<string, JsonValue>[]).map((f, i) => {
            const slices = (f.slices as Record<string, JsonValue>[] | undefined) ?? []
            return (
              <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', padding: '4px 0', borderBottom: '1px solid #f0f4ff' }}>
                <span style={{ fontWeight: 700, color: '#0068ef' }}>[{i}]</span> key={String(f.itemKey ?? '').slice(0, 16)}…
                · slices={slices.length}
                {slices.map((s, si) => {
                  const segs = (s.segments as Record<string, JsonValue>[] | undefined) ?? []
                  return (
                    <span key={si} style={{ color: '#496785' }}>
                      {' '}| slice{si}:{segs.length}seg
                      {segs.map((seg, segi) => (
                        <span key={segi} style={{ color: '#059669' }}>
                          {' '}{String((seg.originAirport as Record<string, JsonValue>)?.airportCode ?? '')}→
                          {String((seg.destinationAirport as Record<string, JsonValue>)?.airportCode ?? '')}
                          [{String(seg.marketingAirlineCode ?? '')}]
                        </span>
                      ))}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {flyKeys.size > 0 && (
        <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0068ef', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Unique FLY itemKeys in proposals ({flyKeys.size})
          </div>
          {[...flyKeys].map((k, i) => (
            <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: k ? '#334155' : '#ef4444', padding: '2px 0' }}>
              {k ? String(k) : '⚠ null — no itemKey found in componentReferences'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchForm({ params, onChange, onFetch, onFetchFlights, loading }: {
  params: typeof DEFAULT_PARAMS
  onChange: (p: typeof DEFAULT_PARAMS) => void
  onFetch: () => void
  onFetchFlights: () => void
  loading: boolean
}) {
  const field = (key: keyof typeof DEFAULT_PARAMS, label: string) => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: '#8399b0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <input
        value={String(params[key])}
        onChange={(e) => onChange({ ...params, [key]: key === 'travelers' ? Number(e.target.value) : e.target.value })}
        style={{ border: '1px solid #d2e6ff', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'monospace', color: '#001833', background: '#fff', outline: 'none' }}
      />
    </label>
  )

  return (
    <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        {field('originAirport', 'Origin Airport')}
        {field('originMetroCode', 'Metro Code')}
        {field('destinationAirport', 'Dest Airport')}
        {field('destinationCityId', 'City ID')}
        {field('departDate', 'Depart Date')}
        {field('returnDate', 'Return Date')}
        {field('travelers', 'Travelers')}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
        <button
          onClick={onFetch}
          disabled={loading}
          style={{
            background: loading ? '#8399b0' : '#0068ef',
            border: 'none', borderRadius: 8, color: '#fff',
            fontFamily: "'Montserrat', Arial, sans-serif",
            fontSize: 13, fontWeight: 700, padding: '9px 22px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Fetching…' : '🏨 Fetch (STAY pivot)'}
        </button>
        <button
          onClick={onFetchFlights}
          disabled={loading}
          style={{
            background: loading ? '#8399b0' : '#059669',
            border: 'none', borderRadius: 8, color: '#fff',
            fontFamily: "'Montserrat', Arial, sans-serif",
            fontSize: 13, fontWeight: 700, padding: '9px 22px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Fetching…' : '✈ Fetch (FLY pivot)'}
        </button>
      </div>
    </div>
  )
}

export default function DebugPage() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<JsonValue>(null)
  const [tab, setTab] = useState<'summary' | 'tree' | 'raw'>('summary')
  const [search, setSearch] = useState('')
  const [rawStr, setRawStr] = useState('')

  async function doFetch(url: string) {
    setLoading(true); setError(null); setData(null); setRawStr('')
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      })
      const text = await res.text()
      setRawStr(text)
      const json = JSON.parse(text)
      setData(json)
      setTab('summary')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetch_ = () => doFetch('debug/raw')
  const fetchFlights_ = () => doFetch('debug/raw-flights')

  function copyRaw() {
    navigator.clipboard.writeText(rawStr)
  }

  const filtered = search.trim()
    ? (() => {
        try {
          const q = search.trim().toLowerCase()
          function filterJson(v: JsonValue): JsonValue {
            if (v === null || typeof v !== 'object') return String(v).toLowerCase().includes(q) ? v : undefined as unknown as JsonValue
            if (Array.isArray(v)) {
              const arr = (v as JsonValue[]).map(filterJson).filter((x) => x !== undefined)
              return arr.length ? arr : undefined as unknown as JsonValue
            }
            const obj: Record<string, JsonValue> = {}
            for (const [k, val] of Object.entries(v as Record<string, JsonValue>)) {
              if (k.toLowerCase().includes(q)) { obj[k] = val; continue }
              const filtered = filterJson(val)
              if (filtered !== undefined) obj[k] = filtered
            }
            return Object.keys(obj).length ? obj : undefined as unknown as JsonValue
          }
          return filterJson(data)
        } catch { return data }
      })()
    : data

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer',
        fontFamily: "'Montserrat', Arial, sans-serif", fontSize: 12, fontWeight: 700,
        background: tab === id ? '#0068ef' : '#e8f2ff',
        color: tab === id ? '#fff' : '#496785',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f8ff', fontFamily: "'Montserrat', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#001833', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href={import.meta.env.BASE_URL} style={{ color: '#b3d4ff', fontSize: 12, textDecoration: 'none' }}>← App</a>
          <span style={{ color: '#d2e6ff', fontSize: 18, fontWeight: 800 }}>🔬 USP Debug</span>
          <span style={{ background: '#0068ef', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 3 }}>RAW</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <SearchForm params={params} onChange={setParams} onFetch={fetch_} onFetchFlights={fetchFlights_} loading={loading} />

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', marginBottom: 16, color: '#b91c1c', fontWeight: 600, fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        {data && (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <TabBtn id="summary" label="📊 Summary" />
              <TabBtn id="tree" label="🌲 JSON Tree" />
              <TabBtn id="raw" label="📄 Raw JSON" />

              {tab === 'tree' && (
                <input
                  placeholder="Filter keys / values…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ marginLeft: 'auto', border: '1px solid #d2e6ff', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'monospace', width: 220, outline: 'none' }}
                />
              )}

              {tab === 'raw' && (
                <button
                  onClick={copyRaw}
                  style={{ marginLeft: 'auto', background: '#fff', border: '1px solid #d2e6ff', borderRadius: 6, color: '#496785', fontSize: 11, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}
                >
                  📋 Copy
                </button>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #d2e6ff', borderRadius: 14, padding: '16px', fontSize: 12 }}>
              {tab === 'summary' && <SummaryPanel data={data} />}

              {tab === 'tree' && (
                filtered
                  ? <JsonNode label="response" value={filtered} depth={0} defaultOpen />
                  : <div style={{ color: '#8399b0', padding: '20px 0', textAlign: 'center' }}>No matches for "{search}"</div>
              )}

              {tab === 'raw' && (
                <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 11, color: '#334155', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '70vh', overflowY: 'auto' }}>
                  {rawStr}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
