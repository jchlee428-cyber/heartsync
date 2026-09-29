import { useState, useEffect } from "react";
import { Heart, User as UserIcon, LogIn, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@metagptx/web-sdk";
import LoginModal from "./LoginModal";
import { toast } from "sonner";

const client = createClient();

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await client.auth.me();
        if (res?.data) {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
          setLoading(false);
          return;
        }
      } catch {
        // Backend cold-starting or deploying, use cached user
      }
      const cached = localStorage.getItem("user");
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          setUser({ name: "회원", role: "user" });
        }
      } else {
        setUser({ name: "회원", role: "user" });
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await client.auth.logout();
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem("token");
    localStorage.setItem("isLougOutManual", "true");
    setUser(null);
    toast.success("로그아웃되었습니다.");
    if (location.pathname === "/my") {
      window.location.reload();
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-pink-100 shadow-[0_2px_12px_rgba(244,63,94,0.04)]" role="banner">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 sm:px-5 h-14">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 rounded-lg group"
            aria-label="HeartSync 홈으로 이동"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 text-white fill-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-black text-gray-900 tracking-tight">
              Heart<span className="text-pink-500">Sync</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate("/my")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 border border-pink-200/60 text-pink-700 text-xs font-bold transition-all"
                      title="마이페이지로 이동"
                    >
                      <div className="w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center text-[10px]">
                        {user.name ? user.name[0] : "♥"}
                      </div>
                      <span className="max-w-[70px] truncate">{user.name || "내 정보"}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="로그아웃"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow-sm shadow-pink-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>간편 로그인</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => checkUser()}
      />
    </>
  );
}