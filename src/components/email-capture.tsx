"use client";

import { useState } from "react";

export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[420px]">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F1010] p-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="h-10 flex-1 rounded-lg bg-transparent px-3 text-sm text-white placeholder:text-white/30 outline-none"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Join Waitlist
        </button>
      </div>
      {submitted ? (
        <p className="mt-2 text-left text-xs text-emerald-400">
          Thanks! You are on the list.
        </p>
      ) : null}
    </form>
  );
}
