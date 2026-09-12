import AppSidebar from "./AppSidebar";
import HelpChatbot from "./HelpChatbot";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-[72px] md:ml-[260px] transition-all duration-300">
        {children}
      </main>
      <HelpChatbot />
    </div>
  );
}
