import { Link } from 'react-router-dom';
import './Landing.css';

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
            <div className="hero-ctas">
              <a href="#cta" className="btn btn-p">See Firasah in Action →</a>
              <a href="#how" className="btn btn-g">View Methodology</a>
            </div>
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
              <div className="step-n">01</div>
              <h3>Upload the recording</h3>
              <p>Drag and drop any classroom recording — audio or video. MP3, MP4, WAV, and more. Maximum 2GB. No special equipment required.</p>
            </div>
            <div className="step">
              <div className="step-n">02</div>
              <h3>Firasah analyzes the lesson</h3>
              <p>Our AI transcribes the session and scores teaching quality across 19 indicators — aligned with the Saudi Ministry of Education's evaluation standards.</p>
            </div>
            <div className="step">
              <div className="step-n">03</div>
              <h3>Your dashboard fills with insight</h3>
              <p>Evidence moments, KPI scores, behavioral patterns, and highlights — all ready within minutes. No manual tagging. No configuration needed.</p>
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
              <div className="aud-ic">🏫</div>
              <h3>School Owners & Principals</h3>
              <p>Visibility across your school, not just the classroom you visited. Firasah gives you a real-time view of teaching quality across every class — without adding to anyone's schedule.</p>
            </div>
            <div className="aud-c">
              <div className="aud-ic">📊</div>
              <h3>Ministry & Supervisors</h3>
              <p>Scale teaching development without scaling your team. Monitor patterns across your entire portfolio of schools. Firasah surfaces what matters so supervisors can focus their time where it counts.</p>
            </div>
            <div className="aud-c">
              <div className="aud-ic">🎓</div>
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
            <div className="logo-w">
              <div className="logo-box"><span>وزارة<br />التعليم</span></div>
              <div className="logo-name">Ministry of Education</div>
            </div>
            <div className="logo-w">
              <div className="logo-box"><span>NTDP</span></div>
              <div className="logo-name">National Transformation Program</div>
            </div>
            <div className="logo-w">
              <div className="logo-box"><span>Digital<br />Entrepreneurship</span></div>
              <div className="logo-name">Center of Digital Entrepreneurship</div>
            </div>
            <div className="logo-w">
              <div className="logo-box"><span>MiSK</span></div>
              <div className="logo-name">MiSK Foundation</div>
            </div>
            <div className="logo-w">
              <div className="logo-box"><span>Saudi<br />Business<br />Center</span></div>
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
