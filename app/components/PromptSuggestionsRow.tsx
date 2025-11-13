import PromptSuggestionButton from "./PromptSuggestionButton";

interface PromptSuggestionsRowProps {
  onPromptClick: (prompt: string) => void;
}

export default function PromptSuggestionsRow({ onPromptClick }: PromptSuggestionsRowProps) {
  const prompts = [
    "Who is head of racing for Aston Martin's F1 Academy team?",
    "Who is the highest paid F1 driver?",
    "Who will be the newest driver for Ferrari?",
    "Who is the current Formula One World Driver's Champion?",
  ];
  return (
    <div className="prompt-suggestions-row">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton key={index} text={prompt} onClick={() => onPromptClick(prompt)} />
      ))}
    </div>
  );
}
