import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownItem } from "@ui/components/ui/dropdown/DropdownItem";
import { Dropdown } from "@ui/components/ui/dropdown/Dropdown";
import { useAuth } from "../context/AuthContext";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/auth/signin", { replace: true });
  };

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="dropdown-toggle flex items-center text-gray-700 dark:text-gray-400"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-500 font-semibold text-white">
          {initial}
        </span>
        {user?.name && (
          <span className="mr-1 hidden font-medium text-theme-sm sm:block">{user.name}</span>
        )}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="border-b border-gray-200 pb-3 dark:border-gray-800">
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {user?.name || "Usuário"}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user?.email || ""}
          </span>
        </div>
        <DropdownItem
          onItemClick={handleLogout}
          className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        >
          Sair
        </DropdownItem>
      </Dropdown>
    </div>
  );
}
