import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Brain, Code, Download, Globe, HandCoins, Layers,
  Lock, Palette, Receipt, ShieldCheck, Sparkles, WifiOff,
} from 'lucide-react';
import homeShot from './assets/screens/home.webp';
import debtsShot from './assets/screens/debts.webp';
import groupShot from './assets/screens/group.webp';
import analyticsShot from './assets/screens/analytics.webp';
import transactionsShot from './assets/screens/transactions.webp';
import settingsShot from './assets/screens/settings.webp';
import assistantShot from './assets/screens/assistant-proposal.webp';
import logoUrl from './assets/logo.png';
import { COPY, initialLang } from './i18n';
import './index.css';

const LATEST_RELEASE_URL = 'https://github.com/Droppicode/Zeno-Cash/releases/latest';
const DEMO_URL = 'https://zeno-cash.vercel.app/';
const REPO_URL = 'https://github.com/Droppicode/Zeno-Cash';

const STEP_SHOTS = [homeShot, debtsShot, groupShot, analyticsShot, assistantShot];

const FEATURE_META = [
  { icon: HandCoins, size: 'wide' },
  { icon: Layers },
  { icon: Receipt },
  { icon: Brain, size: 'tall' },
  { icon: BarChart3 },
  { icon: Palette, size: 'wide' },
  { icon: ShieldCheck, size: 'wider' },
];

const STAT_VALUES = [
  { value: 100, suffix: '%' },
  { value: 3, suffix: '' },
  { value: 0, suffix: '' },
  { value: 20, suffix: '+' },
];

