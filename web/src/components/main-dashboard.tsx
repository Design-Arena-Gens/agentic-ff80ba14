"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BookSummary } from "@/lib/books";
import { LANGUAGE_OPTIONS } from "@/data/languages";

interface Props {
  books: BookSummary[];
  tags: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: { bookTitle?: string; section?: string; language?: string };
  timestamp: number;
}

interface BookDetailPayload {
  id: string;
  title: string;
  author: string;
  description: string;
  year: number;
  language: string;
  tags: string[];
  sections: { heading: string; paragraphs: string[] }[];
}

interface ChatResponse {
  answer: string;
  baseAnswer: string;
  targetLanguage: string;
  detectedLanguage: string;
  found: boolean;
  source: { id: string; title: string; section: string } | null;
}

const CHAT_SCOPE_OPTIONS = [
  { value: "book", label: "Selected Book" },
  { value: "library", label: "Entire Library" },
];

const formatLanguageName = (code: string) => {
  const match = LANGUAGE_OPTIONS.find((language) => language.code === code);
  return match ? `${match.name} (${match.code})` : code.toUpperCase();
};

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const MainDashboard = ({ books, tags }: Props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [activeBook, setActiveBook] = useState<BookSummary | null>(
    books.length ? books[0] : null,
  );
  const [activeBookDetail, setActiveBookDetail] =
    useState<BookDetailPayload | null>(null);
  const [bookDetailLoading, setBookDetailLoading] = useState(false);
  const [bookDetailError, setBookDetailError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatScope, setChatScope] = useState<(typeof CHAT_SCOPE_OPTIONS)[number]["value"]>("book");
  const [targetLanguage, setTargetLanguage] = useState("en");

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query);

      const matchesLanguage =
        languageFilter === "all" || book.language === languageFilter;

      const matchesTags =
        !selectedTags.length ||
        selectedTags.every((tag) => book.tags.includes(tag));

      return matchesQuery && matchesLanguage && matchesTags;
    });
  }, [books, searchTerm, languageFilter, selectedTags]);

  useEffect(() => {
    if (!activeBook) {
      return;
    }
    setBookDetailLoading(true);
    setBookDetailError(null);
    fetch(`/api/books/${activeBook.id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load book detail");
        }
        return response.json();
      })
      .then((payload) => {
        setActiveBookDetail(payload.book as BookDetailPayload);
      })
      .catch((error: Error) => {
        setBookDetailError(error.message);
      })
      .finally(() => setBookDetailLoading(false));
  }, [activeBook]);

  useEffect(() => {
    if (!filteredBooks.length) {
      setActiveBook(null);
      setActiveBookDetail(null);
    } else if (
      activeBook &&
      !filteredBooks.some((book) => book.id === activeBook.id)
    ) {
      setActiveBook(filteredBooks[0]);
    }
  }, [filteredBooks, activeBook]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) {
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        text: trimmed,
        timestamp: Date.now(),
      },
    ]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          bookId: activeBook?.id,
          scope: chatScope,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Chat service unavailable");
      }

      const payload: ChatResponse = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text: payload.answer,
          meta: {
            bookTitle: payload.source?.title,
            section: payload.source?.section,
            language: payload.targetLanguage,
          },
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while processing the request.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, activeBook?.id, chatScope, targetLanguage]);

  const [voiceText, setVoiceText] = useState("");
  useEffect(() => {
    const lastAssistantMessage = [...chatMessages]
      .reverse()
      .find((message) => message.role === "assistant");
    if (lastAssistantMessage) {
      setVoiceText(lastAssistantMessage.text);
    }
  }, [chatMessages]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur px-6 py-8 shadow-lg">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Orbital Library
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-300">
          Explore five hundred richly crafted volumes spanning intelligence,
          climate, health, finance, and culture. Search, read, and ask questions
          while our multilingual voice agent narrates answers sourced directly
          from each book.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-400">
          <span className="rounded-full border border-slate-700 px-3 py-1">
            500 PDF books
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1">
            10 languages supported
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1">
            Conversational AI companion
          </span>
        </div>
      </header>

      <main className="grid flex-1 gap-6 px-6 py-8 xl:grid-cols-[minmax(0,420px)_1fr]">
        <section className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl">
          <div className="border-b border-slate-800 p-6">
            <div className="flex flex-col gap-4">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, author, or description"
                className="w-full rounded-xl border border-transparent bg-slate-900 px-4 py-3 text-sm text-slate-100 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={languageFilter}
                  onChange={(event) => setLanguageFilter(event.target.value)}
                  className="rounded-xl border border-transparent bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">All interface languages</option>
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
                <select
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                  className="rounded-xl border border-transparent bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language.code} value={language.code}>
                      Answer in {language.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.slice(0, 24).map((tag) => {
                const isActive = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      isActive
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
              {tags.length > 24 && (
                <span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-500">
                  +{tags.length - 24} more
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-2">
              {filteredBooks.map((book) => {
                const isActive = activeBook?.id === book.id;
                return (
                  <li key={book.id}>
                    <button
                      type="button"
                      onClick={() => setActiveBook(book)}
                      className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-emerald-500/80 bg-emerald-500/10 shadow-lg shadow-emerald-950/40"
                          : "border-transparent bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <h3 className="text-base font-semibold text-slate-100">
                        {book.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {book.author} · {book.year} ·{" "}
                        {formatLanguageName(book.language)}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-300">
                        {book.description}
                      </p>
                    </button>
                  </li>
                );
              })}
              {!filteredBooks.length && (
                <li className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-400">
                  No books match the current filters. Adjust search terms or
                  tags to continue exploring.
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="grid gap-6">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-emerald-300">
                  {activeBook?.title ?? "Select a book to begin"}
                </h2>
                {activeBook && (
                  <p className="text-sm text-slate-400">
                    {activeBook.author} · {activeBook.year} ·{" "}
                    {formatLanguageName(activeBook.language)}
                  </p>
                )}
              </div>
              {activeBook && (
                <a
                  href={`/api/books/${activeBook.id}/pdf`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  Open PDF
                </a>
              )}
            </header>

            <div className="mt-4 min-h-[180px] space-y-4 text-sm text-slate-300">
              {bookDetailLoading && (
                <p className="animate-pulse text-slate-400">
                  Loading chapter insights…
                </p>
              )}
              {bookDetailError && (
                <p className="text-rose-400">
                  {bookDetailError}. Please choose another book.
                </p>
              )}
              {activeBookDetail && (
                <>
                  <p className="text-base text-slate-200">
                    {activeBookDetail.description}
                  </p>
                  <div className="space-y-3">
                    {activeBookDetail.sections.map((section) => (
                      <div
                        key={section.heading}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                          {section.heading}
                        </h3>
                        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-200">
                          {section.paragraphs.slice(0, 2).map((paragraph) => (
                            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {!activeBookDetail && !bookDetailLoading && !bookDetailError && (
                <p className="text-slate-400">
                  Choose a book to review chapters, open the PDF, and start a
                  conversational exploration.
                </p>
              )}
            </div>
          </article>

          <article className="grid rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6">
            <div className="flex flex-col gap-4">
              <header className="flex flex-wrap items-center gap-3">
                {CHAT_SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChatScope(option.value)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      chatScope === option.value
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </header>

              <div className="space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200 max-h-[320px]">
                {chatMessages.map((message) => (
                  <div key={message.id} className="space-y-1">
                    <p
                      className={`font-semibold ${
                        message.role === "assistant"
                          ? "text-emerald-300"
                          : "text-slate-300"
                      }`}
                    >
                      {message.role === "assistant" ? "Orbital Guide" : "You"}
                    </p>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-200">
                      {message.text}
                    </p>
                    {message.meta?.bookTitle && (
                      <p className="text-xs text-slate-500">
                        {message.meta.bookTitle} · {message.meta.section} ·{" "}
                        {formatLanguageName(message.meta.language ?? "en")}
                      </p>
                    )}
                  </div>
                ))}
                {!chatMessages.length && (
                  <p className="text-slate-400">
                    Ask anything about the selected book or the entire
                    collection. Try &ldquo;How do regenerative agriculture
                    cooperatives share data?&rdquo;
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask about a concept, chapter, or scenario…"
                  className="min-h-[100px] rounded-xl border border-transparent bg-slate-950/60 px-4 py-3 text-sm text-slate-100 shadow-inner transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  disabled={chatLoading || !chatInput.trim()}
                  onClick={handleSubmit}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-emerald-200"
                >
                  {chatLoading ? "Thinking…" : "Ask Orbital Guide"}
                </button>
              </div>
            </div>

            <VoiceAgentPanel
              text={voiceText}
              language={targetLanguage}
              onLanguageChange={setTargetLanguage}
            />
          </article>
        </section>
      </main>
    </div>
  );
};

const VoiceAgentPanel = ({
  text,
  language,
  onLanguageChange,
}: {
  text: string;
  language: string;
  onLanguageChange: (code: string) => void;
}) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("default");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !text.trim()) {
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    const voice =
      voices.find((candidate) => candidate.name === selectedVoice) ??
      voices.find((candidate) =>
        candidate.lang.toLowerCase().startsWith(language),
      );
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 lg:mt-0">
      <h3 className="text-base font-semibold text-emerald-300">
        Orbital Voice Agent
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        Listen to the latest answer read aloud. Select a language and voice to
        reach audiences around the world.
      </p>
      <div className="mt-4 space-y-3 text-sm">
        <label className="block text-xs uppercase tracking-wide text-slate-500">
          Voice language
        </label>
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          className="w-full rounded-xl border border-transparent bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <label className="block text-xs uppercase tracking-wide text-slate-500">
          Voice profile
        </label>
        <select
          value={selectedVoice}
          onChange={(event) => setSelectedVoice(event.target.value)}
          className="w-full rounded-xl border border-transparent bg-slate-900 px-4 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="default">System default</option>
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} — {voice.lang}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSpeak}
          disabled={!text.trim()}
          className={`w-full rounded-xl px-4 py-2 text-sm font-semibold transition ${
            speaking
              ? "bg-rose-500 text-rose-50 hover:bg-rose-400"
              : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
          } disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500`}
        >
          {speaking ? "Stop voice playback" : "Play latest answer"}
        </button>
        {!text.trim() && (
          <p className="text-xs text-slate-500">
            Send a question to receive an answer you can listen to.
          </p>
        )}
      </div>
    </div>
  );
};
