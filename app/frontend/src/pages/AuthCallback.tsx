import { useEffect } from 'react';
import { client } from '../lib/api';

export default function AuthCallback() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const fromUrl = params.get('from_url');
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('isLougOutManual', 'false');
        if (fromUrl && fromUrl.startsWith('/')) {
          window.location.href = fromUrl;
          return;
        }
      }
    } catch {
      // Fallback to SDK default behavior
    }
    client.auth.login();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">인증 처리 중입니다...</p>
      </div>
    </div>
  );
}
