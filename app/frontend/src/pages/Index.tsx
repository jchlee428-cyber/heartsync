import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import RelationshipSection from "@/components/RelationshipSection";
import SolutionSection from "@/components/SolutionSection";
import BottomNav from "@/components/BottomNav";
import SkipToContent from "@/components/SkipToContent";
import Footer from "@/components/Footer";

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

      {/* PG 심사 승인 요건 준수 Footer */}
      <Footer className="pb-28" />

      <BottomNav />
    </div>
  );
}