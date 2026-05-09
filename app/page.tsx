/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  Send,
  Plus,
  MessageSquare,
  Bot,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Trash2,
  Copy,
  ChevronDown,
  Globe,
  Zap,
} from "lucide-react";

const MySwal = withReactContent(Swal);

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
};

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 (High Speed)" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7b" },
  { id: "gemma2-9b-it", name: "Gemma 2" },
];

export default function ChatInterface() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);

  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const [darkMode, setDarkMode] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const [modelMenuOpen, setModelMenuOpen] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(280);

  const isResizing = useRef(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // =========================
  // TEXTAREA AUTO HEIGHT
  // =========================

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height = Math.min(textarea.scrollHeight, 250) + "px";
  }, [message]);

  // =========================
  // TOAST
  // =========================

  const showToast = (msg: string) => {
    setToast(msg);

    setTimeout(() => {
      setToast(null);
    }, 2000);
  };

  // =========================
  // COPY
  // =========================

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);

      showToast("Copied to clipboard");
    } catch (error) {
      console.log(error);

      showToast("Copy failed");
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    const result = await MySwal.fire({
      title: "Logout?",
      text: "You will be redirected.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Logout",
      confirmButtonColor: "#ef4444",
      background: darkMode ? "#18181b" : "#fff",
      color: darkMode ? "#fff" : "#000",
    });

    if (!result.isConfirmed) return;

    // localStorage clear
    localStorage.removeItem("token");

    // cookie remove
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    // optional
    sessionStorage.clear();

    router.push("/login");
  };

  // =========================
  // SIDEBAR RESIZE
  // =========================

  const startResizing = () => {
    isResizing.current = true;

    document.addEventListener("mousemove", handleMouseMove);

    document.addEventListener("mouseup", stopResizing);

    document.body.style.cursor = "col-resize";
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;

    if (e.clientX > 180 && e.clientX < 500) {
      setSidebarWidth(e.clientX);
    }
  };

  const stopResizing = () => {
    isResizing.current = false;

    document.removeEventListener("mousemove", handleMouseMove);

    document.removeEventListener("mouseup", stopResizing);

    document.body.style.cursor = "default";
  };

  // =========================
  // FETCH CHATS
  // =========================

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/chat/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    fetchChats();

    const isDark = localStorage.getItem("theme") !== "light";

    setDarkMode(isDark);
  }, []);

  // =========================
  // THEME
  // =========================

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // =========================
  // AUTO SCROLL
  // =========================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // =========================
  // NEW CHAT
  // =========================

  const startNewChat = () => {
    setMessages([]);

    setCurrentChatId(null);

    setMobileSidebarOpen(false);
  };

  // =========================
  // OPEN CHAT
  // =========================

  const openConversation = async (chatId: string) => {
    if (loading) return;

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/chat/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setCurrentChatId(chatId);

        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);

      setMobileSidebarOpen(false);
    }
  };

  // =========================
  // DELETE CHAT
  // =========================

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();

    const result = await MySwal.fire({
      title: "Delete chat?",
      text: "All messages will be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
      background: darkMode ? "#18181b" : "#fff",
      color: darkMode ? "#fff" : "#000",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("token");

      await fetch(`/api/chat/${chatId}`, {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (currentChatId === chatId) {
        startNewChat();
      }

      fetchChats();

      showToast("Chat deleted");
    } catch (error) {
      console.log(error);
    }
  };

  // =========================
  // SEND MESSAGE
  // =========================

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);

    setMessage("");

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          chatId: currentChatId,

          messages: [...messages, userMsg],

          model: selectedModel.id,

          tools: isWebSearchEnabled ? ["tavily_search"] : [],
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(data.data.messages);

        setCurrentChatId(data.data.id);

        fetchChats();
      }
    } catch (error) {
      console.log(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SIDEBAR
  // =========================

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="p-4">
        <button
          onClick={startNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95"
        >
          <Plus size={20} className="text-blue-500" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        <p className="px-2 py-4 text-[11px] font-black text-zinc-400 uppercase tracking-widest">
          History
        </p>

        {conversations.map((chat) => (
          <div
            key={chat.id}
            onClick={() => openConversation(chat.id)}
            className={`group flex items-center gap-3 px-3 py-3.5 text-sm rounded-2xl cursor-pointer transition-all ${
              currentChatId === chat.id
                ? "bg-zinc-200 dark:bg-zinc-800 text-blue-600 font-bold"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            }`}
          >
            <MessageSquare size={18} className="shrink-0" />

            <span className="truncate flex-1 font-medium">{chat.title}</span>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2
                size={16}
                className="hover:text-red-500"
                onClick={(e) => deleteChat(e, chat.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden">
      {/* DESKTOP SIDEBAR */}

      <aside
        style={{
          width: `${sidebarWidth}px`,
        }}
        className="hidden md:flex flex-col bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 relative overflow-hidden"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Bot size={24} className="text-white" />
          </div>

          <span className="font-black text-2xl tracking-tighter italic">
            CHATBOT
          </span>
        </div>

        <SidebarContent />

        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/30"
        />
      </aside>

      {/* MAIN */}

      <main className="flex flex-1 flex-col relative h-full min-w-0 overflow-hidden">
        {/* HEADER */}

        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2"
            >
              <Menu size={22} />
            </button>

            {/* MODEL SELECT */}

            <div className="relative">
              <button
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="flex items-center gap-2 bg-zinc-200/60 dark:bg-zinc-800/60 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest"
              >
                <Zap size={14} className="text-yellow-500" />

                {selectedModel.name}

                <ChevronDown size={14} />
              </button>

              <AnimatePresence>
                {modelMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setModelMenuOpen(false)}
                    />

                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                        y: 10,
                      }}
                      className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-20 overflow-hidden"
                    >
                      {MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m);

                            setModelMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-4 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                            selectedModel.id === m.id ? "text-blue-500" : ""
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* WEB SEARCH */}

            <button
              onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isWebSearchEnabled
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-200/60 dark:bg-zinc-800/60"
              }`}
            >
              <Globe size={14} />

              <span className="hidden sm:inline">Web Search</span>
            </button>
          </div>

          {/* RIGHT ACTIONS */}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              {darkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <Bot size={100} className="mb-6" />

              <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                Intelligent System
              </h2>

              <p className="mt-2 font-bold tracking-widest">
                Select a model and start chatting
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`group relative max-w-[90%] md:max-w-[85%] rounded-3xl px-6 py-4 text-lg md:text-xl leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  {msg.content}

                  <button
                    onClick={() => copyToClipboard(msg.content)}
                    className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-2"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 p-5 bg-zinc-100 dark:bg-zinc-900 w-fit rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" />

                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />

                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}

        <div className="p-4 md:p-10 pt-0 max-w-4xl mx-auto w-full">
          <div className="relative flex items-end bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden p-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();

                  sendMessage();
                }
              }}
              placeholder="Message ChatBot..."
              className="w-full bg-transparent px-6 py-4 text-lg md:text-xl outline-none resize-none max-h-[250px] overflow-y-auto custom-scrollbar"
            />

            <button
              onClick={sendMessage}
              disabled={!message || loading}
              className="mb-1.5 mr-1.5 p-4 bg-blue-600 text-white rounded-[1.5rem] disabled:opacity-30"
            >
              <Send size={24} />
            </button>
          </div>

          <p className="text-center text-[10px] text-zinc-500 mt-4 font-medium uppercase tracking-widest opacity-50">
            Powered by Groq & Tavily Search
          </p>
        </div>
      </main>

      {/* MOBILE SIDEBAR */}

      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-50 md:hidden bg-black/70 backdrop-blur-md"
          >
            <motion.div
              initial={{
                x: -300,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: -300,
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-80 h-full bg-zinc-100 dark:bg-zinc-900 shadow-2xl"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <span className="font-black italic">CHATBOT</span>

                <button onClick={() => setMobileSidebarOpen(false)}>
                  <X size={26} />
                </button>
              </div>

              <SidebarContent />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 20,
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        body {
          overflow: hidden;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? "#27272a" : "#e4e4e7"};
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
