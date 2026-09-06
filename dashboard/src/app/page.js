"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { authHeaders } from "@/lib/api/client";

export default function Home() {
  const { user, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState("testtrader@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [header, setHeader] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
  };

  const handleShowHeader = async () => {
    setHeader(await authHeaders());
  };

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return (
      <form onSubmit={handleSignIn} style={{ padding: 24 }}>
        <h1>Sign in</h1>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="password"
        />
        <button type="submit">Sign in</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Signed in as {user.email}</h1>
      <p>User ID: {user.id}</p>
      <p>
        <Link href="/orders">View orders</Link>
      </p>
      <button onClick={handleShowHeader}>Show authHeaders()</button>
      {header && <pre>{JSON.stringify(header, null, 2)}</pre>}
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
