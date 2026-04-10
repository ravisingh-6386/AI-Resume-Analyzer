import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../lib/auth";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuContainerRef.current) return;
      if (!menuContainerRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <nav className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-7xl rounded-3xl border border-white/70 bg-white/85 px-4 py-3 shadow-[0_14px_36px_rgba(15,23,42,0.1)] backdrop-blur-xl md:w-[calc(100%-2.5rem)] md:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
        <Link to="/" className="shrink-0">
          <p className="bg-gradient-to-r from-slate-900 via-indigo-700 to-slate-900 bg-clip-text text-xl font-bold tracking-tight text-transparent md:text-2xl">
          RESUMIND
          </p>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            to="/upload"
            className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(79,70,229,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            Upload Resume
          </Link>

          {user && (
            <div className="relative" ref={menuContainerRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-bold text-white transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                aria-label="Open profile menu"
                aria-expanded={showMenu}
                aria-haspopup="menu"
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                  role="menu"
                >
                  <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                    role="menuitem"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
