import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Heart, Mail, Sparkles, User, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  redirectUrl?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  redirectUrl,
}: LoginModalProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleLogin = async (
    provider: "kakao" | "naver" | "google" | "email" | "demo",
    extraData?: { email?: string; name?: string }
  ) => {
    setLoadingProvider(provider);
    try {
      const response = await fetch("/api/v1/auth/social-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          email: extraData?.email || (provider === "email" ? email : undefined),
          name: extraData?.name || (provider === "email" ? name : undefined),
        }),
      });

      if (!response.ok) {
        let errorMessage = "로그인 처리에 실패했습니다.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          if (response.status === 404) {
            errorMessage = "백엔드 서버와 연결할 수 없습니다. (Render 서버가 배포 중이거나 준비 중입니다.)";
          } else if (response.status >= 500) {
            errorMessage = "서버가 시작 중이거나 일시적으로 응답하지 않습니다. 10~20초 후 다시 시도해주세요.";
          }
        }
        throw new Error(errorMessage);
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error("서버 응답 형식이 올바르지 않습니다.");
      }
      const token = data.token;
      const user = data.user;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("isLougOutManual", "false");

        const providerNames: Record<string, string> = {
          kakao: "카카오",
          naver: "네이버",
          google: "Google",
          email: "이메일",
          demo: "체험",
        };

        toast.success(
          `💕 ${providerNames[provider] || ""} 간편 로그인이 완료되었습니다!`,
          {
            description: `${user.name || "회원"}님, 환영합니다.`,
          }
        );

        onSuccess?.(user);
        onClose();

        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          // If no specific redirect, reload to sync auth state across page
          window.location.reload();
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-pink-100 rounded-3xl">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-red-400 p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
            HeartSync 시작하기
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-pink-100 mt-1 font-medium">
            1초 간편 로그인으로 소중한 진단 결과를 안전하게 보관하세요
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4 bg-white">
          {/* 1위: 카카오 로그인 (2030 선호도 압도적 1위) */}
          <button
            onClick={() => handleLogin("kakao", { name: "카카오 회원" })}
            disabled={!!loadingProvider}
            className="w-full relative flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-black text-[15px] bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] transition-all duration-200 shadow-sm active:scale-98 disabled:opacity-50"
          >
            {loadingProvider === "kakao" ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#191919]" />
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.766 1.87 5.187 4.708 6.551-.194.698-.707 2.53-.81 2.923-.13.486.177.48.374.348.156-.104 2.47-1.69 3.475-2.378.736.104 1.493.158 2.253.158 5.523 0 10-3.477 10-7.767C22 6.477 17.523 3 12 3z" />
                </svg>
                <span>카카오로 1초 만에 시작하기</span>
                <span className="absolute right-3.5 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  2030 1위
                </span>
              </>
            )}
          </button>

          {/* 2위: 네이버 로그인 */}
          <button
            onClick={() => handleLogin("naver", { name: "네이버 회원" })}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-bold text-[15px] bg-[#03C75A] hover:bg-[#02B350] text-white transition-all duration-200 shadow-sm active:scale-98 disabled:opacity-50"
          >
            {loadingProvider === "naver" ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M16.273 12.845L7.376 0H0v24h7.726V11.155L16.624 24H24V0h-7.727z" />
                </svg>
                <span>네이버로 시작하기</span>
              </>
            )}
          </button>

          {/* 3위: Google 로그인 */}
          <button
            onClick={() => handleLogin("google", { name: "구글 회원" })}
            disabled={!!loadingProvider}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-bold text-[14px] bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all duration-200 shadow-xs active:scale-98 disabled:opacity-50"
          >
            {loadingProvider === "google" ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google 계정으로 로그인</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-3 text-gray-400 font-medium">
                또는 이메일 / 테스트 계정
              </span>
            </div>
          </div>

          {/* Email toggle & form */}
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>이메일 주소로 로그인 / 회원가입</span>
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) {
                  toast.warning("이메일을 입력해주세요.");
                  return;
                }
                handleLogin("email");
              }}
              className="space-y-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-100"
            >
              <input
                type="email"
                placeholder="이메일 주소 (예: user@example.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                required
              />
              <input
                type="text"
                placeholder="이름 / 닉네임 (선택 사항)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <button
                type="submit"
                disabled={!!loadingProvider}
                className="w-full py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
              >
                {loadingProvider === "email" ? "로그인 중..." : "이메일로 계속하기"}
              </button>
            </form>
          )}

          {/* 빠른 체험 데모 계정 (개발 및 테스트용 원클릭 칩) */}
          <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100/70">
            <p className="text-[11px] font-bold text-pink-700 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              빠른 커플 체험 계정 (원클릭 로그인):
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  handleLogin("demo", {
                    name: "지민 (여성 파트너)",
                    email: "jimin@heartsync.co.kr",
                  })
                }
                disabled={!!loadingProvider}
                className="flex-1 py-1.5 px-2 bg-white hover:bg-pink-100 text-gray-700 hover:text-pink-700 text-[11px] font-semibold rounded-xl border border-pink-200 shadow-2xs transition-all active:scale-95"
              >
                👩 지민 (파트너 A)
              </button>
              <button
                onClick={() =>
                  handleLogin("demo", {
                    name: "민준 (남성 파트너)",
                    email: "minjun@heartsync.co.kr",
                  })
                }
                disabled={!!loadingProvider}
                className="flex-1 py-1.5 px-2 bg-white hover:bg-blue-100 text-gray-700 hover:text-blue-700 text-[11px] font-semibold rounded-xl border border-pink-200 shadow-2xs transition-all active:scale-95"
              >
                👨 민준 (파트너 B)
              </button>
            </div>
          </div>

          {/* Privacy & Terms */}
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            로그인 시 HeartSync의{" "}
            <a href="/terms" className="underline hover:text-gray-600">
              이용약관
            </a>{" "}
            및{" "}
            <a href="/privacy" className="underline hover:text-gray-600">
              개인정보 처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
