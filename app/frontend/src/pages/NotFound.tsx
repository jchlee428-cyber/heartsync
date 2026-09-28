import { useNavigate } from "react-router-dom";
import { Heart, Home } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white flex items-center justify-center px-5">
      <div className="text-center">
        <Heart className="w-16 h-16 text-pink-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-gray-500 text-sm mb-6">요청하신 페이지가 존재하지 않아요.</p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Home className="w-4 h-4" />
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}