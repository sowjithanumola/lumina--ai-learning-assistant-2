import React, { useState, useRef, useEffect } from 'react';
import { Message, Sender, Subject, ConceptGraphData, UserProfile } from './types';
import { geminiService } from './services/geminiService';
import { SUBJECT_ICONS, SUBJECT_COLORS } from './constants';
import ConceptMap from './components/ConceptMap';
import ProgressChart from './components/ProgressChart';
import LoginScreen from './components/LoginScreen';

// Icons
const SendIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const AttachmentIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const MagicIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
const LoadingSpinner = () => <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const [activeSubject, setActiveSubject] = useState<Subject>(Subject.General);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: Sender.Bot,
      text: "Hi! I'm Lumina. Choose a subject and let's start learning!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string } | null>(null);
  
  // Advanced features state
  const [conceptData, setConceptData] = useState<ConceptGraphData | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  
  // Dynamic Progress State
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({
    [Subject.General]: 0,
    [Subject.Math]: 0,
    [Subject.Science]: 0,
    [Subject.History]: 0,
    [Subject.Literature]: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load user from local storage
    try {
      const savedUser = localStorage.getItem('lumina_user');
      const savedSessions = localStorage.getItem('lumina_sessions');
      
      const hasApiKey = geminiService.hasKey();

      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
        // Force login/unlock if no key is present, even if user data is there
        setShowLogin(!hasApiKey);
      } else {
        setShowLogin(true);
      }

      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        // Merge with default to ensure all keys exist
        setSessionCounts(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
  }, []);

  useEffect(() => {
    if (!showProgress) {
      scrollToBottom();
    }
  }, [messages, isTyping, showProgress, isGeneratingImage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = (user: UserProfile, apiKey?: string) => {
    try {
      setCurrentUser(user);
      localStorage.setItem('lumina_user', JSON.stringify(user));
      
      if (apiKey) {
        geminiService.setApiKey(apiKey);
      }

      setShowLogin(false);
      setShowProfileEdit(false);
    } catch (e) {
      alert("Failed to save profile. Image might be too large.");
      console.error(e);
    }
  };

  const handleLogout = () => {
    // Clear user session
    setCurrentUser(null);
    localStorage.removeItem('lumina_user');
    
    // Reset Chat History and App State
    setMessages([
      {
        id: '1',
        sender: Sender.Bot,
        text: "Hi! I'm Lumina. Choose a subject and let's start learning!",
        timestamp: new Date()
      }
    ]);
    setActiveSubject(Subject.General);
    setConceptData(null);
    setShowProgress(false);
    setInputText('');
    setAttachedImage(null);
    
    // Show login screen
    setShowLogin(true);
    setShowProfileEdit(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setAttachedImage({
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const updateSessionCounts = () => {
    const newSessionCounts = { ...sessionCounts, [activeSubject]: (sessionCounts[activeSubject] || 0) + 1 };
    setSessionCounts(newSessionCounts);
    localStorage.setItem('lumina_sessions', JSON.stringify(newSessionCounts));
  };

  const handleApiKeyError = (error: any) => {
    console.error("API Key Error:", error);
    if (error.message === "API_KEY_MISSING" || error.message?.includes("API key")) {
      alert("Please enter a valid API Key to continue.");
      setShowLogin(true);
    }
  };

  const handleGenerateImage = async () => {
    if (!inputText.trim()) {
      alert("Please describe the image you want to generate.");
      return;
    }

    updateSessionCounts();
    
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: `Generate image: ${inputText}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsGeneratingImage(true);

    try {
      const base64Image = await geminiService.generateImage(userMsg.text.replace('Generate image: ', ''));
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.Bot,
        text: "Here is the image you requested:",
        timestamp: new Date(),
        attachments: [{
          type: 'image',
          data: base64Image,
          mimeType: 'image/jpeg'
        }]
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      if (error.message === "API_KEY_MISSING") {
        handleApiKeyError(error);
      } else {
        console.error(error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: Sender.Bot,
          text: "Sorry, I couldn't generate that image. Please try a different description.",
          timestamp: new Date()
        }]);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !attachedImage) return;

    updateSessionCounts();

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: inputText,
      timestamp: new Date(),
      attachments: attachedImage ? [{ type: 'image', data: attachedImage.data, mimeType: attachedImage.mimeType }] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setIsTyping(true);

    const apiHistory = messages.map(m => ({
      role: m.sender === Sender.User ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    try {
      // This will throw if key is missing
      const stream = geminiService.streamChat(activeSubject, apiHistory as any, userMsg.text, imageToSend || undefined);
      
      const botMsgId = (Date.now() + 1).toString();
      let fullText = '';
      let groundingUrls: string[] = [];

      setMessages(prev => [...prev, {
        id: botMsgId,
        sender: Sender.Bot,
        text: '',
        timestamp: new Date(),
        isStreaming: true
      }]);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
        }

        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          chunk.candidates[0].groundingMetadata.groundingChunks.forEach((c: any) => {
            if (c.web?.uri) groundingUrls.push(c.web.uri);
          });
        }

        setMessages(prev => prev.map(m => 
          m.id === botMsgId 
            ? { ...m, text: fullText, groundingUrls: Array.from(new Set(groundingUrls)) } 
            : m
        ));
      }

      setMessages(prev => prev.map(m => 
        m.id === botMsgId ? { ...m, isStreaming: false } : m
      ));

      if (fullText.length > 200 && (activeSubject === Subject.Science || activeSubject === Subject.History)) {
         const topic = userMsg.text.substring(0, 50);
         geminiService.generateConceptMap(topic).then(data => {
            setConceptData(data);
         }).catch(() => {});
      }

    } catch (error: any) {
      if (error.message === "API_KEY_MISSING") {
        handleApiKeyError(error);
        // Remove the loading message if it was added
        setMessages(prev => prev.filter(m => !m.isStreaming));
      } else {
        console.error(error);
        setMessages(prev => prev.map(m => 
          m.isStreaming 
            ? { ...m, isStreaming: false, text: "I'm sorry, I encountered an error. Please check your connection or API key." } 
            : m
        ));
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Convert raw session counts to data for the chart
  const progressData = Object.entries(sessionCounts).map(([subject, count]) => ({
    subject,
    sessions: Number(count),
    score: Math.min(Number(count) * 5, 100) // Mock score derived from engagement
  }));

  const totalSessions: number = (Object.values(sessionCounts) as number[]).reduce((a, b) => Number(a) + Number(b), 0);

  if (showLogin) {
    return <LoginScreen onLogin={handleLogin} initialUser={currentUser} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden font-sans">
      
      {showProfileEdit && currentUser && (
        <LoginScreen 
          onLogin={handleLogin} 
          initialUser={currentUser} 
          onCancel={() => setShowProfileEdit(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
            L
          </div>
          <span className="ml-3 font-bold text-xl text-gray-800 hidden md:block tracking-tight">Lumina</span>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {Object.values(Subject).map((subject) => (
            <button
              key={subject}
              onClick={() => { setActiveSubject(subject); setConceptData(null); setShowProgress(false); }}
              className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${
                activeSubject === subject && !showProgress
                  ? `${SUBJECT_COLORS[subject]} text-white shadow-md shadow-gray-200` 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <i className={`fas ${SUBJECT_ICONS[subject]} w-6 text-center text-lg ${activeSubject === subject && !showProgress ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500'}`}></i>
              <span className="ml-3 font-medium hidden md:block text-sm">{subject}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
           <button 
            onClick={() => setShowProgress(true)}
            className={`w-full flex items-center p-3 rounded-xl transition-all ${showProgress ? 'bg-gray-800 text-white shadow-md' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <i className={`fas fa-chart-line w-6 text-center ${showProgress ? 'text-white' : 'text-gray-400'}`}></i>
            <span className="ml-3 font-medium hidden md:block text-sm">My Progress</span>
          </button>

          {/* User Profile Snippet */}
          {currentUser && (
            <div className="pt-2">
              <button 
                onClick={() => setShowProfileEdit(true)}
                className="w-full flex items-center p-2 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <img src={currentUser.avatar} alt="Profile" className="w-9 h-9 rounded-full object-cover shadow-sm bg-gray-200" />
                <div className="ml-3 text-left hidden md:block overflow-hidden">
                  <p className="text-sm font-semibold text-gray-700 truncate">{currentUser.name}</p>
                  <p className="text-xs text-gray-400 truncate">Edit Profile</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative">
        
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-6 z-10 sticky top-0">
          <div className="flex items-center">
            {showProgress ? (
              <h1 className="text-lg font-bold text-gray-800 flex items-center">
                 <i className="fas fa-chart-line text-gray-500 mr-2"></i> Dashboard
              </h1>
            ) : (
              <h1 className="text-lg font-bold text-gray-800 flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${SUBJECT_COLORS[activeSubject].replace('bg-', 'text-current bg-')}`}></span>
                {activeSubject}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-3">
             <div className="text-xs font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-500 hidden sm:block">
              {showProgress ? 'Analytics View' : (activeSubject === Subject.Math ? 'Pro Reasoning Mode' : 'Standard Mode')}
            </div>
            <button 
              onClick={handleLogout} 
              className="text-xs text-red-500 hover:text-red-600 font-medium px-2"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </header>

        {/* Content Area */}
        {showProgress ? (
           <div className="flex-1 p-6 overflow-y-auto">
             <div className="max-w-5xl mx-auto h-full flex flex-col">
                <div className="mb-6 flex-shrink-0">
                  <h2 className="text-2xl font-bold text-gray-800">Learning Dashboard</h2>
                  <p className="text-gray-500">Track your study sessions and performance.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                   {/* Fix height for Recharts responsive container */}
                   <div className="h-[400px] lg:h-[500px] w-full">
                       {totalSessions > 0 ? (
                         <ProgressChart data={progressData} />
                       ) : (
                         <div className="h-full bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                           <i className="fas fa-chart-bar text-4xl mb-3"></i>
                           <p>No activity yet.</p>
                           <p className="text-sm">Start chatting to see your progress!</p>
                         </div>
                       )}
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                      <h3 className="font-bold text-gray-800 mb-4">Learner Profile</h3>
                      <div className="flex items-center mb-6">
                        <img src={currentUser?.avatar} className="w-16 h-16 rounded-full mr-4 border-2 border-indigo-100 object-cover" />
                        <div>
                          <p className="font-bold text-lg">{currentUser?.name}</p>
                          <p className="text-sm text-gray-500">Level {Math.floor(totalSessions / 10) + 1} Student</p>
                        </div>
                      </div>
                      <ul className="space-y-3">
                        <li className="flex items-center text-sm text-gray-600 p-3 bg-yellow-50 rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mr-3"><i className="fas fa-trophy"></i></span>
                          <div>
                            <span className="block font-semibold text-gray-800">Dedication</span>
                            Completed {totalSessions} total interactions
                          </div>
                        </li>
                        <li className="flex items-center text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3"><i className="fas fa-clock"></i></span>
                          <div>
                            <span className="block font-semibold text-gray-800">Active Learner</span>
                            Currently studying {activeSubject}
                          </div>
                        </li>
                      </ul>
                   </div>
                </div>
             </div>
           </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === Sender.Bot && (
                     <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shadow-sm">L</div>
                  )}
                  <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${msg.sender === Sender.User ? 'items-end' : 'items-start'}`}>
                    
                    {/* Attachments (Images) */}
                    {msg.attachments?.map((att, idx) => (
                      <div key={idx} className="mb-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm max-w-xs">
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-auto" />
                      </div>
                    ))}

                    {/* Text Bubble */}
                    <div className={`p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap ${
                      msg.sender === Sender.User 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
                    }`}>
                      {msg.text}
                      {msg.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle"></span>}
                    </div>

                    {/* Grounding Sources */}
                    {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 bg-white border border-gray-100 p-2 rounded-lg shadow-sm w-full">
                        <span className="font-semibold block mb-1">Sources:</span>
                        <div className="flex flex-wrap gap-2">
                          {msg.groundingUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline truncate max-w-[200px] block">
                              {new URL(url).hostname}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.sender === Sender.User && currentUser && (
                     <img src={currentUser.avatar} className="w-8 h-8 rounded-full flex-shrink-0 ml-2 mt-1 shadow-sm object-cover bg-gray-200" alt="User" />
                  )}
                </div>
              ))}

              {isGeneratingImage && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shadow-sm">L</div>
                  <div className="p-4 rounded-2xl shadow-sm bg-white border border-gray-200 text-gray-500 text-sm flex items-center">
                    <LoadingSpinner />
                    <span className="ml-2">Dreaming up your image...</span>
                  </div>
                </div>
              )}
              
              {conceptData && messages.length > 1 && (
                <div className="w-full max-w-4xl mx-auto animate-fade-in-up">
                   <ConceptMap data={conceptData} />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-xl flex-shrink-0 transition-colors ${attachedImage ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-200'}`}
                  title="Upload Image"
                >
                  <AttachmentIcon />
                </button>
                
                {/* Generate Image Button */}
                <button
                  onClick={handleGenerateImage}
                  disabled={!inputText.trim() || isGeneratingImage || isTyping}
                  className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
                     !inputText.trim() || isGeneratingImage || isTyping
                     ? 'text-gray-300' 
                     : 'text-amber-500 hover:bg-amber-50'
                  }`}
                  title="Generate Image from Text"
                >
                  <MagicIcon />
                </button>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {attachedImage && (
                    <div className="flex items-center gap-2 mb-2 p-1 bg-indigo-50 rounded text-xs text-indigo-700">
                      <span className="truncate">Image attached</span>
                      <button onClick={() => setAttachedImage(null)} className="hover:text-red-500"><i className="fas fa-times"></i></button>
                    </div>
                  )}
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={`Ask ${activeSubject} anything...`}
                    className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-gray-700 placeholder-gray-400"
                    rows={1}
                    style={{ height: inputText.length > 50 ? 'auto' : '2.5rem' }}
                  />
                </div>

                <button 
                  onClick={handleSend}
                  disabled={(!inputText.trim() && !attachedImage) || isTyping || isGeneratingImage}
                  className={`p-2 rounded-xl flex-shrink-0 transition-all ${
                    (!inputText.trim() && !attachedImage) || isTyping || isGeneratingImage
                      ? 'bg-gray-200 text-gray-400' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                  }`}
                >
                  {isTyping ? <LoadingSpinner /> : <SendIcon />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;