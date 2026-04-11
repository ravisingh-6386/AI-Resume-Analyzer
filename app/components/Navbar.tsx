import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../lib/auth";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = "profile-menu";

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

  const openMenu = () => {
    setShowMenu(true);
    window.setTimeout(() => logoutButtonRef.current?.focus(), 0);
  };

  const closeMenu = () => {
    setShowMenu(false);
    menuButtonRef.current?.focus();
  };

  return (
    <nav className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-7xl rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.1)] backdrop-blur-xl md:w-[calc(100%-2.5rem)] md:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
        <Link to="/" className="shrink-0">
          <p className="bg-gradient-to-r from-slate-900 via-indigo-700 to-slate-900 bg-clip-text text-xl font-bold tracking-tight text-transparent md:text-2xl">
            RESUMIND
          </p>
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle />

          <Link
            to="/upload"
            className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_26px_rgba(79,70,229,0.34)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            Upload Resume
          </Link>

          {user && (
            <div className="relative" ref={menuContainerRef}>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => (showMenu ? setShowMenu(false) : openMenu())}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openMenu();
                  }

                  if (event.key === "Escape") {
                    setShowMenu(false);
                  }
                }}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/80 bg-gradient-to-r from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-[0_6px_16px_rgba(79,70,229,0.25)] ring-1 ring-indigo-100/70 transition-all duration-200 hover:scale-[1.03] hover:brightness-105 hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                aria-label="Open profile menu"
                aria-expanded={showMenu}
                aria-haspopup="menu"
                aria-controls={menuId}
              >
                {user.name.charAt(0).toUpperCase()}
              </button>

              {showMenu && (
                <div
                  id={menuId}
                  className="profile-dropdown-enter absolute right-0 z-50 mt-2.5 w-64 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95"
                  role="menu"
                  aria-label="User menu"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeMenu();
                    }
                  }}
                >
                  <div className="rounded-xl px-3 py-3">
                    <p className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{user.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </div>

                  <div className="my-1 border-t border-slate-200/90 dark:border-slate-700/90" />

                  <button
                    ref={logoutButtonRef}
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors duration-200 hover:bg-rose-50/90 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 dark:text-rose-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                    role="menuitem"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M15 8.5L19 12m0 0l-4 3.5M19 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 4h-6a3 3 0 00-3 3v10a3 3 0 003 3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
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
