interface PromptSuggestionButtonProps {
  text: string;
  onClick: () => void;
}

export default function PromptSuggestionButton({ text, onClick }: PromptSuggestionButtonProps) {
  return (
    <button className="prompt-suggestion-btn" onClick={onClick}>
      {text}
    </button>
  );
}
