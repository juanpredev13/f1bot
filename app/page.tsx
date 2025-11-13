"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";
import { useState } from "react";

export default function Home() {
  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/chat' })
  });
  const [input, setInput] = useState("");
  const noMessages = !messages || messages.length === 0;
  const isLoading = status === "streaming";

  return (
    <main className="main-container">
      <div className="welcome-section">
        <h1>Meet your new F1 AI Companion</h1>
        <p className="welcome-subtitle">
          Chat with an AI that gets you intuitive, instant, and always ready to assist.
        </p>
      </div>
      <section className={noMessages ? "no-messages-container" : "chat-container"}>
        {noMessages ? (
          <>
            <p className="starter-text">
              The Ultimate place for Formula One super fans!
              <br />
              Ask F1GPT anything about the fantastic topic of F1 racing
              <br />
              and it will come back with the most up-to-date answers.
              <br />
              We hope you enjoy!
            </p>
            <br />
            <PromptSuggestionsRow onPromptClick={(prompt) => {
              sendMessage({ text: prompt });
            }} />
          </>
        ) : (
          <>
            {messages.map((message, index) => (
              <Bubble key={index} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}>
          <input
            className="question-box"
            type="text"
            placeholder="Ask F1GPT anything about F1 racing"
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
