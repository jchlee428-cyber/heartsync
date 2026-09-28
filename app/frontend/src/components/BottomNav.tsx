import { useEffect, useState } from "react";
import { Home, ClipboardCheck, MessageCircle, Building2, UserCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";

const client = createClient();

const navItems = [
  { icon: Home, label: "홈", path: "/" },
  { icon: ClipboardCheck, label: "진단", path: "/diagnosis" },
  { icon: Building2, label: "회사소개", path: "/about" },
  { icon: MessageCircle, label: "챗봇코치", path: "/chatbot" },
  { icon: UserCircle, label: "마이", path: "/my" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const user = await client.auth.me();
      if (!user?.data) return;
      const res = await client.apiCall.invoke({
        url: "/api/v1/notifications/unread-count",
        method: "GET",
        data: {},
      });
      setUnreadCount(res.data?.count || 0);
    } catch {
      // Silent failure
    }
  };

  const getActive = () => {
    if (location.pathname === "/") return "/";
    if (location.pathname === "/diagnosis") return "/diagnosis";
    if (location.pathname === "/chatbot") return "/chatbot";
    if (location.pathname === "/about") return "/about";
    if (location.pathname === "/my") return "/my";
    if (location.pathname.startsWith("/result")) return "/diagnosis";
    return "/";
  };

  const active = getActive();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-pink-100"
      role="navigation"
      aria-label="하단 메뉴"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = active === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-1 ${
                isActive
                  ? "text-pink-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              aria-label={`${label}${path === "/my" && unreadCount > 0 ? ` (읽지 않은 알림 ${unreadCount}개)` : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive ? "scale-110" : ""
                }`}
                fill={isActive ? "currentColor" : "none"}
                aria-hidden="true"
              />
              <span
                className={`text-[10px] font-medium transition-all ${
                  isActive ? "font-semibold" : ""
                }`}
                aria-hidden="true"
              >
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-500" aria-hidden="true" />
              )}
              {/* Unread notification badge on "마이" tab */}
              {path === "/my" && unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 animate-pulse"
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}