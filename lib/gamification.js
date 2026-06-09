const XP_PER_COMPLETION = 25;
const XP_PER_LEVEL = 100;

function createDashboard(sessions) {
  const completedSessions = sessions.filter((session) => session.completed);
  const totalXP = completedSessions.length * XP_PER_COMPLETION;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;

  const weeklyStats = createPeriodStats(sessions, 7);
  const monthlyStats = createPeriodStats(sessions, 30);
  const streakDays = calculateStreakDays(completedSessions);

  const badges = [
    { name: '3日連続達成', unlocked: streakDays >= 3 },
    { name: '今週10回完了', unlocked: weeklyStats.summary.completed >= 10 },
    { name: 'Lv5到達', unlocked: level >= 5 }
  ];

  return {
    xp: totalXP,
    level,
    xpInLevel,
    xpToNextLevel: XP_PER_LEVEL - xpInLevel || XP_PER_LEVEL,
    streakDays,
    badges,
    weeklyStats,
    monthlyStats
  };
}

function createPeriodStats(sessions, days) {
  const now = new Date();
  const items = [];
  let totalCompleted = 0;
  let totalPlanned = 0;
  let totalFocusMinutes = 0;

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);

    const key = dateKey(day);
    const daySessions = sessions.filter((session) => dateKey(new Date(session.completedAt)) === key);

    const planned = daySessions.length;
    const completed = daySessions.filter((session) => session.completed).length;
    const focusMinutes = daySessions
      .filter((session) => session.completed)
      .reduce((total, session) => total + session.focusMinutes, 0);

    totalCompleted += completed;
    totalPlanned += planned;
    totalFocusMinutes += focusMinutes;

    items.push({
      label: `${day.getMonth() + 1}/${day.getDate()}`,
      completionRate: planned === 0 ? 0 : Math.round((completed / planned) * 100),
      avgFocusMinutes: completed === 0 ? 0 : Math.round(focusMinutes / completed)
    });
  }

  return {
    items,
    summary: {
      completed: totalCompleted,
      planned: totalPlanned,
      completionRate: totalPlanned === 0 ? 0 : Math.round((totalCompleted / totalPlanned) * 100),
      avgFocusMinutes: totalCompleted === 0 ? 0 : Math.round(totalFocusMinutes / totalCompleted)
    }
  };
}

function calculateStreakDays(completedSessions) {
  const completedKeys = new Set(completedSessions.map((session) => dateKey(new Date(session.completedAt))));
  let streak = 0;
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  while (completedKeys.has(dateKey(current))) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  createDashboard
};
