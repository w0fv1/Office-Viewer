import { Command } from 'lucide-react'

export type CommandAction = {
  label: string
  run: () => void | Promise<void>
  disabled?: boolean
}

export function CommandPalette({ commands, onClose }: { commands: CommandAction[]; onClose: () => void }) {
  return (
    <div className="command-backdrop" onMouseDown={onClose}>
      <div className="command-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-title">
          <Command size={17} />
          <strong>命令面板</strong>
        </div>
        {commands.map((command) => (
          <button
            key={command.label}
            type="button"
            disabled={command.disabled}
            onClick={() => {
              void command.run()
              onClose()
            }}
          >
            {command.label}
          </button>
        ))}
      </div>
    </div>
  )
}
