const test = require('node:test');
const assert = require('node:assert/strict');
const { createDashboard } = require('../lib/gamification');

test('createDashboard calculates level, streak, and badges', () => {
  const now = new Date();
  const sessions = [
    sessionForDaysAgo(now, 0, true, 25),
    sessionForDaysAgo(now, 1, true, 30),
    sessionForDaysAgo(now, 2, true, 20),
    sessionForDaysAgo(now, 3, false, 0),
    sessionForDaysAgo(now, 5, true, 25)
  ];

  const dashboard = createDashboard(sessions);

  assert.equal(dashboard.xp, 100);
  assert.equal(dashboard.level, 2);
  assert.equal(dashboard.streakDays, 3);
  assert.equal(dashboard.badges.find((badge) => badge.name === '3日連続達成').unlocked, true);
  assert.equal(dashboard.weeklyStats.items.length, 7);
  assert.equal(dashboard.monthlyStats.items.length, 30);
});

function sessionForDaysAgo(now, daysAgo, completed, focusMinutes) {
  const date = new Date(now);
  date.setDate(now.getDate() - daysAgo);
  date.setHours(10, 0, 0, 0);

  return {
    completedAt: date.toISOString(),
    plannedMinutes: 25,
    focusMinutes,
    completed
  };
}
