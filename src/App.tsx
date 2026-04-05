import React, { useState, useEffect, useRef } from 'react';
import Groq from 'groq-sdk';
import ReactMarkdown from 'react-markdown';

const Background = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let nodes: any[] = [];
    const NUM_NODES = 40;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    for (let i = 0; i < NUM_NODES; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2
      });
    }

    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.02;

        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 160) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            const alpha = (1 - dist/160) * 0.15;
            ctx.strokeStyle = `rgba(0,245,255,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      nodes.forEach(n => {
        const glow = Math.sin(n.pulse) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,255,${0.3 + glow * 0.4})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(drawNetwork);
    };
    drawNetwork();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="bg-canvas" className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
};

const Particles = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      const colors = ['var(--primary)', 'var(--secondary)', '#00ff88'];
      p.style.cssText = `
        left: ${Math.random() * 100}vw;
        bottom: -10px;
        --dx: ${(Math.random() - 0.5) * 200}px;
        animation-duration: ${Math.random() * 8 + 6}s;
        animation-delay: ${Math.random() * 4}s;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        box-shadow: 0 0 4px ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 14000);
    }, 600);
    return () => clearInterval(interval);
  }, []);
  return null;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'chat' | 'code' | 'image'>('chat');
  const [messages, setMessages] = useState<{role: string, content: string, time: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [notif, setNotif] = useState({ show: false, icon: '', text: '' });
  
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgStyle, setImgStyle] = useState('Realistic');
  const [imgSize, setImgSize] = useState('512x512');
  const [generatedImg, setGeneratedImg] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [imgError, setImgError] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Gunakan fallback 'missing_api_key' agar aplikasi tidak crash saat pertama kali dimuat jika API key belum diatur
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'missing_api_key', dangerouslyAllowBrowser: true });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getTime = () => new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});

  const showNotif = (icon: string, text: string) => {
    setNotif({ show: true, icon, text });
    setTimeout(() => setNotif(n => ({ ...n, show: false })), 3000);
  };

  const getSystemPrompt = () => {
    const base = `Kamu adalah Zamzz.AI, asisten digital cerdas berbahasa Indonesia yang dibuat oleh Nizam DzR.Dev </>. Kamu sangat membantu, ramah, dan berpengetahuan luas terutama di bidang teknologi dan programming.

Tentang dirimu:
- Nama: Zamzz.AI
- Dibuat oleh: Nizam DzR.Dev </> (pelajar SMP di SMPN 1 IBUN, web developer & software engineer muda)
- Teknologi: Berbasis Groq AI (Llama 3)
- Kemampuan: Coding (semua bahasa), analisis, penjelasan konsep, dan banyak lagi

Tentang Nizam DzR.Dev </>:
- Pelajar SMP di SMPN 1 IBUN
- Web developer dan software engineer muda berbakat
- Menguasai: Next.js, React, Node.js, database, frontend, backend
- Proyek: portofolio web, AI, gateway web, bot Telegram/WhatsApp, aplikasi mobile & desktop
- Developer muda dengan potensi besar di teknologi

Panduan respons:
- Selalu berbahasa Indonesia yang baik dan menarik
- Untuk kode, berikan kode yang lengkap dan bisa langsung digunakan
- Gunakan format markdown (bold, code blocks, dll)
- Bersikap antusias dan supportif
- Selalu siap membantu dengan detail`;

    if (mode === 'code') {
      return base + `\n\nMODE AKTIF: CODE GENERATOR
Fokus pada pembuatan kode berkualitas tinggi. Selalu:
- Berikan kode lengkap dan fungsional
- Tambahkan komentar penjelasan
- Jelaskan cara menjalankan/menggunakannya
- Sarankan optimasi jika ada`;
    }
    return base;
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const newMsg = { role: 'user', content: textToSend, time: getTime() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })) as any[];

      const response = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: getSystemPrompt() },
          ...history,
          { role: 'user', content: textToSend }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.85,
        max_tokens: 4096,
      });

      const reply = response.choices[0]?.message?.content || 'Maaf, tidak ada respons.';
      setMessages(prev => [...prev, { role: 'bot', content: reply, time: getTime() }]);
    } catch (err: any) {
      let errorMessage = `Terjadi kesalahan: ${err.message}`;
      
      // Handle specific API errors gracefully
      if (err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = '⚠️ Maaf, batas penggunaan (kuota) AI sedang habis atau terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.';
      } else if (err.message.includes('API_KEY_INVALID') || err.message.includes('401') || err.message.includes('missing_api_key')) {
        errorMessage = '❌ GROQ API Key tidak valid atau belum dikonfigurasi. Pastikan Anda telah menambahkan GROQ_API_KEY di pengaturan Vercel atau AI Studio.';
      }

      setMessages(prev => [...prev, { role: 'bot', content: errorMessage, time: getTime() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const generateImage = () => {
    if (!imgPrompt.trim()) {
      showNotif('⚠️', 'Isi deskripsi gambar dulu!');
      return;
    }
    
    setIsGeneratingImg(true);
    setGeneratedImg('');
    setImgError(false);
    
    const [w, h] = imgSize.split('x');
    const fullPrompt = encodeURIComponent(`${imgPrompt}, ${imgStyle} style, high quality, detailed, ${w}x${h}`);
    const seed = Math.floor(Math.random() * 99999);
    const imgUrl = `https://image.pollinations.ai/prompt/${fullPrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true`;
    
    setGeneratedImg(imgUrl);
  };

  const handleImageLoad = () => {
    setIsGeneratingImg(false);
    showNotif('✅', 'Gambar berhasil dibuat!');
  };

  const handleImageError = () => {
    setIsGeneratingImg(false);
    setImgError(true);
    showNotif('❌', 'Gagal generate. Coba lagi!');
  };

  return (
    <>
      <Background />
      <div className="grid-overlay"></div>
      <div className="scanlines"></div>
      <div className="corner-deco corner-tl"></div>
      <div className="corner-deco corner-tr"></div>
      <div className="corner-deco corner-bl"></div>
      <div className="corner-deco corner-br"></div>
      <Particles />

      <div className={`notif ${notif.show ? 'show' : ''}`}>
        <span className="notif-icon">{notif.icon}</span>
        <span>{notif.text}</span>
      </div>

      <div id="splash" className={showSplash ? '' : 'hidden'}>
        <div className="splash-logo">ZAMZZ.AI</div>
        <div className="splash-subtitle">ASISTEN DIGITAL CERDAS</div>
        <div className="splash-bar"><div className="splash-progress"></div></div>
        <div className="splash-text">MEMUAT SISTEM AI...</div>
      </div>

      <div id="app" style={{ opacity: showSplash ? 0 : 1, transition: 'opacity 0.8s' }} className="flex flex-col h-screen overflow-hidden relative z-10">
        <header>
          <div className="header-logo">
            <div className="logo-icon">Z</div>
            <div className="logo-text">
              <h1>ZAMZZ.AI</h1>
              <span>ASISTEN DIGITAL v2.0</span>
            </div>
          </div>
          <div className="header-status">
            <div className="status-dot"></div>
            <span className="status-text">ONLINE · GROQ API</span>
          </div>
          <div className="header-nav">
            <button className={`nav-btn ${mode === 'chat' ? 'active' : ''}`} onClick={() => setMode('chat')}>💬 CHAT</button>
            <button className={`nav-btn ${mode === 'code' ? 'active' : ''}`} onClick={() => setMode('code')}>⌨️ KODE</button>
            <button className={`nav-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>🎨 GAMBAR</button>
            <button className="nav-btn" onClick={() => setIsAboutOpen(true)}>👤 TENTANG</button>
          </div>
        </header>

        <div className="main-layout">
          <div className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label">⚡ Pertanyaan Cepat</div>
              <div className="quick-prompt" onClick={() => handleSendMessage('Siapa itu Nizam DzR.Dev?')}>
                <div className="qp-icon">👨‍💻</div>
                <div className="qp-text">Siapa itu Nizam DzR.Dev &lt;/&gt; ?</div>
              </div>
              <div className="quick-prompt" onClick={() => handleSendMessage('Apa saja kemampuan Zamzz.AI?')}>
                <div className="qp-icon">🤖</div>
                <div className="qp-text">Kemampuan Zamzz.AI</div>
              </div>
              <div className="quick-prompt" onClick={() => handleSendMessage('Buatkan kode website sederhana menggunakan HTML, CSS dan JavaScript')}>
                <div className="qp-icon">💻</div>
                <div className="qp-text">Buat website HTML/CSS/JS</div>
              </div>
              <div className="quick-prompt" onClick={() => handleSendMessage('Jelaskan cara membuat REST API dengan Node.js')}>
                <div className="qp-icon">🛠️</div>
                <div className="qp-text">Tutorial REST API Node.js</div>
              </div>
              <div className="quick-prompt" onClick={() => handleSendMessage('Apa itu kecerdasan buatan (AI) dan bagaimana cara kerjanya?')}>
                <div className="qp-icon">🧠</div>
                <div className="qp-text">Penjelasan tentang AI</div>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">🚀 Fitur Unggulan</div>
              <div className="feature-pill code" onClick={() => setMode('code')}>
                <span>⌨️</span> Code Generator
              </div>
              <div className="feature-pill image" onClick={() => setMode('image')}>
                <span>🎨</span> Image Creator
              </div>
              <div className="feature-pill analyze" onClick={() => {
                setMode('chat');
                setInput('Analisis dan debug kode berikut:\n');
              }}>
                <span>🔍</span> Code Analyzer
              </div>
              <div className="feature-pill web" onClick={() => handleSendMessage('Berikan tips dan trik programming terbaru untuk developer')}>
                <span>💡</span> Dev Tips
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">📊 Statistik AI</div>
              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-val">{messages.filter(m => m.role === 'user').length}</span>
                  <span className="stat-lbl">Pesan</span>
                </div>
                <div className="stat-card">
                  <span className="stat-val">∞</span>
                  <span className="stat-lbl">Kapasitas</span>
                </div>
                <div className="stat-card">
                  <span className="stat-val">30+</span>
                  <span className="stat-lbl">Bahasa</span>
                </div>
                <div className="stat-card">
                  <span className="stat-val">24/7</span>
                  <span className="stat-lbl">Online</span>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-label">🔑 Status API</div>
              <div style={{background:'rgba(0,245,255,0.04)', border:'1px solid rgba(0,245,255,0.1)', borderRadius:'8px', padding:'10px'}}>
                <div style={{fontSize:'0.72rem', color:'var(--text-muted)', fontFamily:"'Share Tech Mono',monospace", marginBottom:'6px'}}>GROQ API KEY</div>
                <div style={{fontSize:'0.75rem', color:'#00ff88', fontFamily:"'Share Tech Mono',monospace"}}>✅ Terhubung (Env)</div>
              </div>
            </div>
          </div>

          {mode !== 'image' && (
            <div className="chat-container">
              {messages.length === 0 && (
                <div id="welcome-banner">
                  <div className="welcome-ai-orb">Z</div>
                  <div className="welcome-greeting">Halo, aku Zamzz.AI !</div>
                  <p className="welcome-desc">
                    Yaitu <strong>Asisten Digital</strong> atau AI (Kecerdasan Buatan) yang dibuat dan diciptakan oleh <strong>Nizam DzR.Dev &lt;/&gt;</strong> — siap membantumu membuat kode, menjawab pertanyaan, menganalisis data, dan banyak lagi.
                  </p>
                  <div className="welcome-chips">
                    <div className="chip" onClick={() => handleSendMessage('Siapa itu Nizam DzR.Dev?')}>👨‍💻 Siapa Nizam DzR.Dev?</div>
                    <div className="chip" onClick={() => handleSendMessage('Buatkan aplikasi Todo List dengan HTML, CSS, JavaScript yang lengkap dan modern')}>💻 Buat Todo App</div>
                    <div className="chip" onClick={() => handleSendMessage('Jelaskan konsep Machine Learning untuk pemula')}>🧠 Machine Learning</div>
                    <div className="chip" onClick={() => handleSendMessage('Buatkan REST API sederhana dengan Node.js dan Express')}>⚡ Node.js API</div>
                    <div className="chip" onClick={() => handleSendMessage('Apa saja fitur yang bisa dilakukan Zamzz.AI?')}>🤖 Fitur Zamzz.AI</div>
                    <div className="chip" onClick={() => handleSendMessage('Jelaskan perbedaan Frontend dan Backend development')}>🌐 Frontend vs Backend</div>
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <div id="messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={`msg-row ${msg.role}`}>
                      <div className="msg-avatar">{msg.role === 'bot' ? 'Z' : 'U'}</div>
                      <div className="msg-bubble">
                        {msg.role === 'bot' ? (
                          <div className="markdown-body">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content.split('\n').map((line, j) => <React.Fragment key={j}>{line}<br/></React.Fragment>)
                        )}
                      </div>
                      <div className="msg-time">{msg.time}</div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="msg-row bot">
                      <div className="msg-avatar">Z</div>
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}

          {mode === 'image' && (
            <div id="image-panel" className="active">
              <div className="img-gen-card">
                <div className="img-gen-title">🎨 AI IMAGE CREATOR</div>
                <p style={{fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:'16px', lineHeight:'1.6'}}>
                  Deskripsikan gambar yang ingin kamu buat. Zamzz.AI akan menggunakan kekuatan AI untuk menciptakannya. <br/><span style={{color:'#ff6eb4'}}>⚠️ Fitur ini menggunakan Pollinations AI untuk rendering gambar.</span>
                </p>
                <textarea 
                  className="img-textarea" 
                  value={imgPrompt}
                  onChange={(e) => setImgPrompt(e.target.value)}
                  placeholder="Contoh: robot futuristik di kota neon cyberpunk, cinematic, 4K detail..."
                />
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px'}}>
                  <div>
                    <label className="block text-[0.8rem] font-semibold text-[var(--primary)] mb-2 tracking-wider uppercase font-['Share_Tech_Mono']">Gaya</label>
                    <select value={imgStyle} onChange={(e) => setImgStyle(e.target.value)} style={{width:'100%', padding:'10px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(123,47,247,0.2)', borderRadius:'8px', color:'var(--text-main)', fontFamily:"'Rajdhani',sans-serif", outline:'none'}}>
                      <option>Realistic</option>
                      <option>Anime</option>
                      <option>Digital Art</option>
                      <option>Cyberpunk</option>
                      <option>Watercolor</option>
                      <option>3D Render</option>
                      <option>Pixel Art</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.8rem] font-semibold text-[var(--primary)] mb-2 tracking-wider uppercase font-['Share_Tech_Mono']">Ukuran</label>
                    <select value={imgSize} onChange={(e) => setImgSize(e.target.value)} style={{width:'100%', padding:'10px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(123,47,247,0.2)', borderRadius:'8px', color:'var(--text-main)', fontFamily:"'Rajdhani',sans-serif", outline:'none'}}>
                      <option>512x512</option>
                      <option>768x512</option>
                      <option>512x768</option>
                      <option>1024x1024</option>
                    </select>
                  </div>
                </div>
                <button className="img-gen-btn" onClick={generateImage} disabled={isGeneratingImg}>
                  {isGeneratingImg ? '⏳ GENERATING...' : '✨ GENERATE GAMBAR'}
                </button>
              </div>
              
              <div className={`img-result ${generatedImg || isGeneratingImg || imgError ? 'visible' : ''}`}>
                {isGeneratingImg && !generatedImg && (
                  <div className="img-placeholder">
                    <span>🔄</span>
                    <div>Sedang membuat gambar...</div>
                    <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>{imgPrompt.substring(0,50)}...</div>
                  </div>
                )}
                {generatedImg && (
                  <>
                    <img 
                      src={generatedImg} 
                      alt="Generated" 
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      style={{display: isGeneratingImg ? 'none' : 'block'}}
                    />
                    {isGeneratingImg && (
                      <div className="img-placeholder">
                        <img src={generatedImg} alt="Loading" style={{opacity: 0, position: 'absolute', width: '1px', height: '1px'}} onLoad={handleImageLoad} onError={handleImageError} />
                        <span>🔄</span>
                        <div>Sedang memuat gambar dari AI...</div>
                      </div>
                    )}
                    {!isGeneratingImg && !imgError && (
                      <div style={{marginTop:'12px', textAlign:'center'}}>
                        <button onClick={() => showNotif('✅','Klik kanan pada gambar untuk menyimpan!')} style={{padding:'8px 20px', background:'rgba(123,47,247,0.15)', border:'1px solid rgba(123,47,247,0.3)', borderRadius:'8px', color:'#b06aff', cursor:'pointer', fontSize:'0.8rem', fontFamily:"'Rajdhani',sans-serif", fontWeight:600, transition:'all 0.3s'}}>
                          💾 Simpan Gambar
                        </button>
                      </div>
                    )}
                  </>
                )}
                {imgError && (
                  <div className="img-placeholder">
                    <span>❌</span>
                    <div>Gagal memuat gambar</div>
                    <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>Coba ulangi dengan prompt berbeda</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {mode !== 'image' && (
          <div className="input-area">
            <div className="mode-tabs">
              <div className={`mode-tab ${mode === 'chat' ? 'active-chat' : ''}`} onClick={() => setMode('chat')}>💬 Chat</div>
              <div className={`mode-tab ${mode === 'code' ? 'active-code' : ''}`} onClick={() => setMode('code')}>⌨️ Kode</div>
              <div className={`mode-tab ${mode === 'image' ? 'active-image' : ''}`} onClick={() => setMode('image')}>🎨 Gambar</div>
            </div>
            <div className={`input-wrapper ${mode === 'code' ? 'border-[rgba(0,245,255,0.3)] shadow-[0_0_20px_rgba(0,245,255,0.08)]' : ''}`}>
              <textarea 
                id="user-input" 
                rows={1} 
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'code' ? 'Deskripsikan kode yang ingin dibuat... (Python, JS, PHP, dll)' : 'Tanya apapun ke Zamzz.AI... (Shift+Enter untuk baris baru)'}
              />
              <div className="input-actions">
                <button className="send-btn" onClick={() => handleSendMessage()}>
                  {isLoading ? <div className="spinner"></div> : '➤'}
                </button>
              </div>
            </div>
            <div className="input-hint">SHIFT+ENTER untuk baris baru · ENTER untuk kirim · dibuat oleh Nizam DzR.Dev &lt;/&gt;</div>
          </div>
        )}
      </div>

      {/* About Modal */}
      <div className={`modal-overlay ${isAboutOpen ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setIsAboutOpen(false); }}>
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title">TENTANG PENGEMBANG</div>
            <button className="modal-close" onClick={() => setIsAboutOpen(false)}>✕</button>
          </div>
          <div className="dev-card">
            <div className="dev-avatar">N</div>
            <div className="dev-name">Nizam DzR.Dev &lt;/&gt;</div>
            <div className="dev-title">// WEB DEVELOPER · SOFTWARE ENGINEER · AI CREATOR</div>
            <div className="dev-desc">
              <strong style={{color:'var(--primary)'}}>Nizam DzR.Dev&lt;/&gt;</strong> adalah pengembang di balik Zamzz.AI, sebuah kecerdasan buatan atau asisten digital. Ia merupakan pelajar SMP di <strong style={{color:'#b06aff'}}>SMPN 1 IBUN</strong> yang telah berhasil menjadi web developer dan software engineer muda dengan kemampuan tinggi di bidang teknologi informasi.
              <br/><br/>
              Nizam menguasai berbagai bahasa pemrograman, termasuk <strong style={{color:'var(--primary)'}}>Next.js</strong>, serta memiliki keahlian dalam database, analisis data, dan pengembangan frontend maupun backend. Ia telah mengerjakan banyak proyek, seperti portofolio situs web, AI, gateway situs web, bot Telegram/WhatsApp, serta aplikasi seluler dan desktop.
              <br/><br/>
              Dengan pengalaman dan proyek yang terus berkembang, Nizam DzR.Dev menjadi salah satu developer muda yang memiliki <strong style={{color:'#00ff88'}}>potensi besar</strong> di dunia teknologi.
            </div>
            <div className="skill-tags">
              <span className="skill-tag t1">Next.js</span>
              <span className="skill-tag t1">React</span>
              <span className="skill-tag t2">Node.js</span>
              <span className="skill-tag t2">Database</span>
              <span className="skill-tag t3">Frontend</span>
              <span className="skill-tag t3">Backend</span>
              <span className="skill-tag t4">AI Dev</span>
              <span className="skill-tag t4">Bot Dev</span>
              <span className="skill-tag t1">Mobile App</span>
              <span className="skill-tag t2">Desktop App</span>
            </div>
          </div>
          <div style={{background:'rgba(0,245,255,0.04)', border:'1px solid rgba(0,245,255,0.1)', borderRadius:'12px', padding:'16px'}}>
            <div style={{fontFamily:"'Orbitron',monospace", fontSize:'0.85rem', color:'var(--primary)', marginBottom:'8px'}}>🤖 TENTANG ZAMZZ.AI</div>
            <div style={{fontSize:'0.83rem', color:'var(--text-dim)', lineHeight:'1.7'}}>
              Zamzz.AI adalah asisten digital berbasis AI yang ditenagai oleh <strong style={{color:'var(--primary)'}}>Groq API (Llama 3)</strong>. Dirancang untuk membantu developer, pelajar, dan siapapun yang membutuhkan bantuan di bidang teknologi, coding, dan berbagai topik lainnya.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
