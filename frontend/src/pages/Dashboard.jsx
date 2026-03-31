import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';

const stats = [
  {
    label: 'Lectures Analyzed',
    value: '42',
    accent: '+3',
    mode: 'numeric',
    cardClassName: 'dashboard-panel',
  },
  {
    label: 'Average KPI Score',
    value: '82',
    accent: '%',
    mode: 'numeric',
    cardClassName: 'dashboard-panel-soft',
  },
  {
    label: 'Top Strength',
    title: 'Questioning',
    value: '94',
    accent: '/100',
    mode: 'stacked',
    cardClassName: 'dashboard-panel',
  },
  {
    label: 'Area to Improve',
    title: 'Wait Time',
    value: '8',
    accent: 's avg',
    mode: 'stacked',
    cardClassName: 'dashboard-panel-soft',
  },
];

const lectureRows = [
  {
    title: 'Advanced Neuro-Pathology 04',
    subject: 'Neurology',
    date: 'OCT 24, 2023',
    score: '88%',
    route: '/evaluations',
    scoreTone: 'primary',
    dotTone: 'primary',
    striped: false,
  },
  {
    title: 'Clinical Ethics Seminar',
    subject: 'Medical Law',
    date: 'OCT 22, 2023',
    score: '92%',
    route: '/evaluations',
    scoreTone: 'primary',
    dotTone: 'primary',
    striped: true,
  },
  {
    title: 'Endocrine Systems Overview',
    subject: 'Internal Med',
    date: 'OCT 19, 2023',
    score: '76%',
    route: '/evaluations',
    scoreTone: 'secondary',
    dotTone: 'secondary',
    striped: false,
  },
  {
    title: 'Cardiac Surgery Techniques',
    subject: 'Surgery',
    date: 'OCT 18, 2023',
    score: '85%',
    route: '/evaluations',
    scoreTone: 'primary',
    dotTone: 'primary',
    striped: true,
  },
];

