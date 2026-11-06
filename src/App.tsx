import { type FormEvent, useEffect, useState } from 'react'
import './App.css'
import { AccessLogsTable } from './components/AccessLogsTable'
import { CardModal } from './components/CardModal'
import { CardsTable } from './components/CardsTable'
import { OverviewStats } from './components/OverviewStats'
import { Sidebar } from './components/Sidebar'
import { ToastStack } from './components/ToastStack'
import { Topbar } from './components/Topbar'
import { UserModal } from './components/UserModal'
import { UsersTable } from './components/UsersTable'
import { del, get, patch, post, put } from './services/api'
import type {
  AccessLog,
  Card,
  ConnectionState,
  DashboardData,
  EnrollmentStatus,
  PageNotice,
  PendingTransfer,
  User,
  View,
} from './types'
import { formatDate } from './utils/formatters'

const titles: Record<View, string> = {
  overview: 'Visão geral',
  users: 'Pessoas',
  cards: 'Cartões',
  accesses: 'Registros de acesso',
}

function App() {
  const [view, setView] = useState<View>('overview')
  const [data, setData] = useState<DashboardData>({ users: [], cards: [], logs: [] })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [connection, setConnection] = useState<ConnectionState>('checking')
  const [errors, setErrors] = useState<string[]>([])
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const [togglingCardId, setTogglingCardId] = useState<number | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null)
  const [unlockingDoor, setUnlockingDoor] = useState(false)

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserCpf, setNewUserCpf] = useState('')
  const [newUserCardUid, setNewUserCardUid] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [submittingUser, setSubmittingUser] = useState(false)

  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [manualCardUid, setManualCardUid] = useState('')
  const [enrollingRfid, setEnrollingRfid] = useState(false)
  const [submittingCard, setSubmittingCard] = useState(false)

  const [notices, setNotices] = useState<PageNotice[]>([])
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null)
  const [transferringCard, setTransferringCard] = useState(false)

  function showNotice(type: 'success' | 'error', title: string, message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setNotices((current) => [...current, { id, type, title, message }])
    window.setTimeout(() => {
      setNotices((current) => current.filter((item) => item.id !== id))
    }, 4500)
  }

  function dismissNotice(id: number) {
    setNotices((current) => current.filter((item) => item.id !== id))
  }

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
      setConnection(
        failures.length === 0
          ? 'online'
          : failures.length === results.length
            ? 'offline'
            : 'partial',
      )

      if (failures.length < results.length) {
        setUpdatedAt(new Date())
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [refreshKey])

  function refreshData() {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }

  async function handleRemoteUnlock() {
    setUnlockingDoor(true)
    try {
      const logEntry = await post<AccessLog | null>('/access-logs/unlock', {})
      if (logEntry && logEntry.id) {
        setData((current) => ({
          ...current,
          logs: [logEntry, ...current.logs.filter((item) => item.id !== logEntry.id)],
        }))
      }
      showNotice('success', 'Porta destrancada!', 'Comando de abertura enviado remotamente para a fechadura.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar comando de abertura para a porta'
      showNotice('error', 'Falha ao abrir porta', message)
    } finally {
      setUnlockingDoor(false)
    }
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
      showNotice('error', 'Erro no cartão', message)
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
      showNotice('success', 'Cartão excluído', `O cartão ${card.card_uid} foi removido.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir cartão'
      showNotice('error', 'Erro ao excluir', message)
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
      showNotice('success', 'Pessoa cadastrada', `${createdUser.name} foi adicionada com sucesso.`)
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
      showNotice('success', 'Pessoa removida', `${user.name} foi excluída do sistema.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover pessoa'
      showNotice('error', 'Erro ao excluir', message)
    } finally {
      setDeletingUserId(null)
    }
  }

  function openCardModal() {
    const defaultUser = data.users[0] ? String(data.users[0].id) : ''
    setSelectedUserId(defaultUser)
    setManualCardUid('')
    setEnrollingRfid(false)
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
  }

  async function handleStartRfidEnrollment() {
    const userIdNum = Number(selectedUserId)
    if (!userIdNum) {
      showNotice('error', 'Atenção', 'Selecione uma pessoa primeiro.')
      return
    }

    try {
      await post<EnrollmentStatus>('/cards/enrollment/start', { user_id: userIdNum })
      setEnrollingRfid(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar leitura pelo RFID da porta'
      showNotice('error', 'Erro no leitor RFID', message)
    }
  }

  async function handleConfirmCardTransfer() {
    if (!pendingTransfer) return
    const { card, targetUserId } = pendingTransfer

    setTransferringCard(true)
    try {
      let updated: Card
      try {
        updated = await put<Card>(`/cards/${card.id}`, { user_id: targetUserId })
      } catch {
        await del(`/cards/${card.id}`)
        updated = await post<Card>('/cards', { card_uid: card.card_uid, user_id: targetUserId })
      }

      setData((current) => ({
        ...current,
        cards: [...current.cards.filter((c) => c.id !== card.id && c.id !== updated.id), updated],
      }))
      const targetName = usersById.get(targetUserId)?.name ?? `Pessoa #${targetUserId}`
      setPendingTransfer(null)
      showNotice('success', 'Cartão transferido', `O cartão ${updated.card_uid} agora está vinculado a ${targetName}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao transferir cartão'
      showNotice('error', 'Falha na transferência', message)
    } finally {
      setTransferringCard(false)
    }
  }

  async function handleManualCardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const userIdNum = Number(selectedUserId)
    const uid = manualCardUid.trim().toUpperCase()
    if (!userIdNum) {
      showNotice('error', 'Atenção', 'Selecione uma pessoa.')
      return
    }
    if (!uid) {
      showNotice('error', 'Atenção', 'Passe o cartão no leitor da porta ou digite o UID manualmente.')
      return
    }

    const existing = data.cards.find((c) => c.card_uid.toUpperCase() === uid)
    if (existing && existing.user_id !== userIdNum) {
      setIsCardModalOpen(false)
      setPendingTransfer({ card: existing, targetUserId: userIdNum })
      return
    }

    setSubmittingCard(true)
    try {
      const created = await post<Card>('/cards', { card_uid: uid, user_id: userIdNum })
      setData((current) => ({
        ...current,
        cards: [...current.cards.filter((c) => c.id !== created.id), created],
      }))
      const targetName = usersById.get(userIdNum)?.name ?? `Pessoa #${userIdNum}`
      setIsCardModalOpen(false)
      showNotice('success', 'Cartão cadastrado', `Cartão ${created.card_uid} vinculado a ${targetName}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cadastrar cartão'
      showNotice('error', 'Erro ao cadastrar cartão', message)
    } finally {
      setSubmittingCard(false)
    }
  }

  useEffect(() => {
    if (!isCardModalOpen || !enrollingRfid) return

    const timer = window.setInterval(async () => {
      try {
        const status = await get<EnrollmentStatus>('/cards/enrollment/status')
        if (status.conflict_card) {
          setEnrollingRfid(false)
          setIsCardModalOpen(false)
          setPendingTransfer({
            card: status.conflict_card,
            targetUserId: Number(selectedUserId) || status.user_id,
          })
        } else if (status.card) {
          const enrolledCard = status.card
          setEnrollingRfid(false)
          setIsCardModalOpen(false)
          setData((current) => {
            const exists = current.cards.some((c) => c.id === enrolledCard.id)
            return {
              ...current,
              cards: exists
                ? current.cards.map((c) => (c.id === enrolledCard.id ? enrolledCard : c))
                : [...current.cards, enrolledCard],
            }
          })
          const ownerName =
            data.users.find((u) => u.id === enrolledCard.user_id)?.name ??
            `Pessoa #${enrolledCard.user_id}`
          showNotice(
            'success',
            'Cartão lido na porta!',
            `O cartão ${enrolledCard.card_uid} foi vinculado a ${ownerName}.`,
          )
        } else if (!status.active && status.error) {
          setEnrollingRfid(false)
          setIsCardModalOpen(false)
          showNotice('error', 'Tempo esgotado', status.error)
        }
      } catch {
        // Ignora falha transitória de polling
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isCardModalOpen, enrollingRfid, selectedUserId, data.users])

  const usersById = new Map(data.users.map((user) => [user.id, user]))
  const cardsById = new Map(data.cards.map((card) => [card.id, card]))

  return (
    <div className="app-shell">
      <Sidebar view={view} connection={connection} onSelectView={setView} />

      <main className="main-content">
        <Topbar
          title={titles[view]}
          loading={loading}
          unlockingDoor={unlockingDoor}
          onRefresh={refreshData}
          onRemoteUnlock={() => void handleRemoteUnlock()}
        />

        <section className="page-heading">
          <div>
            <p className="eyebrow">PAINEL DE OPERAÇÃO</p>
            <h1>{titles[view]}</h1>
            <p className="subtitle">Dados consultados diretamente na API da fechadura.</p>
          </div>
          <div className="sync-note">
            <span className={`connection-dot ${connection}`} />
            <span>
              {updatedAt
                ? `Sincronizado às ${updatedAt.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Aguardando API'}
            </span>
          </div>
        </section>

        {errors.length > 0 && (
          <div
            className={`alert ${connection === 'offline' ? 'alert-error' : 'alert-warning'}`}
            role="status"
          >
            <strong>
              {connection === 'offline'
                ? 'Não foi possível acessar a API.'
                : 'Alguns dados não foram carregados.'}
            </strong>
            <span>Confira se o serviço Go está rodando em localhost:8080. {errors[0]}</span>
          </div>
        )}

        {view === 'overview' && (
          <>
            <OverviewStats data={data} loading={loading} updatedAt={updatedAt} />
            <section className="data-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">MONITORAMENTO</p>
                  <h2>Últimos acessos</h2>
                </div>
                <button className="text-button" onClick={() => setView('accesses')}>
                  Ver todos <span aria-hidden="true">→</span>
                </button>
              </div>
              <AccessLogsTable
                logs={data.logs.slice(0, 8)}
                cardsById={cardsById}
                usersById={usersById}
              />
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
            <UsersTable
              users={data.users}
              cards={data.cards}
              deletingUserId={deletingUserId}
              onDeleteUser={(user) => void handleDeleteUser(user)}
            />
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
            <CardsTable
              cards={data.cards}
              usersById={usersById}
              togglingCardId={togglingCardId}
              deletingCardId={deletingCardId}
              onToggleCardStatus={(card) => void toggleCardStatus(card)}
              onDeleteCard={(card) => void handleDeleteCard(card)}
            />
          </section>
        )}

        {view === 'accesses' && (
          <section className="data-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">AUDITORIA</p>
                <h2>Histórico de acessos</h2>
              </div>
              <span className="record-count">{data.logs.length} registros</span>
            </div>
            <AccessLogsTable logs={data.logs} cardsById={cardsById} usersById={usersById} />
          </section>
        )}

        <footer className="page-footer">
          <span>IoT Lock</span>
          <span>
            {updatedAt
              ? `Última leitura ${formatDate(updatedAt.toISOString())}`
              : 'Sem leitura recente'}
          </span>
        </footer>
      </main>

      <UserModal
        isOpen={isUserModalOpen}
        name={newUserName}
        cpf={newUserCpf}
        cardUid={newUserCardUid}
        error={modalError}
        submitting={submittingUser}
        onChangeName={setNewUserName}
        onChangeCpf={setNewUserCpf}
        onChangeCardUid={setNewUserCardUid}
        onClose={closeUserModal}
        onSubmit={(event) => void handleCreateUser(event)}
      />

      <CardModal
        isOpen={isCardModalOpen}
        users={data.users}
        selectedUserId={selectedUserId}
        manualCardUid={manualCardUid}
        enrollingRfid={enrollingRfid}
        submittingCard={submittingCard}
        onChangeSelectedUser={setSelectedUserId}
        onChangeManualUid={setManualCardUid}
        onStartRfidEnrollment={() => void handleStartRfidEnrollment()}
        onClose={() => void closeCardModal()}
        onSubmitManual={(event) => void handleManualCardSubmit(event)}
      />

      <ToastStack
        notices={notices}
        pendingTransfer={pendingTransfer}
        transferringCard={transferringCard}
        usersById={usersById}
        onDismissNotice={dismissNotice}
        onCancelTransfer={() => setPendingTransfer(null)}
        onConfirmTransfer={() => void handleConfirmCardTransfer()}
      />
    </div>
  )
}

export default App
