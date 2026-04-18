interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJIS = ['📄', '📝', '📒', '📚', '💡', '🎯', '✅', '❤️', '🔥', '⭐', '🚀', '🐛', '🎨', '⚙️', '🔒', '📊', '🗂️', '🏠', '🌐', '💻'];

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="absolute z-50 w-56 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md shadow-xl p-3">
      <div className="grid grid-cols-5 gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-xl p-1 hover:bg-[var(--hover)] rounded"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="h-px bg-[var(--border-color)] my-2" />
      <button
        onClick={() => { onSelect(''); onClose(); }}
        className="w-full text-left px-2 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] rounded"
      >
        Remove icon
      </button>
    </div>
  );
}
