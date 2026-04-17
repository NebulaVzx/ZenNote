interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJIS = ['📄', '📝', '📒', '📚', '💡', '🎯', '✅', '❤️', '🔥', '⭐', '🚀', '🐛', '🎨', '⚙️', '🔒', '📊', '🗂️', '🏠', '🌐', '💻'];

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="absolute z-50 w-56 bg-[#252525] border border-[#333] rounded-md shadow-xl p-3">
      <div className="grid grid-cols-5 gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-xl p-1 hover:bg-[#333] rounded"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="h-px bg-[#333] my-2" />
      <button
        onClick={() => { onSelect(''); onClose(); }}
        className="w-full text-left px-2 py-1 text-sm text-gray-400 hover:text-gray-200 hover:bg-[#333] rounded"
      >
        Remove icon
      </button>
    </div>
  );
}
