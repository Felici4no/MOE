"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/components/Shell";

/** Telas da empresa: quem é candidato volta para as próprias vagas. */
export function useAdmin() {
  const { me } = useMe();
  const router = useRouter();
  const admin = Boolean(me.tenant && me.tenant.role !== "participant");
  useEffect(() => { if (!admin) router.replace("/app"); }, [admin, router]);
  return admin;
}
