/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Settings,
  ChevronDown,
  Wrench,
  Plus,
  MessageSquare,
  Bot,
  Sun,
  Moon,
  Search,
  Code,
  Globe,
} from "lucide-react";


export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [selectedModel] = useState("Groq AI");
  const [darkMode, setDarkMode] = useState(true);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /**
   * ------------------------
   * THEME
   * ------------------------
   */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  /**
   * ------------------------
   * AUTO SCROLL
   * ------------------------
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  /**
   * ------------------------
   * TOGGLE TOOL
   * ------------------------
   */
  const toggleTool = (tool: string) => {
    setActiveTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  };

  /**
   * ------------------------
   * SEND MESSAGE
   * ------------------------
   */
  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: message,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    setMessage("");

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messages: updatedMessages,

          tools: activeTools,
        }),
      });

      const data = await res.json();

      setMessages([
        ...updatedMessages,

        {
          role: "assistant",
          content: data.message || "No response",
        },
      ]);
    } catch (error) {
      console.log(error);

      setMessages([
        ...updatedMessages,

        {
          role: "assistant",
          content: "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ------------------------
   * ENTER SEND
   * ------------------------
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      sendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        <div className="p-4">
          <button
            onClick={() => setMessages([])}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              New Chat
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="px-2 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            History
          </p>

          <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-zinc-600 dark:text-zinc-400">
            <MessageSquare size={16} />

            <span className="truncate">
              {messages[0]?.content || "No conversations yet"}
            </span>
          </div>
        </div>

        {/* Bottom Sidebar Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}

            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col relative h-full">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-6 py-3 sticky top-0 z-10">
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
              <span className="font-bold text-lg">{selectedModel}</span>

              <ChevronDown size={16} className="text-zinc-500" />
            </button>
          </div>

          <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
            <Settings size={20} className="text-zinc-500" />
          </button>
        </header>

        {/* MESSAGE AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <Bot size={64} className="mx-auto" />

              <h2 className="text-2xl font-semibold">
                How can I help you today?
              </h2>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                        : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-zinc-200 dark:bg-zinc-800 animate-pulse">
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 pt-0 max-w-3xl mx-auto w-full space-y-4">
          {/* Tool Selection Row */}
          <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
            <span className="text-xs font-semibold text-zinc-500 mr-2 flex items-center gap-1">
              <Wrench size={12} /> TOOLS:
            </span>

            <ToolChip
              icon={<Globe size={14} />}
              label="Web Search"
              active={activeTools.includes("web")}
              onClick={() => toggleTool("web")}
            />

            <ToolChip
              icon={<Code size={14} />}
              label="Code Interpreter"
              active={activeTools.includes("code")}
              onClick={() => toggleTool("code")}
            />

            <ToolChip
              icon={<Search size={14} />}
              label="File Analysis"
              active={activeTools.includes("file")}
              onClick={() => toggleTool("file")}
            />
          </div>

          {/* Input */}
          <div className="relative flex items-center group">
            <textarea
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              className="w-full resize-none rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg transition-all"
            />

            <button
              onClick={sendMessage}
              disabled={!message || loading}
              className="absolute right-2.5 p-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>

          <p className="text-center text-[10px] text-zinc-400 uppercase tracking-widest">
            Experimental AI Environment • 2026
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * ------------------------
 * TOOL CHIP
 * ------------------------
 */
function ToolChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        active
          ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
          : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
      }`}
    >
      {icon}

      {label}
    </button>
  );
}
