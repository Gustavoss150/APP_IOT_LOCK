import { type FormEvent, useEffect, useState } from 'react'
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

type EnrollmentStatus = {
  active: boolean
  user_id: number
  card?: Card
  error?: string
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

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `A API respondeu com status ${response.status}`)
  }

  return payload as T
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `A API respondeu com status ${response.status}`)
  }

  return payload as T
}

async function del(path: string): Promise<void> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'DELETE',
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || `A API respondeu com status ${response.status}`)
  }
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
  const [togglingCardId, setTogglingCardId] = useState<number | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserCpf, setNewUserCpf] = useState('')
  const [newUserCardUid, setNewUserCardUid] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [submittingUser, setSubmittingUser] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null)

  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [manualCardUid, setManualCardUid] = useState('')
  const [enrollingRfid, setEnrollingRfid] = useState(false)
  const [cardModalError, setCardModalError] = useState<string | null>(null)
  const [cardModalSuccess, setCardModalSuccess] = useState<string | null>(null)
  const [submittingCard, setSubmittingCard] = useState(false)

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

  async function toggleCardStatus(card: Card) {
    setTogglingCardId(card.id)
    try {
      const updated = await patch<Card>(`/cards/${card.id}/status`, { active: !card.active })
      setData((current) => ({
        ...current,
        cards: current.cards.map((item) => (item.id === card.id ? updated : item)),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar status do cartão'
      setErrors([message])
    } finally {
      setTogglingCardId(null)
    }
  }

  async function handleDeleteCard(card: Card) {
    setDeletingCardId(card.id)
    try {
      await del(`/cards/${card.id}`)
      setData((current) => ({
        ...current,
        cards: current.cards.filter((item) => item.id !== card.id),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir cartão'
      setErrors([message])
    } finally {
      setDeletingCardId(null)
    }
  }

  function openUserModal() {
    setNewUserName('')
    setNewUserCpf('')
    setNewUserCardUid('')
    setModalError(null)
    setIsUserModalOpen(true)
  }

  function closeUserModal() {
    if (submittingUser) return
    setIsUserModalOpen(false)
    setModalError(null)
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setModalError(null)

    const trimmedName = newUserName.trim()
    const cpfDigits = newUserCpf.replace(/\D/g, '')
    const cpfNumber = Number(cpfDigits)
    const trimmedUid = newUserCardUid.trim().toUpperCase()

    if (!trimmedName) {
      setModalError('Informe o nome da pessoa.')
      return
    }
    if (cpfDigits.length !== 11 || !cpfNumber) {
      setModalError('Informe um CPF válido com 11 dígitos.')
      return
    }

    setSubmittingUser(true)
    try {
      const createdUser = await post<User>('/users', {
        name: trimmedName,
        cpf: cpfNumber,
      })

      let createdCard: Card | null = null
      if (trimmedUid) {
        createdCard = await post<Card>('/cards', {
          card_uid: trimmedUid,
          user_id: createdUser.id,
        })
      }

      setData((current) => ({
        ...current,
        users: [...current.users, createdUser],
        cards: createdCard ? [...current.cards, createdCard] : current.cards,
      }))
      setIsUserModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cadastrar pessoa'
      setModalError(message)
    } finally {
      setSubmittingUser(false)
    }
  }

  async function handleDeleteUser(user: User) {
    setDeletingUserId(user.id)
    try {
      const userCards = data.cards.filter((card) => card.user_id === user.id)
      for (const card of userCards) {
        await del(`/cards/${card.id}`)
      }
      await del(`/users/${user.id}`)
      setData((current) => ({
        ...current,
        users: current.users.filter((item) => item.id !== user.id),
        cards: current.cards.filter((card) => card.user_id !== user.id),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover pessoa'
      setErrors([message])
    } finally {
      setDeletingUserId(null)
    }
  }

  function openCardModal() {
    const defaultUser = data.users[0] ? String(data.users[0].id) : ''
    setSelectedUserId(defaultUser)
    setManualCardUid('')
    setEnrollingRfid(false)
    setCardModalError(null)
    setCardModalSuccess(null)
    setIsCardModalOpen(true)
  }

  async function closeCardModal() {
    if (enrollingRfid) {
      try {
        await post('/cards/enrollment/cancel', {})
      } catch {
        // Ignora falha ao cancelar modo de cadastro
      }
    }
    setEnrollingRfid(false)
    setIsCardModalOpen(false)
    setCardModalError(null)
    setCardModalSuccess(null)
  }

  async function handleStartRfidEnrollment() {
    const userIdNum = Number(selectedUserId)
    if (!userIdNum) {
      setCardModalError('Selecione uma pessoa primeiro.')
      return
    }

    setCardModalError(null)
    setCardModalSuccess(null)
    try {
      await post<EnrollmentStatus>('/cards/enrollment/start', { user_id: userIdNum })
      setEnrollingRfid(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar leitura pelo RFID da porta'
      setCardModalError(message)
    }
  }

  async function handleManualCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const userIdNum = Number(selectedUserId)
    const uid = manualCardUid.trim().toUpperCase()
    if (!userIdNum) {
      setCardModalError('Selecione uma pessoa.')
      return
    }
    if (!uid) {
      setCardModalError('Passe o cartão no leitor da porta ou digite o UID manualmente.')
      return
    }

    setSubmittingCard(true)
    setCardModalError(null)
    try {
      const created = await post<Card>('/cards', { card_uid: uid, user_id: userIdNum })
      setData((current) => ({
        ...current,
        cards: [...current.cards.filter((c) => c.id !== created.id), created],
      }))
      setIsCardModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cadastrar cartão'
      setCardModalError(message)
    } finally {
      setSubmittingCard(false)
    }
  }

  useEffect(() => {
    if (!isCardModalOpen || !enrollingRfid) return

    const timer = window.setInterval(async () => {
      try {
        const status = await get<EnrollmentStatus>('/cards/enrollment/status')
        if (status.card) {
          const enrolledCard = status.card
          setEnrollingRfid(false)
          setManualCardUid(enrolledCard.card_uid)
          setCardModalSuccess(`Cartão ${enrolledCard.card_uid} lido na porta e vinculado com sucesso!`)
          setData((current) => {
            const exists = current.cards.some((c) => c.id === enrolledCard.id)
            return {
              ...current,
              cards: exists
                ? current.cards.map((c) => (c.id === enrolledCard.id ? enrolledCard : c))
                : [...current.cards, enrolledCard],
            }
          })
        } else if (!status.active && status.error) {
          setEnrollingRfid(false)
          setCardModalError(status.error)
        }
      } catch {
        // Ignora falha transitória de polling
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isCardModalOpen, enrollingRfid])

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
          <thead><tr><th>Nome</th><th>CPF</th><th>Cartões</th><th>Ação</th></tr></thead>
          <tbody>
            {users.map((user) => {
              const isDeleting = deletingUserId === user.id
              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td><code>{formatCpf(user.cpf)}</code></td>
                  <td>{data.cards.filter((card) => card.user_id === user.id).length}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={isDeleting}
                      onClick={() => void handleDeleteUser(user)}
                    >
                      {isDeleting ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              )
            })}
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
          <thead><tr><th>UID</th><th>Pessoa</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {cards.map((card) => {
              const isToggling = togglingCardId === card.id
              const isDeleting = deletingCardId === card.id
              return (
                <tr key={card.id}>
                  <td><code>{card.card_uid}</code></td>
                  <td>{usersById.get(card.user_id)?.name ?? `Pessoa #${card.user_id}`}</td>
                  <td><span className={`pill ${card.active ? 'pill-success' : 'pill-muted'}`}>{card.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={card.active}
                        disabled={isToggling || isDeleting}
                        onClick={() => void toggleCardStatus(card)}
                        className={`toggle-switch ${card.active ? 'is-active' : ''}`}
                      >
                        <span className="toggle-track">
                          <span className="toggle-thumb" />
                        </span>
                        <span className="toggle-label">
                          {isToggling ? 'Salvando...' : card.active ? 'Desativar' : 'Ativar'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        disabled={isDeleting || isToggling}
                        onClick={() => void handleDeleteCard(card)}
                      >
                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
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

        {view === 'users' && (
          <section className="data-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CADASTRO</p>
                <h2>Pessoas cadastradas</h2>
              </div>
              <div className="section-actions">
                <span className="record-count">{data.users.length} registros</span>
                <button type="button" className="primary-button" onClick={openUserModal}>
                  + Cadastrar pessoa
                </button>
              </div>
            </div>
            {renderUsers(data.users)}
          </section>
        )}
        {view === 'cards' && (
          <section className="data-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CREDENCIAIS</p>
                <h2>Cartões cadastrados</h2>
              </div>
              <div className="section-actions">
                <span className="record-count">{data.cards.length} registros</span>
                <button type="button" className="primary-button" onClick={openCardModal}>
                  + Cadastrar cartão
                </button>
              </div>
            </div>
            {renderCards(data.cards)}
          </section>
        )}
        {view === 'accesses' && <section className="data-section"><div className="section-heading"><div><p className="eyebrow">AUDITORIA</p><h2>Histórico de acessos</h2></div><span className="record-count">{data.logs.length} registros</span></div>{renderAccesses(data.logs)}</section>}

        <footer className="page-footer"><span>IoT Lock</span><span>{updatedAt ? `Última leitura ${formatDate(updatedAt.toISOString())}` : 'Sem leitura recente'}</span></footer>
      </main>

      {isUserModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeUserModal}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-user-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">NOVO REGISTRO</p>
                <h2 id="modal-user-title">Cadastrar pessoa</h2>
              </div>
              <button type="button" className="modal-close" aria-label="Fechar modal" onClick={closeUserModal}>
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={(event) => void handleCreateUser(event)}>
              {modalError && <div className="alert alert-error">{modalError}</div>}

              <label className="form-field">
                <span>Nome completo</span>
                <input
                  type="text"
                  placeholder="Ex: Maria Eduarda"
                  value={newUserName}
                  onChange={(event) => setNewUserName(event.target.value)}
                  autoFocus
                  required
                />
              </label>

              <label className="form-field">
                <span>CPF (11 dígitos)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={newUserCpf}
                  onChange={(event) => setNewUserCpf(event.target.value)}
                  required
                />
              </label>

              <label className="form-field">
                <span>UID do cartão RFID (opcional)</span>
                <input
                  type="text"
                  placeholder="Ex: 01B46906"
                  value={newUserCardUid}
                  onChange={(event) => setNewUserCardUid(event.target.value.toUpperCase())}
                />
                <small>Se preenchido, o cartão já será vinculado e ativado para esta pessoa.</small>
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeUserModal} disabled={submittingUser}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={submittingUser}>
                  {submittingUser ? 'Salvando...' : 'Salvar cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCardModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => void closeCardModal()}>
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-card-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">CREDENCIAIS RFID</p>
                <h2 id="modal-card-title">Cadastrar cartão</h2>
              </div>
              <button type="button" className="modal-close" aria-label="Fechar modal" onClick={() => void closeCardModal()}>
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={(event) => void handleManualCardSubmit(event)}>
              {cardModalError && <div className="alert alert-error">{cardModalError}</div>}
              {cardModalSuccess && <div className="alert alert-success">{cardModalSuccess}</div>}

              <label className="form-field">
                <span>Vincular à pessoa</span>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  disabled={enrollingRfid}
                  required
                >
                  <option value="" disabled>
                    Selecione uma pessoa...
                  </option>
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({formatCpf(user.cpf)})
                    </option>
                  ))}
                </select>
              </label>

              <div className="rfid-enroll-box">
                <div className="rfid-enroll-info">
                  <strong>Leitura direta no RFID da porta</strong>
                  <p>
                    {enrollingRfid
                      ? 'Modo cadastro ativo! Aproxime o cartão no leitor RFID da porta agora...'
                      : 'Ative o modo cadastro e passe o cartão no leitor da fechadura para vinculá-lo automaticamente.'}
                  </p>
                </div>
                <button
                  type="button"
                  className={enrollingRfid ? 'secondary-button' : 'primary-button'}
                  onClick={() => void (enrollingRfid ? closeCardModal() : handleStartRfidEnrollment())}
                >
                  {enrollingRfid ? 'Aguardando cartão na porta...' : 'Ler cartão no RFID da porta'}
                </button>
              </div>

              <label className="form-field">
                <span>Ou digite o UID manualmente (opcional)</span>
                <input
                  type="text"
                  placeholder="Ex: 01B46906"
                  value={manualCardUid}
                  onChange={(event) => setManualCardUid(event.target.value.toUpperCase())}
                  disabled={enrollingRfid}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => void closeCardModal()} disabled={submittingCard}>
                  Fechar
                </button>
                {!cardModalSuccess && (
                  <button type="submit" className="primary-button" disabled={submittingCard || enrollingRfid || !manualCardUid.trim()}>
                    {submittingCard ? 'Salvando...' : 'Salvar manualmente'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App