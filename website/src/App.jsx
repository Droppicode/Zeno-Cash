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
import './index.css';

const LATEST_RELEASE_URL = 'https://github.com/Droppicode/Zeno-Cash/releases/latest';
const DEMO_URL = 'https://zeno-cash.vercel.app/';
const REPO_URL = 'https://github.com/Droppicode/Zeno-Cash';

const STEPS = [
  {
    tag: 'Home',
    title: 'Tudo o que importa, em uma tela',
    text: 'Saldo, contas, cartões, pendências e grupos lado a lado. Receitas e despesas do mês batem com cada tela do app.',
    shot: homeShot,
  },
  {
    tag: 'Dívidas',
    title: 'Dívidas que se resolvem sozinhas',
    text: 'Marque como paga e o Acerto entra na conta ou na fatura certa. Desmarcou? O acerto some. Sem números fantasmas na Home.',
    shot: debtsShot,
  },
  {
    tag: 'Grupos',
    title: 'Grupos para viagens, carro, projetos',
    text: 'Junte transações em “Viagem Alagoas 2026” ou “Carro Fiesta” e veja total, orçamento, média mensal e anual. Regras automáticas fazem o resto.',
    shot: groupShot,
  },
  {
    tag: 'Análise',
    title: 'Análises sem excesso de filtros',
    text: 'Evolução mensal, composição por categoria e mapa de gastos. Cada grupo tem a própria tela de análise.',
    shot: analyticsShot,
  },
  {
    tag: 'Assistente',
    title: 'Uma IA que propõe, você decide',
    text: 'Pergunte, mande um recibo ou peça um grupo. O assistente consulta seus dados por ferramentas e toda alteração vira um cartão para aplicar ou descartar.',
    shot: assistantShot,
  },
];

const FEATURES = [
  { icon: HandCoins, title: 'Dívidas e Acertos', text: 'Quem te deve, quem você deve, e o saldo real de cada conta depois de pagar.', size: 'wide' },
  { icon: Layers, title: 'Grupos N:N', text: 'Uma transação pode estar em vários grupos ao mesmo tempo.' },
  { icon: Receipt, title: 'Cartões e faturas', text: 'Faturas por ciclo, saldo anterior e pagamento de fatura.' },
  { icon: Brain, title: 'Gemini, OpenAI ou Claude', text: 'Escolha o provedor, o modelo e o que a IA pode fazer. Tokens e custo estimado à vista.', size: 'tall' },
  { icon: BarChart3, title: 'Recorrências', text: 'Assinaturas e salários lançados automaticamente.' },
  { icon: Palette, title: 'Temas e módulos', text: 'Crie temas, ajuste o zoom e esconda o que você não usa.' },
  { icon: ShieldCheck, title: 'Backup e exportação', text: 'JSON, CSV e backup automático no Google Drive ou no aparelho.', size: 'wider' },
];

const STATS = [
  { value: 100, suffix: '%', label: 'offline-first' },
  { value: 3, suffix: '', label: 'provedores de IA' },
  { value: 0, suffix: '', label: 'servidores no meio' },
  { value: 20, suffix: '+', label: 'ferramentas do assistente' },
];

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);
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

