import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-pink-50/50 via-white to-pink-50/30 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-pink-100 text-center">
            <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">화면을 불러오는 중 문제가 발생했습니다</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              일시적인 네트워크 지연이나 캐시 문제일 수 있습니다. 아래 버튼을 눌러 페이지를 새로고침해주세요.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-md hover:from-pink-600 hover:to-rose-600 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                페이지 다시 불러오기
              </button>
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="w-full py-3 px-4 rounded-xl bg-gray-50 text-gray-700 font-bold text-sm border border-gray-200 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
