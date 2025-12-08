import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserProfile, apiKey?: string) => void;
  initialUser?: UserProfile | null;
  onCancel?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, initialUser, onCancel }) => {
  const [name, setName] = useState(initialUser?.name || '');
  const [avatar, setAvatar] = useState(initialUser?.avatar || '');
  const [apiKey, setApiKey] = useState('');
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [error, setError] = useState('');
  
  // Check if env key exists.
  // Note: Vite replaces process.env.API_KEY with the literal string value during build.
  // If it's an empty string, we treat it as missing.
  const hasEnvKey = !!process.env.API_KEY;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Pre-fill API key from local storage if available and not in env
    if (!hasEnvKey) {
      const storedKey = localStorage.getItem('lumina_api_key');
      if (storedKey) setApiKey(storedKey);
    }
  }, [hasEnvKey]);

  // Detect if the initial avatar is a custom upload or a generated one
  useEffect(() => {
    if (initialUser?.avatar && !initialUser.avatar.startsWith('https://api.dicebear.com')) {
      setIsCustomAvatar(true);
    }
  }, [initialUser]);

  // Update generated avatar when name changes, unless user uploaded a custom one
  useEffect(() => {
    if (!isCustomAvatar && name.trim()) {
      const seed = encodeURIComponent(name.trim());
      setAvatar(`https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=6366f1`);
    }
  }, [name, isCustomAvatar]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200; // Resize to max 200px
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setAvatar(dataUrl);
            setIsCustomAvatar(true);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!hasEnvKey && !apiKey.trim()) {
      setError('Please enter the Unlock Code (API Key) to continue.');
      return;
    }

    onLogin({ 
      name, 
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6366f1`
    }, apiKey.trim());
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200 mb-4">
            L
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {initialUser ? 'Edit Profile' : 'Welcome to Lumina'}
          </h2>
          <p className="text-gray-500 mt-2">
            {initialUser ? 'Update your personal details' : 'Unlock your AI Learning Companion'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div 
              className="relative w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md cursor-pointer group overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <i className="fas fa-user text-4xl"></i>
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-camera text-white text-xl"></i>
              </div>
            </div>
            <span className="text-xs text-gray-500">Tap to change photo</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
              placeholder="Enter your name"
            />
          </div>

          {!hasEnvKey && (
            <div className="bg-indigo-50 p-5 rounded-xl border-2 border-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <i className="fas fa-key text-6xl text-indigo-900"></i>
              </div>
              <label className="block text-base font-bold text-indigo-900 mb-2 flex items-center">
                <i className="fas fa-lock mr-2"></i>
                Unlock AI Access
              </label>
              <p className="text-xs text-indigo-700 mb-3">
                Enter your Google Gemini API Key below to activate the intelligence.
              </p>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-indigo-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all outline-none pl-10 bg-white shadow-inner font-mono text-sm"
                  placeholder="Paste API Code here..."
                  autoComplete="off"
                />
                <i className="fas fa-key absolute left-3 top-3.5 text-indigo-400"></i>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
             {onCancel && (
               <button
                 type="button"
                 onClick={onCancel}
                 className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
               >
                 Cancel
               </button>
             )}
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center"
            >
              {initialUser ? 'Save Changes' : (
                <>
                  <span className="mr-2">Unlock & Start</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;