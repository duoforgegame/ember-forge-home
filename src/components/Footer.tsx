import { Link } from "react-router-dom";
import logo from "@/assets/dfg-logo.png";

export function Footer() {
  return (
    <footer className="relative border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Duo Forge Games" className="h-10 w-10" width={40} height={40} />
          <div>
            <div className="font-display text-sm font-bold tracking-wider">DUO FORGE GAMES</div>
            <div className="text-xs text-muted-foreground">Games by gamers, for gamers.</div>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link to="/imprint" className="text-muted-foreground transition-colors hover:text-primary">
            Imprint
          </Link>
          <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-primary">
            Privacy Policy
          </Link>
        </nav>
        <div className="text-xs text-muted-foreground">
          © 2026 Duo Forge Games. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
