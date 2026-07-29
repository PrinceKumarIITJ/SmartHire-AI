"use client";

import { useState } from "react";
import axios from "axios";
import { Send, Bot, User, FileText, Sparkles } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface CandidateChatWidgetProps {
  candidateId: string;
  candidateName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

export default function CandidateChatWidget({ candidateId, candidateName }: CandidateChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I am SmartHire Assistant. Ask me anything about ${candidateName}'s resume. My answers are grounded strictly in retrieved resume chunks with citations.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userQuery = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setSending(true);

    try {
      const res = await axios.post(`${API_BASE}/candidates/${candidateId}/chat`, {
        message: userQuery,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          citations: res.data.citations,
        },
      ]);
    } catch (err) {
      console.error("Chat error", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, an error occurred while searching the resume chunks.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl glass-panel border border-white/10 flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Candidate Resume Chat (RAG) <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </h3>
            <p className="text-[11px] text-gray-400">Query {candidateName}'s resume in natural language</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${msg.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
          >
            <div
              className={`p-2 rounded-xl text-xs flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-indigo-300 border border-white/10"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={`space-y-1.5 max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-none"
                    : "bg-black/50 text-gray-200 border border-white/5 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 justify-start">
                  {msg.citations.map((cite, cIdx) => (
                    <span
                      key={cIdx}
                      className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1"
                    >
                      <FileText className="w-2.5 h-2.5" />
                      {cite}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Retrieving resume chunks & generating answer...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-black/40 flex items-center space-x-2">
        <input
          type="text"
          placeholder={`Ask about ${candidateName}'s experience, skills, or projects...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