function Showcase() {
  const [active, setActive] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    refs.current.forEach(node => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="showcase" className="showcase">
      <div className="container section-head reveal">
        <span className="eyebrow">Como funciona</span>
        <h2>Role devagar. <em>O app acompanha.</em></h2>
      </div>
      <div className="container showcase-grid">
        <div className="showcase-steps">
          {STEPS.map((step, index) => (
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
                      {STEPS.map((step, index) => (
                <img
                  key={step.tag}
                  src={step.shot}
                  alt={step.tag}
                  className={active === index ? 'on' : ''}
                />
              ))}
            </div>
            <div className="stage-dots">
              {STEPS.map((step, index) => (
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
  useReveal();
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
            <a href="#showcase">Como funciona</a>
            <a href="#features">Funções</a>
            <a href="#ai">Assistente</a>
            <a href="#privacy">Privacidade</a>
          </div>
          <a href={LATEST_RELEASE_URL} className="btn btn-primary btn-sm">
            <Download size={16} /> Baixar
          </a>
        </div>
      </nav>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy">
            <span className="eyebrow reveal">Finanças pessoais · offline-first</span>
            <h1 className="reveal" style={{ '--d': '80ms' }}>
              Seu dinheiro,<br /><em>em paz.</em>
            </h1>
            <p className="lead reveal" style={{ '--d': '160ms' }}>
              Contas, cartões, dívidas e grupos em um app leve, que guarda tudo no seu aparelho
              e tem um assistente de IA que só mexe no que você aprovar.
            </p>
            <div className="hero-actions reveal" style={{ '--d': '240ms' }}>
              <a href={LATEST_RELEASE_URL} className="btn btn-primary">
                <Download size={18} /> Baixar APK
              </a>
              <a href={DEMO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
                <Globe size={18} /> Testar na web
              </a>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn btn-link">
                <Code size={18} /> Código no GitHub <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-ring" />
            <Phone src={debtsShot} alt="" className="hero-phone side left" />
            <Phone src={analyticsShot} alt="" className="hero-phone side right" />
            <Phone src={homeShot} alt="" className="hero-phone main" />
            <div className="float-chip chip-a"><HandCoins size={16} /> Dívida quitada</div>
            <div className="float-chip chip-b"><Sparkles size={16} /> Proposta da IA</div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map(copy => (
              <span key={copy}>
                Dívidas e Acertos · Grupos · Faturas · Recorrências · Assistente IA · Recibos por foto · Temas · Backup ·{' '}
              </span>
            ))}
          </div>
        </div>

        <section className="container stats">
          {STATS.map((stat, index) => (
            <div key={stat.label} className="stat reveal" style={{ '--d': `${index * 90}ms` }}>
              <strong><CountUp value={stat.value} suffix={stat.suffix} /></strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <Showcase />

        <section id="features" className="container features">
          <div className="section-head reveal">
            <span className="eyebrow">Funções</span>
            <h2>Tudo no lugar, <em>nada sobrando.</em></h2>
          </div>
          <div className="bento">
            {FEATURES.map(({ icon: Icon, title, text, size }, index) => (
              <div key={title} className={`card reveal ${size || ''}`} style={{ '--d': `${(index % 4) * 80}ms` }}>
                <span className="card-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {size === 'tall' && <img src={settingsShot} alt="Configurações" className="card-shot" loading="lazy" />}
              </div>
            ))}
          </div>
        </section>

        <section id="ai" className="ai">
          <div className="container ai-grid">
            <div className="ai-visual reveal">
              <Phone src={assistantShot} alt="Assistente" className="ai-phone" />
              <Phone src={transactionsShot} alt="Transações" className="ai-phone back" />
            </div>
            <div className="ai-copy">
              <span className="eyebrow reveal">Assistente IA</span>
              <h2 className="reveal" style={{ '--d': '80ms' }}>Pergunte. <em>Revise.</em> Aplique.</h2>
              <ul className="ai-list">
                {[
                  ['Consulta por ferramentas', 'Busca e resume transações sob demanda, sem mandar o histórico inteiro a cada pergunta.'],
                  ['Recibos e PDFs', 'Mande uma foto ou um extrato e receba as transações prontas para revisar.'],
                  ['Permissões por área', 'Você liga o que a IA pode criar, editar ou apagar. Apagar sempre pede confirmação.'],
                  ['Consumo visível', 'Tokens por mensagem, total do mês e custo estimado por modelo.'],
                ].map(([title, text], index) => (
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
            <span className="eyebrow">Privacidade</span>
            <h2>Seus dados ficam <em>com você.</em></h2>
          </div>
          <div className="privacy-grid">
            {[
              [WifiOff, 'Funciona offline', 'Banco SQLite local. Sem conta, sem login, sem nuvem obrigatória.'],
              [Lock, 'Chave no aparelho', 'A chave da IA fica no armazenamento seguro do celular e as chamadas vão direto ao provedor.'],
              [ShieldCheck, 'Backup quando quiser', 'Exporte JSON ou CSV, ou ative o backup automático no Drive.'],
            ].map(([Icon, title, text], index) => (
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
            <h2>Respire. <em>Está tudo em ordem.</em></h2>
            <p>Grátis e de código aberto. Android ou direto no navegador.</p>
            <div className="hero-actions center">
              <a href={LATEST_RELEASE_URL} className="btn btn-primary"><Download size={18} /> Baixar APK</a>
              <a href={DEMO_URL} target="_blank" rel="noreferrer" className="btn btn-ghost"><Globe size={18} /> Abrir demo</a>
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
            <a href={DEMO_URL}>Demo web</a>
          </div>
          <span className="footer-note">Feito com calma. React Native + Expo.</span>
        </div>
      </footer>
    </>
  );
}
