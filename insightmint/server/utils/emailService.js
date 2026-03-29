const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass || user === 'your_gmail@gmail.com') {
    console.log('⚠️  Email not configured — set EMAIL_USER and EMAIL_PASS in server/.env');
    return null;
  }
  transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  return transporter;
}

function getDailyReminderHTML({ userName, stats, roadmaps, streak }) {
  const roadmapRows = roadmaps.length > 0
    ? roadmaps.slice(0, 5).map(r => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-weight:600;">${r.topic}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;">
            <span style="background:${r.pct===100?'#dcfce7':'#ede9fe'};color:${r.pct===100?'#16a34a':'#7c3aed'};padding:3px 10px;border-radius:20px;font-size:13px;font-weight:600;">${r.pct}%</span>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:16px 0;color:#6b7280;text-align:center;">No roadmaps started yet.</td></tr>`;

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;">✨ InsightMint</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">Daily Learning Reminder</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:13px;">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <h2 style="color:#0f172a;margin:0 0 8px;">Hey ${userName}! 👋</h2>
      <p style="color:#64748b;line-height:1.6;margin:0 0 24px;">Time to continue your learning journey. Here's your progress summary.</p>
      ${streak > 0 ? `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fbbf24;border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;"><span style="font-size:20px;">🔥</span><span style="font-size:16px;font-weight:700;color:#92400e;margin-left:8px;">${streak}-day learning streak! Keep it up!</span></div>` : '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px;margin-bottom:24px;text-align:center;color:#065f46;">🌱 Start your learning streak today!</div>'}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:28px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;">📹</div><div style="font-size:22px;font-weight:700;color:#0d9488;">${stats.videosWatched}</div><div style="font-size:11px;color:#94a3b8;">Videos Watched</div></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;">🗺️</div><div style="font-size:22px;font-weight:700;color:#6366f1;">${stats.roadmapsActive}</div><div style="font-size:11px;color:#94a3b8;">Roadmaps Active</div></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:20px;">✅</div><div style="font-size:22px;font-weight:700;color:#4ade80;">${stats.topicsDone}</div><div style="font-size:11px;color:#94a3b8;">Topics Done</div></div>
      </div>
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;border-bottom:2px solid #f1f5f9;padding-bottom:10px;">🗺️ Roadmap Progress</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${roadmapRows}</table>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="http://localhost:5173/roadmap" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;margin:4px;">Continue Learning →</a>
        <a href="http://localhost:5173/explore" style="display:inline-block;background:#f1f5f9;color:#475569;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;margin:4px;">Explore Topics</a>
      </div>
      <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-left:4px solid #14b8a6;border-radius:0 12px 12px 0;padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:#065f46;font-style:italic;font-size:14px;">"The expert in anything was once a beginner. Keep learning, keep growing."</p>
      </div>
      <div style="text-align:center;padding-top:20px;border-top:1px solid #f1f5f9;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">You're receiving this because you enabled daily reminders on InsightMint.</p>
      </div>
    </div>
    <div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">© 2024 InsightMint · Built for curious minds</div>
  </div>
</body></html>`;
}

function getWelcomeHTML({ userName }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🌱</div>
      <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;">Welcome to InsightMint!</h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);">Your AI-powered learning journey starts now</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
      <h2 style="color:#0f172a;">Hey ${userName}! 👋</h2>
      <p style="color:#64748b;line-height:1.6;">Welcome aboard! You've unlocked a smarter way to learn.</p>
      <div style="margin:24px 0;">
        ${[['🎬','Explore Videos','Best YouTube videos on any topic'],['🗺️','Learning Roadmaps','AI-generated paths to master any skill'],['🧠','AI Study Tools','Summaries, flashcards & quizzes'],['📄','Smart Summarizer','Summarize PDFs, videos, or any URL']].map(([i,t,d])=>`<div style="display:flex;gap:14px;padding:14px;background:#f8fafc;border-radius:10px;margin-bottom:10px;"><span style="font-size:22px;">${i}</span><div><div style="font-weight:700;color:#0f172a;">${t}</div><div style="color:#64748b;font-size:13px;">${d}</div></div></div>`).join('')}
      </div>
      <div style="text-align:center;margin-top:28px;">
        <a href="http://localhost:5173" style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">Start Learning Now →</a>
      </div>
    </div>
  </div>
</body></html>`;
}

async function sendDailyReminder({ to, userName, stats, roadmaps, streak }) {
  const t = getTransporter();
  if (!t) return { success: false, error: 'Email not configured' };
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || 'InsightMint <noreply@insightmint.com>',
      to, subject: `🌿 Your daily learning reminder — ${new Date().toLocaleDateString('en-US',{weekday:'long'})}`,
      html: getDailyReminderHTML({ userName, stats, roadmaps, streak })
    });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

async function sendWelcomeEmail({ to, userName }) {
  const t = getTransporter();
  if (!t) return { success: false, error: 'Email not configured' };
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM, to, subject: '🌱 Welcome to InsightMint!', html: getWelcomeHTML({ userName }) });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

async function sendTestEmail(to) {
  const t = getTransporter();
  if (!t) return { success: false, error: 'Email not configured. Set EMAIL_USER and EMAIL_PASS in server/.env' };
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM, to,
      subject: '✅ InsightMint — Email notifications are working!',
      html: `<div style="font-family:Arial;max-width:500px;margin:auto;padding:32px;background:#f0fdf9;border-radius:16px;"><h2 style="color:#0f766e;">✅ Email notifications working!</h2><p style="color:#374151;">Your InsightMint email notifications are configured correctly. You will now receive daily learning reminders.</p><p style="color:#6b7280;font-size:13px;">Sent at ${new Date().toLocaleString()}</p></div>`
    });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

module.exports = { sendDailyReminder, sendWelcomeEmail, sendTestEmail };