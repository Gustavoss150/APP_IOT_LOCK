import type { Card, User } from '../types'
import { formatCpf } from '../utils/formatters'

type UsersTableProps = {
  users: User[]
  cards: Card[]
  deletingUserId: number | null
  onDeleteUser: (user: User) => void
}

export function UsersTable({
  users,
  cards,
  deletingUserId,
  onDeleteUser,
}: UsersTableProps) {
  if (!users.length) {
    return <p className="empty-state">Nenhuma pessoa cadastrada.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>CPF</th>
            <th>Cartões</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isDeleting = deletingUserId === user.id
            const userCardsCount = cards.filter((card) => card.user_id === user.id).length

            return (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>
                  <code>{formatCpf(user.cpf)}</code>
                </td>
                <td>{userCardsCount}</td>
                <td>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={isDeleting}
                    onClick={() => onDeleteUser(user)}
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
