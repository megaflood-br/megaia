import { requireUser } from "@/lib/auth";
import { InboxBoard } from "./inbox-board";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function ConversationsPage({ searchParams }: Props) {
  await requireUser();
  const params = await searchParams;
  return <InboxBoard initialTab={params.tab || "inbox"} />;
}
