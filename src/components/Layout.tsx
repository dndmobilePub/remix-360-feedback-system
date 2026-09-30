import type { ReactNode } from "react";
import { MdArrowBackIosNew } from "react-icons/md";

interface LayoutProps {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Layout({ title, onBack, children, footer }: LayoutProps) {
  return (
    <div className="flex flex-col h-full bg-background-dark transition-colors duration-300">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background-dark/90 backdrop-blur-md border-b border-theme transition-colors duration-300">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-[20px] h-[20px] -ml-1 rounded-full active:bg-accent/10 transition-colors text-theme-main"
          >
            <MdArrowBackIosNew className="text-[18px]" />
          </button>
        ) : (
          <div className="w-[20px]" />
        )}
        <h1 className="text-[16px] font-bold tracking-tight text-theme-main">{title}</h1>
        <div className="w-[20px]" />
      </header>
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">{children}</main>
      {footer && (
        <footer className="fixed bottom-0 left-0 right-0 p-5 bg-background-dark/95 backdrop-blur-xl border-t border-theme z-40 max-w-md mx-auto transition-colors duration-300">
          {footer}
        </footer>
      )}
    </div>
  );
}
