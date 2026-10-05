import CopilotHUD from "@/components/CopilotHUD";

export const metadata = {
  title: "AI Interview & Meeting Copilot ($0 Free-Tier)",
  description: "Real-time multimodal speech and screen technical copilot",
};

export default function Page() {
  return (
    <main className="w-full h-screen bg-slate-950 overflow-hidden">
      <CopilotHUD />
    </main>
  );
}
