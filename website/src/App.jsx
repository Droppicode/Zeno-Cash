import React from 'react';
import { Download, Shield, Zap, Bell, CheckCircle2, TrendingUp, Search } from 'lucide-react';
import './index.css';

function App() {
  const LATEST_RELEASE_URL = "https://github.com/Droppicode/Zeno-Cash/releases/latest";

  return (
    <>
      <header className="glass">
        <div className="container header-content">
          <a href="#" className="logo">
            <span>Zeno</span>Cash
          </a>
          <nav>
            <a href={LATEST_RELEASE_URL} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.95rem' }}>
              Download APK
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <div className="hero-content animate-fade-in">
              <h1>
                Smart Finance.<br />
                <span className="text-gradient">Fully Automated.</span>
              </h1>
              <p>
                Zeno Cash leverages Android Notification Listening to automatically track your expenses frictionlessly. Secure, offline-first, and lightning fast.
              </p>
              <div className="hero-buttons">
                <a href={LATEST_RELEASE_URL} className="btn-primary">
                  <Download size={20} />
                  Download Latest Release
                </a>
                <a href="#features" className="btn-secondary">
                  <Search size={20} />
                  Explore Features
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container animate-fade-in delay-1">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2.5rem' }}>Why choose <span className="text-gradient">Zeno Cash?</span></h2>
          </div>
          
          <div className="features-grid">
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
                <TrendingUp size={24} />
              </div>
              <h3>Beautiful Analytics</h3>
              <p>Interactive charts, heatmaps, and spending insights to help you understand where your money goes.</p>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="security animate-fade-in delay-2">
          <div className="container">
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
                  <CheckCircle2 size={20} color="var(--accent-color)" />
                  <span>On-device processing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} color="var(--accent-color)" />
                  <span>Full export control</span>
                </div>
              </div>
            </div>
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
