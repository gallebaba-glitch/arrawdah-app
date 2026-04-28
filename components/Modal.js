export default function Modal({ open, onClose, title, children, onSave, saveLabel = 'Enregistrer' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 rounded-t-2xl"
             style={{ background: '#0F5229' }}>
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-lg"
            style={{ background: 'rgba(255,255,255,0.15)' }}>✕</button>
        </div>
        <div className="p-5">{children}</div>
        <div className="flex gap-3 justify-end px-5 pb-5 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button onClick={onSave} className="btn btn-primary">{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}