function useReveal(lang) {
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const limit = window.innerHeight * 0.92;
      document.querySelectorAll('.reveal:not(.in)').forEach(node => {
        if (node.getBoundingClientRect().top < limit) node.classList.add('in');
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [lang]);
}

function useScrollVars() {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const y = window.scrollY;
      root.style.setProperty('--scroll', `${y}`);
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty('--progress', `${max > 0 ? y / max : 0}`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

function CountUp({ value, suffix }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / 1400);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref}>{shown}{suffix}</span>;
}

function Phone({ src, alt, className = '' }) {
  return (
    <div className={`phone ${className}`}>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

function Showcase({ t }) {
  const steps = t.steps.map(([tag, title, text], index) => ({ tag, title, text, shot: STEP_SHOTS[index] }));
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let next = 0;
      refs.current.forEach((node, index) => {
        if (node && node.getBoundingClientRect().top < mid) next = index;
      });
      setActive(next);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section id="showcase" className="showcase">
      <div className="container section-head reveal">
        <span className="eyebrow">{t.eyebrow}</span>
        <h2>{t.title[0]} <em>{t.title[1]}</em></h2>
      </div>
      <div className="container showcase-grid">
        <div className="showcase-steps">
          {steps.map((step, index) => (
            <article
              key={step.tag}
              ref={node => { refs.current[index] = node; }}
              data-index={index}
              className={`step ${active === index ? 'on' : ''}`}
            >
              <span className="step-tag">{String(index + 1).padStart(2, '0')} · {step.tag}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <Phone src={step.shot} alt={step.tag} className="step-phone" />
            </article>
          ))}
        </div>
        <div className="showcase-stage">
          <div className="stage-sticky">
            <div className="stage-halo" />
            <div className="phone stage-phone">
                      {steps.map((step, index) => (
                <img
                  key={step.tag}
                  src={step.shot}
                  alt={step.tag}
                  className={active === index ? 'on' : ''}
                />
              ))}
            </div>
            <div className="stage-dots">
              {steps.map((step, index) => (
                <button
                  key={step.tag}
                  type="button"
                  aria-label={step.tag}
                  className={active === index ? 'on' : ''}
                  onClick={() => refs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [navHidden, setNavHidden] = useState(false);
  const [lang, setLang] = useState(initialLang);
  const t = COPY[lang];

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
    document.title = t.title;
    try { localStorage.setItem('zeno-lang', lang); } catch { /* storage unavailable */ }
  }, [lang, t]);
  useReveal(lang);
  useScrollVars();

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setNavHidden(y > last && y > 120);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="progress" />
      <div className="bg-orbs" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      <nav className={`nav ${navHidden ? 'hidden' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="logo">
            <img src={logoUrl} alt="" />
            Zeno Cash
          </a>
          <div className="nav-links">
            <a href="#showcase">{t.nav.showcase}</a>
            <a href="#features">{t.nav.features}</a>
            <a href="#ai">{t.nav.ai}</a>
            <a href="#privacy">{t.nav.privacy}</a>
          </div>
          <div className="nav-actions">
            <div className="lang-switch" role="group" aria-label="Language">
              {Object.keys(COPY).map(code => (
                <button key={code} type="button" className={lang === code ? 'on' : ''} onClick={() => setLang(code)}>
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <a href={LATEST_RELEASE_URL} className="btn btn-primary btn-sm">
              <Download size={16} /> {t.nav.download}
            </a>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow reveal">{t.hero.eyebrow}</span>
            <h1 className="reveal" style={{ '--d': '80ms' }}>
              {t.hero.title[0]}<br /><em>{t.hero.title[1]}</em>
            </h1>
            <p className="lead reveal" style={{ '--d': '160ms' }}>
              {t.hero.lead}
            </p>
            <div className="hero-actions reveal" style={{ '--d': '240ms' }}>
              <a href={LATEST_RELEASE_URL} className="btn btn-primary">
                <Download size={18} /> {t.hero.apk}
              </a>
              <a href={DEMO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
                <Globe size={18} /> {t.hero.web}
              </a>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-link">
                <Code size={18} /> {t.hero.code} <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-ring" />
            <Phone src={debtsShot} alt="" className="hero-phone side left" />
            <Phone src={analyticsShot} alt="" className="hero-phone side right" />
            <Phone src={homeShot} alt="" className="hero-phone main" />
            <div className="float-chip chip-a"><HandCoins size={16} /> {t.hero.chipDebt}</div>
            <div className="float-chip chip-b"><Sparkles size={16} /> {t.hero.chipAi}</div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map(copy => (
              <span key={copy}>{t.marquee}</span>
            ))}
          </div>
        </div>

        <section className="container stats">
          {STAT_VALUES.map((stat, index) => (
            <div key={t.stats[index]} className="stat reveal" style={{ '--d': `${index * 90}ms` }}>
              <strong><CountUp value={stat.value} suffix={stat.suffix} /></strong>
              <span>{t.stats[index]}</span>
            </div>
          ))}
        </section>

        <Showcase t={t.showcase} />

        <section id="features" className="container features">
          <div className="section-head reveal">
            <span className="eyebrow">{t.features.eyebrow}</span>
            <h2>{t.features.title[0]} <em>{t.features.title[1]}</em></h2>
          </div>
          <div className="bento">
            {FEATURE_META.map(({ icon: Icon, size }, index) => {
              const [title, text] = t.features.items[index];
              return (
              <div key={title} className={`card reveal ${size || ''}`} style={{ '--d': `${(index % 4) * 80}ms` }}>
                <span className="card-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {size === 'tall' && <img src={settingsShot} alt={t.features.settingsAlt} className="card-shot" loading="lazy" />}
              </div>
              );
            })}
          </div>
        </section>

        <section id="ai" className="ai">
          <div className="container ai-grid">
            <div className="ai-visual reveal">
              <Phone src={assistantShot} alt={t.ai.alt[0]} className="ai-phone" />
              <Phone src={transactionsShot} alt={t.ai.alt[1]} className="ai-phone back" />
            </div>
            <div className="ai-copy">
              <span className="eyebrow reveal">{t.ai.eyebrow}</span>
              <h2 className="reveal" style={{ '--d': '80ms' }}>{t.ai.title[0]} <em>{t.ai.title[1]}</em> {t.ai.title[2]}</h2>
              <ul className="ai-list">
                {t.ai.items.map(([title, text], index) => (
                  <li key={title} className="reveal" style={{ '--d': `${160 + index * 80}ms` }}>
                    <Sparkles size={18} />
                    <div><strong>{title}</strong><span>{text}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="privacy" className="container privacy">
          <div className="section-head reveal">
            <span className="eyebrow">{t.privacy.eyebrow}</span>
            <h2>{t.privacy.title[0]} <em>{t.privacy.title[1]}</em></h2>
          </div>
          <div className="privacy-grid">
            {[WifiOff, Lock, ShieldCheck].map((Icon, index) => [Icon, ...t.privacy.items[index]]).map(([Icon, title, text], index) => (
              <div key={title} className="privacy-item reveal" style={{ '--d': `${index * 100}ms` }}>
                <Icon size={26} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container cta reveal">
          <div className="cta-card">
            <img src={logoUrl} alt="" className="cta-logo" />
            <h2>{t.cta.title[0]} <em>{t.cta.title[1]}</em></h2>
            <p>{t.cta.text}</p>
            <div className="hero-actions center">
              <a href={LATEST_RELEASE_URL} className="btn btn-primary"><Download size={18} /> {t.cta.apk}</a>
              <a href={DEMO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost"><Globe size={18} /> {t.cta.demo}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <a href="#top" className="logo"><img src={logoUrl} alt="" /> Zeno Cash</a>
          <div className="footer-links">
            <a href={REPO_URL}>GitHub</a>
            <a href={`${REPO_URL}/releases`}>Releases</a>
            <a href={DEMO_URL}>{t.footer.demo}</a>
          </div>
          <span className="footer-note">{t.footer.note}</span>
        </div>
      </footer>
    </>
  );
}
