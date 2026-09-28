import { Link } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import RelationshipSection from "@/components/RelationshipSection";
import SolutionSection from "@/components/SolutionSection";
import BottomNav from "@/components/BottomNav";
import SkipToContent from "@/components/SkipToContent";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white">
      <SkipToContent />
      <Header />
      <main id="main-content">
        <HeroSection />
        <RelationshipSection />
        <SolutionSection />
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-5 pb-28 pt-8">
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <Link to="/terms" className="hover:text-gray-600 transition-colors">
              이용약관
            </Link>
            <span className="text-gray-200">|</span>
            <Link to="/privacy" className="hover:text-gray-600 transition-colors font-semibold">
              개인정보처리방침
            </Link>
            <span className="text-gray-200">|</span>
            <Link to="/about" className="hover:text-gray-600 transition-colors">
              회사소개
            </Link>
          </div>
          <p className="text-center text-[11px] text-gray-300 mt-3">
            © 2024 HeartSync. All rights reserved.
          </p>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}