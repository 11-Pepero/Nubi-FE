export function programSchedule(program) {
  if (!program.startAt) return program.scheduleText ?? '일정 미정';
  const date = new Date(program.startAt);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

export function programDeadline(program) {
  const now = new Date();
  const closesAt = new Date(program.applyUntil);
  let deadline = null;
  if (program.applyUntil && Number.isFinite(closesAt.getTime())) {
    deadline = closesAt <= now ? -1 : Math.ceil((closesAt - now) / 86400000);
    if (deadline > 0 && closesAt.toDateString() === now.toDateString()) deadline = 0;
  }
  return {
    soon: deadline !== null && deadline >= 0 && deadline <= 3,
    label: deadline === null ? '상시' : deadline < 0 ? '마감' : deadline === 0 ? 'D-day' : `D-${deadline}`,
  };
}
