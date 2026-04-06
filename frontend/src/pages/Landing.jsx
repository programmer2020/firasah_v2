import { Link } from 'react-router-dom';
import './Landing.css';
import miskLogo from '../assets/Misk.png';
import codeLogo from '../assets/CodeLogo.png';
import ntdpLogo from '../assets/ntdp-logo.png';
import saudiCenterLogo from '../assets/saudi-center.png';
import ministryLogo from '../assets/MinsitryLerining.svg';

export default function Landing() {
  return (
    <>
      {/* NAV */}
      <nav className="landing-nav">
        <div className="nav-in">
          <a href="#" className="logo">Firasah AI</a>
          <div className="nav-actions">
            <Link to="/login" className="btn btn-g">Login</Link>
            <a href="#cta" className="btn btn-p">Get Early Access →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="hero" style={{ background: 'var(--s)' }}>
        <div className="hero-in">
          <div>
            <span className="label">Intelligent Pedagogy</span>
            <h1>Every classroom.<br />Every lesson.<br />Every <em>insight.</em></h1>
            <p>Firasah is your AI-powered academic supervisor — one that attends every class, analyzes every lesson, and gives every teacher the feedback they deserve. No scheduling. No bias. No missed sessions.</p>
          </div>
          <div>
            <div className="hero-card">
              <div className="hero-dots"><span></span><span></span><span></span></div>
              <div className="hero-card-lbl">Live Lesson Analysis</div>
              <div className="hero-m-lbl">Engagement Score</div>
              <div className="hero-m-val">88.4%</div>
              <div className="hero-bar"><div className="hero-bar-f"></div></div>
              <div className="hero-stats">
                <div><div className="hero-stat-lbl">KPI Score</div><div className="hero-stat-v">92</div><div className="hero-stat-k">Questioning</div></div>
                <div><div className="hero-stat-lbl">Avg Pause</div><div className="hero-stat-v">5.2s</div><div className="hero-stat-k">Wait Time</div></div>
                <div><div className="hero-stat-lbl">Processing</div><div className="hero-stat-v">~4m</div><div className="hero-stat-k">Per Lecture</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THE PROBLEM */}
      <section className="bg-alt">
        <div className="wrap">
          <div className="prob-grid">
            <div className="prob-left">
              <span className="label">The Problem</span>
              <h2>Most teachers go their entire career without a single useful observation.</h2>
              <p>Traditional classroom observation is expensive, infrequent, and biased. A supervisor visits once or twice a year. The feedback is subjective. The teacher never sees it again.<br /><br />Firasah changes all of that.</p>
            </div>
            <div className="prob-stats">
              <div className="stat-c">
                <div className="stat-lbl">Average observations per teacher per year</div>
                <div className="stat-v">1.4</div>
                <div className="stat-d">Most teachers receive fewer than 2 formal observations annually across the GCC.</div>
              </div>
              <div className="stat-c">
                <div className="stat-lbl">Of teachers say feedback is not actionable</div>
                <div className="stat-v">68<sup>%</sup></div>
                <div className="stat-d">Even when observation happens, the feedback rarely leads to measurable improvement.</div>
              </div>
              <div className="stat-c">
                <div className="stat-lbl">Cost of one manual observation cycle</div>
                <div className="stat-v">$400<sup>+</sup></div>
                <div className="stat-d">Time, travel, and reporting — manual observation does not scale.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <div className="sec-hd">
            <span className="label">How Firasah Works</span>
            <h2>From classroom to insight<br />in under 4 minutes.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <svg className="step-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="20" width="48" height="36" rx="2" stroke="#004634" strokeWidth="2"/>
                <path d="M32 8v20M24 16l8-8l8 8" stroke="#004634" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="20" cy="32" r="2" fill="#004634"/>
              </svg>
              <div className="step-n">01</div>
              <h3>Upload the recording</h3>
            </div>
            <div className="step">
              <svg className="step-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="24" stroke="#004634" strokeWidth="2"/>
                <path d="M32 16v32M16 32h32" stroke="#004634" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="45" cy="20" r="3" fill="#004634"/>
              </svg>
              <div className="step-n">02</div>
              <h3>Firasah analyzes the lesson</h3>
            </div>
            <div className="step">
              <svg className="step-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="12" width="48" height="40" rx="2" stroke="#004634" strokeWidth="2"/>
                <line x1="12" y1="24" x2="52" y2="24" stroke="#004634" strokeWidth="2"/>
                <rect x="12" y="28" width="10" height="8" rx="1" fill="#004634" opacity="0.3"/>
                <rect x="27" y="28" width="10" height="8" rx="1" fill="#004634" opacity="0.6"/>
                <rect x="42" y="28" width="10" height="8" rx="1" fill="#004634"/>
              </svg>
              <div className="step-n">03</div>
              <h3>Your dashboard fills with insight</h3>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF POINTS */}
      <section className="bg-alt">
        <div className="wrap">
          <div className="sec-hd center">
            <span className="label">The Impact</span>
          </div>
          <div className="proof-grid">
            <div className="proof-item">
              <div className="proof-track"><div className="proof-fill" style={{ width: '94%' }}></div></div>
              <div className="proof-v">94<sup>%</sup></div>
              <div className="label proof-lbl">Accuracy</div>
              <p className="proof-d">AI transcription and analysis accuracy rate.</p>
            </div>
            <div className="proof-item">
              <div className="proof-track"><div className="proof-fill" style={{ width: '30%' }}></div></div>
              <div className="proof-v">~<small>4</small><sup style={{ fontSize: '22px', color: 'var(--e)' }}>m</sup></div>
              <div className="label proof-lbl">Processing Time</div>
              <p className="proof-d">Average time from upload to full dashboard insight.</p>
            </div>
            <div className="proof-item">
              <div className="proof-track"><div className="proof-fill" style={{ width: '100%' }}></div></div>
              <div className="proof-v">100<sup>%</sup></div>
              <div className="label proof-lbl">Data Sovereignty</div>
              <p className="proof-d">Localized hosting within the Kingdom, ensuring full compliance with NDMO standards.</p>
            </div>
          </div>
          <p className="proof-fn">Based on pilot data across schools in the Kingdom of Saudi Arabia, 2024–2025.</p>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section>
        <div className="wrap">
          <div className="sec-hd">
            <span className="label">The Platform</span>
            <h2>Everything your school needs<br />to understand its teaching.</h2>
            <p>From a single lecture to behavioral patterns across a full term — Firasah gives principals and teachers the right data at the right level of detail.</p>
          </div>
          <div className="showcase-grid">
            <div className="sc-card">
              <div className="sc-screen">
                <div className="sc-mock">
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(200,234,224,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Poppins',sans-serif", fontSize: '13px', fontWeight: '700', color: 'var(--elt)' }}>82</div>
                    <div style={{ flex: 1 }}><div className="sc-mock-b sc-mock-b-m"></div><div className="sc-mock-b sc-mock-b-s" style={{ marginTop: '6px' }}></div></div>
                  </div>
                  <div className="sc-mock-b sc-mock-b-m"></div>
                  <div className="sc-mock-b sc-mock-b-s"></div>
                </div>
              </div>
              <div className="sc-info">
                <h3>Dashboard</h3>
                <p>See every teacher's overall performance at a glance.</p>
              </div>
            </div>
            <div className="sc-card">
              <div className="sc-screen">
                <div className="sc-mock">
                  <div style={{ background: 'rgba(200,234,224,.15)', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(200,234,224,.6)', letterSpacing: '.1em', marginBottom: '4px' }}>14:32 · QUESTIONING</div>
                    <div className="sc-mock-b sc-mock-b-m"></div>
                    <div className="sc-mock-b" style={{ width: '90%', marginTop: '4px' }}></div>
                  </div>
                  <div className="sc-mock-b sc-mock-b-m"></div>
                  <div className="sc-mock-b sc-mock-b-s"></div>
                </div>
              </div>
              <div className="sc-info">
                <h3>Lecture Detail</h3>
                <p>Dive into any session — evidence, timestamps, audio.</p>
              </div>
            </div>
            <div className="sc-card">
              <div className="sc-screen">
                <div className="sc-mock">
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '70px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, height: '40%', background: 'rgba(200,234,224,.25)' }}></div>
                    <div style={{ flex: 1, height: '65%', background: 'rgba(200,234,224,.35)' }}></div>
                    <div style={{ flex: 1, height: '50%', background: 'rgba(200,234,224,.25)' }}></div>
                    <div style={{ flex: 1, height: '80%', background: 'rgba(0,96,73,.6)' }}></div>
                    <div style={{ flex: 1, height: '70%', background: 'rgba(200,234,224,.35)' }}></div>
                    <div style={{ flex: 1, height: '90%', background: 'rgba(0,96,73,.7)' }}></div>
                  </div>
                  <div className="sc-mock-b sc-mock-b-m"></div>
                  <div className="sc-mock-b sc-mock-b-s"></div>
                </div>
              </div>
              <div className="sc-info">
                <h3>Patterns</h3>
                <p>Spot behavioral habits and trends across the full term.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="bg-alt">
        <div className="wrap">
          <div className="sec-hd center">
            <span className="label">Who It's For</span>
            <h2>Built for every person who cares about teaching quality.</h2>
          </div>
          <div className="aud-grid">
            <div className="aud-c">
              <div className="aud-ic">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="grad1a" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#006049"/>
                      <stop offset="100%" stopColor="#00c98d"/>
                    </linearGradient>
                  </defs>
                  {/* Building / School icon */}
                  <rect x="8" y="20" width="40" height="28" rx="3" fill="url(#grad1a)" opacity="0.15"/>
                  <rect x="8" y="20" width="40" height="28" rx="3" stroke="url(#grad1a)" strokeWidth="2.2"/>
                  <path d="M28 8 L50 20 H6 L28 8Z" fill="url(#grad1a)"/>
                  <rect x="20" y="33" width="7" height="15" rx="1.5" fill="url(#grad1a)"/>
                  <rect x="29" y="33" width="7" height="15" rx="1.5" fill="url(#grad1a)"/>
                  <rect x="13" y="26" width="6" height="5" rx="1" fill="url(#grad1a)" opacity="0.7"/>
                  <rect x="37" y="26" width="6" height="5" rx="1" fill="url(#grad1a)" opacity="0.7"/>
                  <circle cx="44" cy="14" r="5" fill="#00c98d" opacity="0.25"/>
                  <circle cx="44" cy="14" r="2.5" fill="#00c98d"/>
                </svg>
              </div>
              <h3>School Owners & Principals</h3>
              <p>Visibility across your school, not just the classroom you visited. Firasah gives you a real-time view of teaching quality across every class — without adding to anyone's schedule.</p>
            </div>
            <div className="aud-c">
              <div className="aud-ic">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="grad2a" x1="0" y1="56" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#006049"/>
                      <stop offset="100%" stopColor="#34d399"/>
                    </linearGradient>
                  </defs>
                  {/* Analytics bars */}
                  <rect x="6" y="38" width="10" height="14" rx="2.5" fill="url(#grad2a)" opacity="0.4"/>
                  <rect x="6" y="38" width="10" height="14" rx="2.5" stroke="url(#grad2a)" strokeWidth="1.5"/>
                  <rect x="19" y="26" width="10" height="26" rx="2.5" fill="url(#grad2a)" opacity="0.6"/>
                  <rect x="19" y="26" width="10" height="26" rx="2.5" stroke="url(#grad2a)" strokeWidth="1.5"/>
                  <rect x="32" y="16" width="10" height="36" rx="2.5" fill="url(#grad2a)" opacity="0.8"/>
                  <rect x="32" y="16" width="10" height="36" rx="2.5" stroke="url(#grad2a)" strokeWidth="1.5"/>
                  <rect x="45" y="6" width="10" height="46" rx="2.5" fill="url(#grad2a)"/>
                  {/* Trend line */}
                  <polyline points="11,37 24,25 37,15 50,5" stroke="#00c98d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                  <circle cx="50" cy="5" r="3" fill="#00c98d"/>
                </svg>
              </div>
              <h3>Ministry & Supervisors</h3>
              <p>Scale teaching development without scaling your team. Monitor patterns across your entire portfolio of schools. Firasah surfaces what matters so supervisors can focus their time where it counts.</p>
            </div>
            <div className="aud-c">
              <div className="aud-ic">
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="grad3a" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#004c3a"/>
                      <stop offset="100%" stopColor="#10b981"/>
                    </linearGradient>
                  </defs>
                  {/* Graduation cap */}
                  <ellipse cx="28" cy="24" rx="20" ry="7" fill="url(#grad3a)" opacity="0.15"/>
                  <ellipse cx="28" cy="24" rx="20" ry="7" stroke="url(#grad3a)" strokeWidth="2"/>
                  <polygon points="28,14 48,24 28,30 8,24" fill="url(#grad3a)"/>
                  <path d="M40 27 L40 40 Q28 47 16 40 L16 27" stroke="url(#grad3a)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                  <path d="M20 29 Q28 45 36 29" fill="url(#grad3a)" opacity="0.25"/>
                  <line x1="48" y1="24" x2="48" y2="38" stroke="url(#grad3a)" strokeWidth="2.2" strokeLinecap="round"/>
                  <circle cx="48" cy="40" r="3.5" fill="#10b981"/>
                  {/* Star sparkle */}
                  <circle cx="10" cy="10" r="2" fill="#10b981" opacity="0.5"/>
                  <circle cx="46" cy="8" r="1.5" fill="#10b981" opacity="0.4"/>
                </svg>
              </div>
              <h3>Teachers</h3>
              <p>See your teaching the way a trusted colleague would. Private, specific, and encouraging — Firasah gives teachers the kind of feedback that usually only comes from the best professional development programs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AFFILIATIONS */}
      <section>
        <div className="wrap">
          <div className="aff-lbl">
            <span className="label">Affiliations & Ecosystem Support</span>
          </div>
          <div className="logos">
            <div className="logo-w" style={{ opacity: 1, pointerEvents: 'none' }}>
              <div className="logo-box" style={{ width: '160px', height: '88px', padding: 0, overflow: 'hidden', borderRadius: '8px', background: '#ffffff' }}>
                <img src={ministryLogo} alt="Ministry of Education" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div className="logo-name">Ministry of Education</div>
            </div>
            <div className="logo-w" style={{ opacity: 1, pointerEvents: 'none' }}>
              <div className="logo-box" style={{ width: '160px', height: '88px', padding: 0, overflow: 'hidden', borderRadius: '8px', background: '#ffffff' }}>
                <img src={ntdpLogo} alt="NTDP" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div className="logo-name">National Transformation Program</div>
            </div>
            <div className="logo-w" style={{ opacity: 1, pointerEvents: 'none' }}>
              <div className="logo-box" style={{ width: '160px', height: '88px', padding: 0, overflow: 'hidden', borderRadius: '8px', background: '#ffffff' }}>
                <img src={codeLogo} alt="Center of Digital Entrepreneurship" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div className="logo-name">Center of Digital Entrepreneurship</div>
            </div>
            <div className="logo-w" style={{ opacity: 1, pointerEvents: 'none' }}>
              <div className="logo-box" style={{ width: '160px', height: '88px', padding: 0, overflow: 'hidden', borderRadius: '8px', background: '#ffffff' }}>
                <img src={miskLogo} alt="MiSK Foundation" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div className="logo-name">MiSK Foundation</div>
            </div>
            <div className="logo-w" style={{ opacity: 1, pointerEvents: 'none' }}>
              <div className="logo-box" style={{ width: '160px', height: '88px', padding: 0, overflow: 'hidden', borderRadius: '8px', background: '#ffffff' }}>
                <img src={saudiCenterLogo} alt="Saudi Business Center" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <div className="logo-name">Saudi Business Center</div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-dark" id="cta">
        <div className="wrap">
          <div className="cta-in">
            <span className="label label-w">Early Access</span>
            <h2>Be among the first schools to see every lesson clearly.</h2>
            <p>Firasah is currently in pilot across schools in the Kingdom of Saudi Arabia. We are selectively onboarding institutions that are serious about teaching quality.</p>
            <a href="#" className="btn btn-inv">Get Early Access →</a>
            <div className="cta-sub">We'll be in touch within 48 hours.</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="ft-top">
          <div className="ft-l">
            <div className="ft-logo">Firasah AI</div>
            <div className="ft-tag">See Every Lesson Clearly.</div>
            <div className="ft-copy">© 2025 Firasah AI. Precision Intelligence for Education.<br />Built for the future of the GCC knowledge economy.</div>
            <div className="ft-compliance">Compliant with Saudi Data & AI Authority (SDAIA) & NDMO Frameworks. Regional HQ: Riyadh, KSA.</div>
          </div>
          <div className="ft-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
          </div>
        </div>
        <div className="ft-bot">
          <div className="ft-cr">© 2025 Firasah AI. All rights reserved.</div>
          <div className="ft-soc">
            <a href="#" className="soc">in</a>
            <a href="#" className="soc">X</a>
            <a href="#" className="soc">ig</a>
          </div>
        </div>
      </footer>
    </>
  );
}
