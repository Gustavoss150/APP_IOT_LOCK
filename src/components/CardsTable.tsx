import type { Card, User } from '../types'

type CardsTableProps = {
  cards: Card[]
  usersById: Map<number, User>
  togglingCardId: number | null
  deletingCardId: number | null
  onToggleCardStatus: (card: Card) => void
  onDeleteCard: (card: Card) => void
}

export function CardsTable({
  cards,
  usersById,
  togglingCardId,
  deletingCardId,
  onToggleCardStatus,
  onDeleteCard,
}: CardsTableProps) {
  if (!cards.length) {
    return <p className="empty-state">Nenhum cartão cadastrado.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>UID</th>
            <th>Pessoa</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const isToggling = togglingCardId === card.id
            const isDeleting = deletingCardId === card.id

            return (
              <tr key={card.id}>
                <td>
                  <code>{card.card_uid}</code>
                </td>
                <td>{usersById.get(card.user_id)?.name ?? `Pessoa #${card.user_id}`}</td>
                <td>
                  <span className={`pill ${card.active ? 'pill-success' : 'pill-muted'}`}>
                    {card.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={card.active}
                      disabled={isToggling || isDeleting}
                      onClick={() => onToggleCardStatus(card)}
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
                      onClick={() => onDeleteCard(card)}
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
