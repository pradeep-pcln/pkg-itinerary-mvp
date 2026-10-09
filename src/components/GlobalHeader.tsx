import { useEffect, useState } from 'react'

interface HeaderData {
  headerHTML: string
  footerHTML: string
  installerHTML: string
}

let _cache: HeaderData | null = null
let _promise: Promise<HeaderData> | null = null
let _scriptsInjected = false

function loadHeader(): Promise<HeaderData> {
  if (_cache) return Promise.resolve(_cache)
  if (_promise) return _promise
  _promise = fetch('/pkg-itinerary-mvp/api/header')
    .then(r => r.json())
    .then(data => { _cache = data; return data })
    .catch(() => ({ headerHTML: '', footerHTML: '', installerHTML: '' }))
  return _promise
}

function styleViLink(link: HTMLElement) {
  link.style.color = '#0068ef'
  link.style.fontWeight = '700'
  link.style.textDecoration = 'none'
}

// Inject "Vacation Itineraries" tab after the "Experience" nav item; no-op if already present
function ensureViTab() {
  if (document.getElementById('vi-nav-tab')) return
  const navList = document.querySelector<HTMLElement>('#pcln-global-header .global-header-nav-product-list')
  if (!navList) return
  const expItem = [...navList.querySelectorAll('li')].find(li => li.textContent?.trim().toLowerCase().includes('experience'))
  if (!expItem) return

  const tab = document.createElement('li')
  tab.id = 'vi-nav-tab'
  tab.className = expItem.className
  const anchor = document.createElement('a')
  anchor.id = 'vi-nav-link'
  anchor.href = '#'
  anchor.textContent = 'Vacation Itineraries'
  const siblingAnchor = expItem.querySelector('a')
  if (siblingAnchor) anchor.className = siblingAnchor.className
  styleViLink(anchor)
  anchor.addEventListener('click', e => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('vacation-itineraries-tab-click'))
  })
  tab.appendChild(anchor)
  expItem.insertAdjacentElement('afterend', tab)
}

export function useGlobalHeader() {
  const [data, setData] = useState<HeaderData | null>(_cache)
  useEffect(() => {
    if (_cache) return
    loadHeader().then(setData)
  }, [])
  return data
}

export function GlobalHeader() {
  const data = useGlobalHeader()

  useEffect(() => {
    if (!data?.headerHTML) return

    if (!_scriptsInjected) {
      _scriptsInjected = true

      function execScripts(html: string) {
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        tmp.querySelectorAll('script').forEach(old => {
          // Skip OneTrust — it injects a blocking PerimeterX polling loop on localhost
          if (old.src?.includes('cookielaw.org')) return
          if (old.type === 'application/ld+json') return
          const s = document.createElement('script')
          if (old.type) s.type = old.type
          if (old.src) s.src = old.src
          else s.textContent = old.textContent
          document.head.appendChild(s)
        })
      }

      // Re-execute headerHTML scripts (Okta, GLOBAL_BOOTSTRAP_DATA, event wiring for sign-in).
      // dangerouslySetInnerHTML doesn't run <script> tags — this replicates SSR behavior.
      execScripts(data.headerHTML)

      // installerHTML loads global-web-components-install.js which injects the bundle
      // (gated on isPriceline hostname — passes on local.priceline.com).
      if (data.installerHTML) execScripts(data.installerHTML)
    }
    // The installer script checks domain/GTM conditions that don't apply on localhost.
    // Force all hidden elements visible after scripts have had a tick to run.
    const timer = setTimeout(() => {
      const sel = (s: string) => document.querySelector<HTMLElement>(s)
      const selAll = (s: string) => [...document.querySelectorAll<HTMLElement>(s)]
      sel('#pcln-global-header #global-header')?.style.setProperty('visibility', 'visible')
      sel('#pcln-global-header .global-header-nav-product-list')?.style.setProperty('display', 'flex')
      sel('#pcln-global-header .navbar-priceline-brand')?.style.setProperty('display', 'flex')
      selAll('#pcln-global-header .node-invisible').forEach(el => el.classList.remove('node-invisible'))
      // Live header HTML renders hamburger panel open by default — force it closed
      const ham = sel('#pcln-global-header #hamburger-section')
      if (ham) { ham.style.setProperty('display', 'none'); ham.style.setProperty('left', '-100%') }
      sel('#pcln-global-footer #footer-root')?.style.setProperty('display', 'block')

      // Dropdowns initialize via _t() in the bundle, but that races with our render.
      // Force all dropdown panels closed so none appear stuck open.
      const dropdownIds = ['vip-dd', 'my-trips-dd', 'help-dd', 'mc-dd', 'lang-dd', 'recent-activity-dd']
      dropdownIds.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.style.cssText = 'visibility: hidden; opacity: 0; transition: visibility 0s linear 0.2s, opacity 0.2s linear;'
      })

      ensureViTab()

      // The bundle's vs() attaches this at load time, before React renders the header.
      // Re-attach here to guarantee it runs after the DOM exists.
      // Re() in the bundle: redirects to /home/join?flow=authenticate&redirecturl=<current>
      const signInBtn = document.getElementById('in-path-sign-in-out-click')
      if (signInBtn && !signInBtn.dataset.listenerAttached) {
        signInBtn.dataset.listenerAttached = 'true'
        signInBtn.addEventListener('click', () => {
          const { pathname, search } = window.location
          const redirecturl = encodeURIComponent(pathname + search)
          window.location.href = `/home/join?flow=authenticate&redirecturl=${redirecturl}`
        })
      }
    }, 100)

    // The header bundle re-renders the nav after load, which drops the injected tab
    const headerRoot = document.getElementById('pcln-global-header')
    const observer = new MutationObserver(ensureViTab)
    if (headerRoot) observer.observe(headerRoot, { childList: true, subtree: true })
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [data?.installerHTML])

  if (!data?.headerHTML) return null

  return (
    <div
      id="pcln-global-header"
      dangerouslySetInnerHTML={{ __html: data.headerHTML }}
    />
  )
}

export function GlobalFooter() {
  const data = useGlobalHeader()
  if (!data?.footerHTML) return null
  return (
    <div
      id="pcln-global-footer"
      dangerouslySetInnerHTML={{ __html: data.footerHTML }}
    />
  )
}
