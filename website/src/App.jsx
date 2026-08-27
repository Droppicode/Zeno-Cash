import React, { useState, useEffect, useRef } from 'react';
import { Download, Shield, Zap, Bell, CheckCircle2, TrendingUp, Search, Sun, Moon, LayoutDashboard, Cloud, Target, Palette, Smartphone, Database, Code, Brain, BarChart3, AppWindow } from 'lucide-react';
import mockupImage from './assets/mockup.jpg';
import './index.css';

const FadeInSection = ({ children }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    if (domRef.current) {
      observer.observe(domRef.current);
    }
    
    return () => {
      if (domRef.current) {
        observer.unobserve(domRef.current);
      }
    };
  }, []);

  return (
    <div className={`fade-in-section ${isVisible ? 'is-visible' : ''}`} ref={domRef}>
      {children}
    </div>
  );
};

function App() {
  const LATEST_RELEASE_URL = "https://github.com/Droppicode/Zeno-Cash/releases/latest";
  
  // Theme State
  const [isDark, setIsDark] = useState(true);
  
  // Scroll State for Navbar
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('zeno-theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    localStorage.setItem('zeno-theme', newTheme ? 'dark' : 'light');
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`${isScrolled ? 'nav-scrolled' : ''} ${isHidden ? 'nav-hidden' : ''}`}>
        <div className="container header-content">
          <a href="#" className="logo">
            <span>Zeno</span>Cash
          </a>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme">
              {isDark ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <a href={LATEST_RELEASE_URL} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.95rem' }}>
              Download APK
            </a>
          </nav>
        </div>
      </header>

      {/* Subtle Background Elements across the whole page */}
      <BarChart3 className="bg-element bg-element-1" size={150} />
      <Bell className="bg-element bg-element-2" size={120} />
      <AppWindow className="bg-element bg-element-3" size={180} />
      <Zap className="bg-element bg-element-4" size={140} />
      <Database className="bg-element bg-element-5" size={160} />
      <LayoutDashboard className="bg-element bg-element-6" size={130} />

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-content animate-slide-left">
              <h1>
                Effortless Control.<br />
                <span className="text-gradient">Complete Zen.</span>
              </h1>
              <p>
                Zeno Cash leverages Android Notification Listening to automatically track your expenses frictionlessly. Secure, offline-first, and beautifully customized.
              </p>
              <div className="hero-buttons">
                <a href={LATEST_RELEASE_URL} className="btn-primary">
                  <Download size={20} />
                  Download Latest
                </a>
                <a href="#features" className="btn-secondary">
                  <Search size={20} />
                  Explore
                </a>
              </div>
            </div>
            
            <div className="hero-image-wrapper animate-fade-in delay-2">
              <img src={mockupImage} alt="Zeno Cash Interface" className="floating-phone" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container">
          <FadeInSection>
            <div className="features-grid">
              <div className="feature-card glass">
                <div className="feature-icon">
                  <Brain size={24} />
                </div>
                <h3>AI Statement Automation</h3>
                <p>Use Artificial Intelligence to automatically scan and parse your bank statements, instantly converting them into categorized transactions.</p>
              </div>

              <div className="feature-card glass">
                <div className="feature-icon">
                  <Bell size={24} />
                </div>
                <h3>Automated Logging</h3>
                <p>Reads incoming bank notifications to instantly categorize and log your expenses without lifting a finger.</p>
              </div>
              
              <div className="feature-card glass">
                <div className="feature-icon">
                  <Zap size={24} />
                </div>
                <h3>Fast & Offline-First</h3>
                <p>Built with React Native and local SQLite. Your data is always accessible, even without an internet connection.</p>
              </div>

              <div className="feature-card glass">
                <div className="feature-icon">
                  <LayoutDashboard size={24} />
                </div>
                <h3>Home Screen Widgets</h3>
                <p>Track your balance and recent transactions directly from your Android home screen.</p>
              </div>

              <div className="feature-card glass">
                <div className="feature-icon">
                  <Target size={24} />
                </div>
                <h3>Macro Budgets</h3>
                <p>Set custom budget targets for essentials, lifestyle, and investments, and track your progress daily.</p>
              </div>

              <div className="feature-card glass">
                <div className="feature-icon">
                  <Palette size={24} />
                </div>
                <h3>Customizable Themes</h3>
                <p>Personalize your experience with multiple built-in color presets or create your own custom theme.</p>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* Tech Stack Section */}
        <section className="tech-stack">
          <div className="container">
            <FadeInSection>
              <h2>Powered by Modern Tech</h2>
              <div className="tech-grid">
                <div className="tech-item glass">
                  <Smartphone size={24} color="var(--accent-color)" />
                  React Native
                </div>
                <div className="tech-item glass">
                  <Code size={24} color="var(--accent-color)" />
                  Expo
                </div>
                <div className="tech-item glass">
                  <Database size={24} color="var(--accent-color)" />
                  SQLite
                </div>
                <div className="tech-item glass">
                  <Zap size={24} color="var(--accent-color)" />
                  Drizzle ORM
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Security Section */}
        <section className="security">
          <div className="container">
            <FadeInSection>
              <div className="security-box glass">
                <Shield size={64} color="var(--accent-color)" />
                <h2>Your Data. Your Rules.</h2>
                <p>
                  We believe financial data should be private. Zeno Cash stores all data locally on your device by default. Optional Google Sign-In is available if you want seamless cloud backups.
                </p>
                <div style={{ marginTop: '32px', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} color="var(--accent-color)" />
                    <span>No hidden servers</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cloud size={20} color="var(--accent-color)" />
                    <span>Google Drive Backups</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} color="var(--accent-color)" />
                    <span>Full export control</span>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-content">
          <a href="#" className="logo">
            <span>Zeno</span>Cash
          </a>
          <p>© {new Date().getFullYear()} Zeno Cash. Open Source Personal Finance.</p>
          <div className="footer-links" style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
            <a href="https://github.com/Droppicode/Zeno-Cash">GitHub Repository</a>
            <a href="https://github.com/Droppicode/Zeno-Cash/releases">Releases</a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;
