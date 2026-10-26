import { redirect } from "next/navigation";

// Requests are gone: wanting to meet someone is private until it's mutual, and then it's a chat.
// Old links and notifications still land somewhere useful.
export default function RequestsPage() {
  redirect("/connections");
}
