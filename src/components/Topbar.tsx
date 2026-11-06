type TopbarProps = {
  title: string
  loading: boolean
  unlockingDoor: boolean
  onRefresh: () => void
  onRemoteUnlock: () => void
}

export function Topbar({
  title,
  loading,
  unlockingDoor,
  onRefresh,
  onRemoteUnlock,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        IoT Lock <span>/</span> {title}
      </div>
      <div className="topbar-actions">
        <button
          className="primary-button"
          type="button"
          onClick={onRemoteUnlock}
          disabled={unlockingDoor}
        >
          {unlockingDoor ? 'Abrindo...' : 'Destrancar porta'}
        </button>
        <button className="refresh-button" type="button" onClick={onRefresh} disabled={loading}>
          <span aria-hidden="true">↻</span> Atualizar
        </button>
      </div>
    </header>
  )
}
