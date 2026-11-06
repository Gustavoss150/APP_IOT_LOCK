import type { AccessLog, Card, User } from '../types'
import { formatDate } from '../utils/formatters'

type AccessLogsTableProps = {
  logs: AccessLog[]
  cardsById: Map<number, Card>
  usersById: Map<number, User>
}

export function AccessLogsTable({ logs, cardsById, usersById }: AccessLogsTableProps) {
  if (!logs.length) {
    return <p className="empty-state">Nenhum registro de acesso encontrado.</p>
  }

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
            const isRemotePanel = log.card_uid === 'PAINEL_WEB'
            const personLabel = isRemotePanel
              ? 'Abertura remota (Painel)'
              : (user?.name ?? 'Pessoa não identificada')
            const cardLabel =
              card?.card_uid || log.card_uid || (log.card_id ? `#${log.card_id}` : 'Desconhecido')

            return (
              <tr key={log.id}>
                <td>
                  <span className={`pill ${log.authorized ? 'pill-success' : 'pill-danger'}`}>
                    {log.authorized ? 'Autorizado' : 'Negado'}
                  </span>
                </td>
                <td>{personLabel}</td>
                <td>
                  <code>{cardLabel}</code>
                </td>
                <td>{formatDate(log.accessed_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