export const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <ProtectedLayout>
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-12">
          <h2 className="font-headline mb-2 text-5xl font-bold tracking-[-0.08em] text-[var(--dashboard-primary)]">
            Welcome back, Dr. Thorne
          </h2>
          <p className="max-w-2xl text-[#62746d]">
            Your intelligence dashboard is updated with the latest performance metrics from your clinical lectures this week.
          </p>
        </section>

        <section className="mb-12 grid grid-cols-1 gap-0 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${stat.cardClassName} dashboard-ghost-top px-8 py-8`}>
              <p className="font-dashboard-mono mb-4 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">{stat.label}</p>

              {stat.mode === 'numeric' ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-headline text-[3.5rem] font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                    {stat.value}
                  </span>
                  <span
                    className={`font-bold ${
                      stat.label === 'Average KPI Score'
                        ? 'font-headline text-2xl text-[rgba(0,96,73,0.6)]'
                        : 'text-sm text-[#51555c]'
                    }`}
                  >
                    {stat.accent}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="font-headline mb-2 text-xl font-bold text-[#172b26]">{stat.title}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline text-3xl font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                      {stat.value}
                    </span>
                    <span className="font-dashboard-mono text-xs text-[#7f938a]">{stat.accent}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="mb-12 grid grid-cols-12 gap-8">
          <div className="relative col-span-12 flex flex-col justify-center overflow-hidden bg-[var(--dashboard-primary)] px-12 py-12 text-white shadow-[0_32px_70px_-38px_rgba(0,76,58,0.75)] lg:col-span-7">
            <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <p className="font-dashboard-mono relative z-10 mb-6 text-[10px] uppercase tracking-[0.3em] text-white/50">Weekly Spotlight</p>
            <h3 className="font-headline relative z-10 mb-6 text-4xl font-bold leading-tight">
              You used higher-order thinking questions <span className="text-[#dff7e7]">8 times</span> this week! 🎉
            </h3>
            <p className="relative z-10 mb-8 max-w-2xl text-lg leading-relaxed text-white/80">
              Your shift towards synthesizing concepts has resulted in a <span className="font-bold text-white">15% increase</span> in overall student engagement metrics compared to the previous fortnight.
            </p>
            <div className="relative z-10">
              <button
                type="button"
                onClick={() => navigate('/evaluations')}
                className="dashboard-button bg-white px-8 py-4 font-bold tracking-tight text-[var(--dashboard-primary)] transition hover:bg-[#d8ece4]"
              >
                VIEW FULL ANALYSIS
              </button>
            </div>
          </div>

          <div className="dashboard-panel dashboard-ghost-top col-span-12 flex flex-col bg-[rgba(251,252,250,0.95)] px-10 py-10 lg:col-span-5">
            <p className="font-dashboard-mono mb-8 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Performance Radar</p>
            <div className="relative flex min-h-[300px] flex-1 items-center justify-center">
              <svg className="h-full w-full max-w-[280px]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#F3F4F5" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#F3F4F5" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="15" fill="none" stroke="#F3F4F5" strokeWidth="0.5" />
                <path d="M50 5 L50 95 M5 50 L95 50" stroke="#F3F4F5" strokeWidth="0.5" />
                <polygon points="50,15 85,35 75,75 25,75 15,35" fill="rgba(0, 96, 73, 0.1)" stroke="#006049" strokeWidth="1.5" />
              </svg>

              <span className="font-dashboard-mono absolute left-1/2 top-0 -translate-x-1/2 text-[9px] font-bold uppercase text-[#62746d]">
                Engagement
              </span>
              <span className="font-dashboard-mono absolute right-0 top-1/4 text-[9px] font-bold uppercase text-[#62746d]">
                Tone
              </span>
              <span className="font-dashboard-mono absolute bottom-1/4 right-4 text-[9px] font-bold uppercase text-[#62746d]">
                Clarity
              </span>
              <span className="font-dashboard-mono absolute bottom-1/4 left-4 text-[9px] font-bold uppercase text-[#62746d]">
                Pacing
              </span>
              <span className="font-dashboard-mono absolute left-0 top-1/4 text-[9px] font-bold uppercase text-[#62746d]">
                Interaction
              </span>
            </div>
          </div>
        </section>

        <section className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="dashboard-panel-soft flex items-center justify-between px-8 py-8">
            <div>
              <p className="font-dashboard-mono mb-2 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Pacing Match</p>
              <h4 className="font-headline text-2xl font-bold text-[#172b26]">Synchronized</h4>
            </div>
            <div className="flex gap-2">
              <div className="h-4 w-4 bg-[var(--dashboard-primary)]" />
              <div className="h-4 w-4 bg-[var(--dashboard-primary)]" />
              <div className="h-4 w-4 bg-[var(--dashboard-primary)]" />
              <div className="h-4 w-4 bg-black/10" />
            </div>
          </div>

          <div className="dashboard-panel-soft flex items-center justify-between px-8 py-8">
            <div>
              <p className="font-dashboard-mono mb-2 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Clarity Index</p>
              <h4 className="font-headline text-2xl font-bold text-[#172b26]">High Precision</h4>
            </div>
            <div className="text-right">
              <span className="font-headline text-3xl font-bold text-[var(--dashboard-primary)]">9.4</span>
              <span className="font-dashboard-mono text-xs text-[#7e8f89]">/10</span>
            </div>
          </div>
        </section>

        <section className="dashboard-panel overflow-hidden bg-[rgba(251,252,250,0.95)]">
          <div className="px-10 py-8">
            <h3 className="font-headline mb-1 text-xl font-bold text-[var(--dashboard-primary)]">Recent Intelligence Deep-Dives</h3>
            <p className="font-dashboard-mono text-xs uppercase tracking-[0.28em] text-[#7e8f89]">Last 5 Sessions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[rgba(238,243,239,0.95)]">
                <tr>
                  <th className="px-10 py-4 font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Lecture Title</th>
                  <th className="px-6 py-4 font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Subject</th>
                  <th className="px-6 py-4 font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Date</th>
                  <th className="px-6 py-4 font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Score</th>
                  <th className="px-10 py-4 text-right font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(238,243,239,1)]">
                {lectureRows.map((row) => (
                  <tr
                    key={row.title}
                    className={`transition-colors hover:bg-[rgba(238,243,239,0.95)] ${row.striped ? 'bg-[rgba(238,243,239,0.3)]' : ''}`}
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 ${row.dotTone === 'secondary' ? 'bg-[#51555c]' : 'bg-[var(--dashboard-primary)]'}`} />
                        <span className="font-bold text-[#172b26]">{row.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-sm text-[#62746d]">{row.subject}</td>
                    <td className="font-dashboard-mono px-6 py-6 text-sm text-[#62746d]">{row.date}</td>
                    <td className="px-6 py-6">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          row.scoreTone === 'secondary'
                            ? 'bg-[rgba(81,85,92,0.1)] text-[#51555c]'
                            : 'bg-[rgba(0,96,73,0.1)] text-[var(--dashboard-primary)]'
                        }`}
                      >
                        {row.score}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <Link to={row.route} className="text-xs font-bold text-[var(--dashboard-primary)] transition hover:underline">
                        VIEW ANALYSIS
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="font-dashboard-mono mt-12 flex flex-col gap-4 border-t border-[rgba(98,116,109,0.12)] px-10 py-12 text-[10px] uppercase tracking-[0.2em] text-[#95a39e] sm:flex-row sm:items-center sm:justify-between">
          <div>© 2024 FIRASAH INTELLIGENCE ENGINE V10.0</div>
          <div className="flex gap-8">
            <a href="#" className="transition-colors hover:text-[var(--dashboard-primary)]">
              Privacy Protocol
            </a>
            <a href="#" className="transition-colors hover:text-[var(--dashboard-primary)]">
              System Status
            </a>
          </div>
        </footer>
      </div>
    </ProtectedLayout>
  );
};

export default Dashboard;
