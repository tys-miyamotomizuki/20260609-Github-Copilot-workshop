let express = require('express');
let app = express();
require('ejs');
const { createDashboard } = require('./lib/gamification');
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index', { dashboard: createDashboard(timerSessions) });
});

app.post('/timer/complete', (req, res) => {
  const focusMinutes = normalizeFocusMinutes(req.body.focusMinutes);

  timerSessions.push({
    completedAt: new Date().toISOString(),
    plannedMinutes: focusMinutes,
    focusMinutes,
    completed: true
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const recentSessions = timerSessions.filter((session) => new Date(session.completedAt) >= cutoff);
  timerSessions.splice(0, timerSessions.length, ...recentSessions);

  res.redirect('/');
});

if (require.main === module) {
  app.listen(port);
}

module.exports = app;

function normalizeFocusMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 25;
  }

  return Math.min(60, Math.max(1, Math.round(parsed)));
}

function createSeedSessions() {
  const sessions = [];
  const now = new Date();

  for (let i = 0; i < 30; i += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);

    const plannedCount = i % 3 === 0 ? 3 : 2;
    const completedCount = Math.max(0, plannedCount - (i % 4 === 0 ? 1 : 0));

    for (let j = 0; j < plannedCount; j += 1) {
      sessions.push({
        completedAt: toIsoAtHour(day, 9 + j),
        plannedMinutes: 25,
        focusMinutes: j < completedCount ? 25 : 0,
        completed: j < completedCount
      });
    }
  }

  return sessions;
}

function toIsoAtHour(day, hour) {
  const timestamp = new Date(day);
  timestamp.setHours(hour, 0, 0, 0);
  return timestamp.toISOString();
}

const timerSessions = createSeedSessions();
