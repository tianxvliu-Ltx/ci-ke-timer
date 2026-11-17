const MAX_DURATION = (99 * 3600 + 59 * 60 + 59) * 1000;

const finite = (n, fallback = 0) => (
  Number.isFinite(n) && n >= 0 ? n : fallback
);

export class TimerEngine {
  constructor(saved = {}, now = () => Date.now()) {
    this.now = now;

    const cd = saved.countdown || {};
    const sw = saved.stopwatch || {};

    const duration = Math.min(
      MAX_DURATION,
      Math.max(1000, finite(cd.duration, 1500000))
    );

    this.countdown = {
      duration,
      remaining: Math.min(duration, finite(cd.remaining, duration)),
      deadline: finite(cd.deadline),
      running: cd.running === true && finite(cd.deadline) > 0,
      finished: cd.finished === true
    };

    this.stopwatch = {
      elapsed: finite(sw.elapsed),
      startedAt: finite(sw.startedAt),
      running: sw.running === true && finite(sw.startedAt) > 0,
      laps: []
    };

    if (Array.isArray(sw.laps)) {
      this.stopwatch.laps = sw.laps
        .filter((x) => Number.isFinite(x) && x >= 0)
        .slice(0, 500)
        .filter((x, i, a) => i === 0 || x >= a[i - 1]);
    }
  }

  value(mode) {
    const s = this[mode];

    if (mode === 'countdown') {
      return s.running
        ? Math.max(0, Math.min(s.duration, s.deadline - this.now()))
        : s.remaining;
    }

    return s.elapsed + (
      s.running ? Math.max(0, this.now() - s.startedAt) : 0
    );
  }

  start(mode) {
    const s = this[mode];

    if (s.running) return;

    if (mode === 'countdown') {
      if (s.remaining <= 0) {
        s.remaining = s.duration;
      }

      s.deadline = this.now() + s.remaining;
      s.finished = false;
    } else {
      s.startedAt = this.now();
    }

    s.running = true;
  }

  pause(mode) {
    const s = this[mode];

    if (!s.running) return;

    const value = this.value(mode);

    s.running = false;

    if (mode === 'countdown') {
      s.remaining = value;
    } else {
      s.elapsed = value;
    }
  }

  reset(mode) {
    if (mode === 'countdown') {
      Object.assign(this.countdown, {
        remaining: this.countdown.duration,
        deadline: 0,
        running: false,
        finished: false
      });
    } else {
      Object.assign(this.stopwatch, {
        elapsed: 0,
        startedAt: 0,
        running: false,
        laps: []
      });
    }
  }

  setDuration(ms) {
    if (
      this.countdown.running ||
      !Number.isInteger(ms) ||
      ms < 1000 ||
      ms > MAX_DURATION
    ) {
      return false;
    }

    this.countdown.duration = ms;
    this.reset('countdown');

    return true;
  }

  tick() {
    if (
      this.countdown.running &&
      this.value('countdown') <= 0
    ) {
      Object.assign(this.countdown, {
        running: false,
        remaining: 0,
        finished: true
      });

      return true;
    }

    return false;
  }

  lap() {
    if (
      !this.stopwatch.running ||
      this.stopwatch.laps.length >= 500
    ) {
      return false;
    }

    this.stopwatch.laps.push(this.value('stopwatch'));

    return true;
  }

  serialize() {
    return {
      countdown: { ...this.countdown },
      stopwatch: {
        ...this.stopwatch,
        laps: [...this.stopwatch.laps]
      }
    };
  }
}