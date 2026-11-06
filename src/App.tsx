import { useEffect, useState } from 'react'
import './App.css'

type User = {
  id: number
  name: string
  cpf: number
}

type Card = {
  id: number
  card_uid: string
  user_id: number
  active: boolean
}

type AccessLog = {
  id: number
  card_id: number | null
  card_uid?: string
  authorized: boolean
  accessed_at: string
}

type View = 'overview' | 'users' | 'cards' | 'accesses'
type DashboardData = { users: User[]; cards: Card[]; logs: AccessLog[] }

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`)
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `A API respondeu com status ${response.status}`)
  }

  return payload as T
}

function formatCpf(cpf: number) {
  const digits = String(cpf).padStart(11, '0')
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function App() {
  const [view, setView] = useState<View>('overview')
  const [data, setData] = useState<DashboardData>({ users: [], cards: [], logs: [] })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [connection, setConnection] = useState<'checking' | 'online' | 'partial' | 'offline'>('checking')
  const [errors, setErrors] = useState<string[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let active = true
    const requests = Promise.allSettled([
      get<User[] | null>('/users'),
      get<Card[] | null>('/cards'),
      get<AccessLog[] | null>('/access-logs/recent?limit=20'),
    ])

    void requests.then((results) => {
      if (!active) return

      const failures = results.filter((result) => result.status === 'rejected')
      setData((current) => ({
        users: results[0].status === 'fulfilled' ? results[0].value ?? [] : current.users,
        cards: results[1].status === 'fulfilled' ? results[1].value ?? [] : current.cards,
        logs: results[2].status === 'fulfilled' ? results[2].value ?? [] : current.logs,
      }))
      setErrors(failures.map((result) => (result as PromiseRejectedResult).reason.message))
      setConnection(failures.length === 0 ? 'online' : failures.length === results.length ? 'offline' : 'partial')

      if (failures.length < results.length) {
        setUpdatedAt(new Date())
      }
      setLoading(false)
    })

    return () => { active = false }
  }, [refreshKey])

  function refreshData() {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  const usersById = new Map(data.users.map((user) => [user.id, user]))
  const cardsById = new Map(data.cards.map((card) => [card.id, card]))
  const titles: Record<View, string> = {
    overview: 'Visão geral',
    users: 'Pessoas',
    cards: 'Cartões',
    accesses: 'Registros de acesso',
  }

  function renderAccesses(logs: AccessLog[]) {
    if (!logs.length) return <p className="empty-state">Nenhum registro de acesso encontrado.</p>

    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Resultado</th>
              <th>Pessoa</th>
              <th>Cartão</th>
              <th>Data e hora</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const card = log.card_id ? cardsById.get(log.card_id) : undefined
              const user = card ? usersById.get(card.user_id) : undefined
              const cardLabel = card?.card_uid || log.card_uid || (log.card_id ? `#${log.card_id}` : 'Desconhecido')
              return (
                <tr key={log.id}>
                  <td><span className={`pill ${log.authorized ? 'pill-success' : 'pill-danger'}`}>{log.authorized ? 'Autorizado' : 'Negado'}</span></td>
                  <td>{user?.name ?? 'Pessoa não identificada'}</td>
                  <td><code>{cardLabel}</code></td>
                  <td>{formatDate(log.accessed_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderUsers(users: User[]) {
    if (!users.length) return <p className="empty-state">Nenhuma pessoa cadastrada.</p>

    return (
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Cartões</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td><code>{formatCpf(user.cpf)}</code></td>
                <td>{data.cards.filter((card) => card.user_id === user.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderCards(cards: Card[]) {
    if (!cards.length) return <p className="empty-state">Nenhum cartão cadastrado.</p>

    return (
      <div className="table-wrap">
        <table>
          <thead><tr><th>UID</th><th>Pessoa</th><th>Status</th></tr></thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.id}>
                <td><code>{card.card_uid}</code></td>
                <td>{usersById.get(card.user_id)?.name ?? `Pessoa #${card.user_id}`}</td>
                <td><span className={`pill ${card.active ? 'pill-success' : 'pill-muted'}`}>{card.active ? 'Ativo' : 'Inativo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setView('overview')}>
          <span className="brand-mark" aria-hidden="true">IL</span>
          <span><strong>IoT Lock</strong><small>CONTROLE DE ACESSO</small></span>
        </a>

        <div className="nav-label">GESTÃO</div>
        <nav aria-label="Navegação principal">
          {([
            ['overview', 'Resumo', '01'],
            ['users', 'Pessoas', '02'],
            ['cards', 'Cartões', '03'],
            ['accesses', 'Acessos', '04'],
          ] as const).map(([id, label, number]) => (
            <button key={id} className={`nav-item ${view === id ? 'selected' : ''}`} onClick={() => setView(id)}>
              <span className="nav-number">{number}</span>{label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className={`connection-dot ${connection}`} />
          <span>{connection === 'online' ? 'API conectada' : connection === 'checking' ? 'Conectando...' : connection === 'partial' ? 'API instável' : 'API desconectada'}</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">IoT Lock <span>/</span> {titles[view]}</div>
          <button className="refresh-button" type="button" onClick={refreshData} disabled={loading}>
            <span aria-hidden="true">↻</span> Atualizar
          </button>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">PAINEL DE OPERAÇÃO</p>
            <h1>{titles[view]}</h1>
            <p className="subtitle">Dados consultados diretamente na API da fechadura.</p>
          </div>
          <div className="sync-note">
            <span className={`connection-dot ${connection}`} />
            <span>{updatedAt ? `Sincronizado às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando API'}</span>
          </div>
        </section>

        {errors.length > 0 && (
          <div className={`alert ${connection === 'offline' ? 'alert-error' : 'alert-warning'}`} role="status">
            <strong>{connection === 'offline' ? 'Não foi possível acessar a API.' : 'Alguns dados não foram carregados.'}</strong>
            <span>Confira se o serviço Go está rodando em localhost:8080. {errors[0]}</span>
          </div>
        )}

        {view === 'overview' && (
          <>
            <section className="stats-grid" aria-label="Resumo dos cadastros">
              <article className="stat-panel stat-coral"><div className="stat-top"><span>PESSOAS</span><span className="stat-index">01</span></div><strong>{loading && !updatedAt ? '—' : data.users.length}</strong><p>cadastros na API</p></article>
              <article className="stat-panel stat-green"><div className="stat-top"><span>CARTÕES ATIVOS</span><span className="stat-index">02</span></div><strong>{loading && !updatedAt ? '—' : data.cards.filter((card) => card.active).length}</strong><p>de {data.cards.length} cartões cadastrados</p></article>
              <article className="stat-panel stat-blue"><div className="stat-top"><span>EVENTOS RECENTES</span><span className="stat-index">03</span></div><strong>{loading && !updatedAt ? '—' : data.logs.length}</strong><p>registros retornados pela API</p></article>
            </section>
            <section className="data-section">
              <div className="section-heading"><div><p className="eyebrow">MONITORAMENTO</p><h2>Últimos acessos</h2></div><button className="text-button" onClick={() => setView('accesses')}>Ver todos <span aria-hidden="true">→</span></button></div>
              {renderAccesses(data.logs.slice(0, 8))}
            </section>
          </>
        )}

        {view === 'users' && <section className="data-section"><div className="section-heading"><div><p className="eyebrow">CADASTRO</p><h2>Pessoas cadastradas</h2></div><span className="record-count">{data.users.length} registros</span></div>{renderUsers(data.users)}</section>}
        {view === 'cards' && <section className="data-section"><div className="section-heading"><div><p className="eyebrow">CREDENCIAIS</p><h2>Cartões cadastrados</h2></div><span className="record-count">{data.cards.length} registros</span></div>{renderCards(data.cards)}</section>}
        {view === 'accesses' && <section className="data-section"><div className="section-heading"><div><p className="eyebrow">AUDITORIA</p><h2>Histórico de acessos</h2></div><span className="record-count">{data.logs.length} registros</span></div>{renderAccesses(data.logs)}</section>}

        <footer className="page-footer"><span>IoT Lock</span><span>{updatedAt ? `Última leitura ${formatDate(updatedAt.toISOString())}` : 'Sem leitura recente'}</span></footer>
      </main>
    </div>
  )
}

export default App