"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

/** Puerta de entrada: manda al dashboard si hay sesion, si no al login. */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center text-slate-400">
      Redirigiendo…
    </main>
  );
}
