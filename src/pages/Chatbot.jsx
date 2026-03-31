import { useState } from "react";
import { Link } from "react-router-dom";

function getBotReply(message) {
  const text = message.toLowerCase();

  if (text.includes("pain")) {
    return "I am sorry you are in pain. Please rest, stay hydrated, and use a warm compress. If pain is severe, consider talking to a doctor.";
  }

  if (text.includes("sad")) {
    return "It is okay to feel this way. You are not alone. Try slow breathing, light movement, and speaking to someone you trust.";
  }

  if (text.includes("period")) {
    return "Periods are a normal part of the menstrual cycle. Tracking your dates can help you understand patterns and feel more prepared.";
  }

  return "I am here to support you. Tell me more about how you are feeling, and we can take one small step at a time.";
}

export default function Chatbot() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi, I am Sakhi support bot. You can share how you feel, and I will try to help.",
    },
  ]);

  function handleSend(event) {
    event.preventDefault();

    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    const botReply = getBotReply(trimmedMessage);

    setMessages((previousMessages) => [
      ...previousMessages,
      { sender: "user", text: trimmedMessage },
      { sender: "bot", text: botReply },
    ]);

    setInputMessage("");
  }

  return (
    <main className="page-shell">
      <section className="page-card chatbot-card">
        <h2>Sakhi Chatbot</h2>

        <div className="chat-history" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.sender}-${index}`} className={`chat-message ${message.sender}`}>
              <div className="chat-bubble">{message.text}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="chat-form">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
          />
          <button type="submit" className="btn-primary">
            Send
          </button>
        </form>

        <p className="link-row">
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
