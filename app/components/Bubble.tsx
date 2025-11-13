import type { UIMessage } from "ai";

interface BubbleProps {
  message: UIMessage;
}

export default function Bubble({ message }: BubbleProps) {
  const isUser = message.role === "user";

  // Extract text from message - handle both content and parts structure
  let text = "";
  if ('content' in message && typeof message.content === 'string') {
    text = message.content;
  } else if (message.parts) {
    const textParts = message.parts.filter(part => part.type === "text");
    text = textParts.map(part => (part as any).text).join("");
  }

  return (
    <div className={`bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}>
      <p>{text}</p>
    </div>
  );
}