import type { ConnectionState, View } from '../types'

type SidebarProps = {
  view: View
  connection: ConnectionState
  onSelectView: (view: View) => void
}

const navItems: ReadonlyArray<readonly [View, string, string]> = [
  ['overview', 'Resumo', '01'],
  ['users', 'Pessoas', '02'],
  ['cards', 'Cartões', '03'],
  ['accesses', 'Acessos', '04'],
]

export function Sidebar({ view, connection, onSelectView }: SidebarProps) {
  const connectionLabel =
    connection === 'online'
      ? 'API conectada'
      : connection === 'checking'
        ? 'Conectando...'
        : connection === 'partial'
          ? 'API instável'
          : 'API desconectada'

  return (
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => onSelectView('overview')}>
        <span className="brand-mark" aria-hidden="true">IL</span>
        <span>
          <strong>IoT Lock</strong>
          <small>CONTROLE DE ACESSO</small>
        </span>
      </a>

      <div className="nav-label">GESTÃO</div>
      <nav aria-label="Navegação principal">
        {navItems.map(([id, label, number]) => (
          <button
            key={id}
            className={`nav-item ${view === id ? 'selected' : ''}`}
            onClick={() => onSelectView(id)}
          >
            <span className="nav-number">{number}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <span className={`connection-dot ${connection}`} />
        <span>{connectionLabel}</span>
      </div>
    </aside>
  )
}
