"use client";

import { useRouter } from "next/navigation";
import { ContactCard, type ContactPayload } from "@/components/contact-card";

export function ContactDetail({ initial }: { initial: ContactPayload }) {
  const router = useRouter();
  return (
    <ContactCard
      contact={initial}
      onSaved={() => router.refresh()}
      onDeleted={() => {
        router.push("/app/crm");
        router.refresh();
      }}
    />
  );
}
