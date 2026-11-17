import { TimerEngine } from './engine.js';

const $ = (id) => document.getElementById(id);
const storageKey = 'ci-ke-timer-v1';

let saved = {};
let storageAvailable = true;

try {
  saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
} catch {
  storageAvailable = false;
}

if (typeof saved !== 'object') saved = {};

const engine = new TimerEngine(saved);

let mode = saved.mode === 'stopwatch' ? 'stopwatch' : 'countdown';
let soundEnabled = saved.sound !== false;
let audio;
let previousDisplay = '';
let lastState = '';

const pad = (n) => String(n).padStart(2, '0');

function timeParts(ms, countdown = false) {
  const seconds = countdown ? Math.ceil(ms / 1000) : Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);

  return {
    main:
      (hours ? pad(hours) + ':' : '') +
      pad(Math.floor(seconds / 60) % 60) +
      ':' +
      pad(seconds % 60),
    fraction: '.' + pad(Math.floor(ms / 10) % 100),
    hours
  };
}

function persist() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...engine.serialize(),
        mode,
        sound: soundEnabled
      })
    );
  } catch {
    storageAvailable = false;
  }

  if (!storageAvailable) {
    document.querySelector('.save-note').innerHTML =
      '<span></span>此浏览器暂时无法保存进度';
    document.querySelector('.save-note').classList.add('storage-unavailable');
  }
}

const announce = (message) => {
  $('announcement').textContent = message;
};

function unlockAudio() {
  if (!soundEnabled) return;

  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();

    if (audio.state === 'suspended') {
      audio.resume().catch(() => {});
    }
  } catch {
    // 不支持音频时，仍然显示完成提醒。
  }
}

function ring() {
  if (!soundEnabled || !audio || audio.state !== 'running') return;

  try {
    [0, .35, .7].forEach((delay) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = 'sine';
      osc.frequency.value = 784;

      const start = audio.currentTime + delay;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.16, start + .02);
      gain.gain.exponentialRampToValueAtTime(.001, start + .28);

      osc.connect(gain);
      gain.connect(audio.destination);

      osc.start(start);
      osc.stop(start + .3);
    });
  } catch {}
}

function syncInputs() {
  const seconds = Math.floor(engine.countdown.duration / 1000);

  $('hours').value = Math.floor(seconds / 3600);
  $('minutes').value = Math.floor(seconds / 60) % 60;
  $('seconds').value = seconds % 60;
}

function renderLaps() {
  const laps = engine.stopwatch.laps;

  $('lap-count').textContent = laps.length + ' 次';
  $('lap-empty').hidden = laps.length > 0;
  $('laps-container').hidden = laps.length === 0;

  $('laps').replaceChildren(
    ...laps.map((total, i) => {
      const li = document.createElement('li');
      const split = timeParts(total - (laps[i - 1] || 0));
      const cumulative = timeParts(total);

      [
        pad(i + 1),
        split.main + split.fraction,
        cumulative.main + cumulative.fraction
      ].forEach((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        li.append(span);
      });

      return li;
    }).reverse()
  );
}

function render() {
  const s = engine[mode];
  const value = engine.value(mode);
  const countdown = mode === 'countdown';
  const parts = timeParts(value, countdown);
  const displayKey = mode + parts.main + parts.fraction;

  if (displayKey !== previousDisplay) {
    $('time-main').textContent = parts.main;
    $('time-fraction').textContent = parts.fraction;
    $('time-fraction').hidden = countdown;

    $('time-display').classList.toggle('long', !!parts.hours);
    $('time-display').setAttribute(
      'aria-label',
      (countdown ? '剩余 ' : '已计时 ') + parts.main
    );

    previousDisplay = displayKey;
  }

  const title =
    (s.running || s.finished || value > (countdown ? engine.countdown.duration : 0))
      ? (
        s.finished
          ? '时间到了'
          : parts.main + (countdown ? ' 倒计时' : ' 秒表')
      )
      : '此刻';

  const pageTitle = title + ' · 此刻计时';

  if (document.title !== pageTitle) {
    document.title = pageTitle;
  }

  $('progress-track').hidden = !countdown;

  if (countdown) {
    $('progress-fill').style.width =
      Math.max(0, value / s.duration * 100) + '%';
  }

  const stateKey =
    mode + s.running + s.finished + (value > 0) + engine.countdown.running;

  if (stateKey === lastState) return;
  lastState = stateKey;

  const status = s.running
    ? (countdown ? '专注进行中，慢慢来' : '正在记录每一刻')
    : s.finished
      ? '时间到了，休息一下吧'
      : value > 0 && (!countdown || value < s.duration)
        ? '已暂停，等你回来'
        : '准备好了，随时开始';

  $('status-text').textContent = status;
  $('status-pill').classList.toggle('running', s.running);
  $('status-pill').classList.toggle('finished', !!s.finished);
  $('time-display').classList.toggle('finished', !!s.finished);

  $('start').querySelector('span').textContent = s.running
    ? '暂停计时'
    : s.finished
      ? '再来一次'
      : (countdown ? value < s.duration && value > 0 : value > 0)
        ? '继续计时'
        : '开始计时';

  $('start').querySelector('use').setAttribute(
    'href',
    s.running ? '#i-pause' : '#i-play'
  );

  $('lap').hidden = countdown;
  $('lap').disabled = !s.running || engine.stopwatch.laps.length >= 500;

  $('timer-caption').textContent = countdown
    ? (s.finished ? '停一停，也是一种前进。' : '一小段专注，也是一大步。')
    : '不用赶路，记下自己的节奏。';

  $('session-label').textContent = countdown
    ? '留一段时间给自己'
    : '每一秒，都算数';

  document.querySelectorAll('[data-minutes]').forEach((button) => {
    button.disabled = engine.countdown.running;
    button.setAttribute(
      'aria-pressed',
      Number(button.dataset.minutes) * 60000 === engine.countdown.duration
        ? 'true'
        : 'false'
    );
  });

  for (const id of ['hours', 'minutes', 'seconds']) {
    $(id).disabled = engine.countdown.running;
  }

  document.querySelector('.apply-button').disabled = engine.countdown.running;
  $('running-note').hidden = !engine.countdown.running;
}

function setMode(next) {
  mode = next;

  document.querySelector('.workspace').classList.toggle(
    'stopwatch-mode',
    mode === 'stopwatch'
  );

  document.querySelectorAll('[data-mode]').forEach((tab) => {
    const selected = tab.dataset.mode === mode;

    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;

    let label = tab.dataset.mode === 'countdown' ? '倒计时' : '秒表';

    if (!selected && engine[tab.dataset.mode].running) {
      label += ' ·';
    }

    tab.textContent = label;
    tab.setAttribute(
      'aria-label',
      label.endsWith(' ·') ? label.slice(0, -2) + '正在运行' : label
    );
  });

  $('timer-view').setAttribute('aria-labelledby', 'tab-' + mode);
  $('countdown-settings').hidden = mode !== 'countdown';
  $('stopwatch-settings').hidden = mode !== 'stopwatch';

  lastState = '';
  render();
  persist();
}

function toggle() {
  unlockAudio();

  if (engine.tick()) finish();

  if (engine[mode].running) {
    engine.pause(mode);
    announce('计时已暂停');
  } else {
    engine.start(mode);
    $('completion').hidden = true;
    announce('计时已开始');
  }

  lastState = '';
  render();
  persist();
}

function reset() {
  engine.reset(mode);
  $('completion').hidden = true;

  if (mode === 'stopwatch') renderLaps();

  lastState = '';
  render();
  persist();
  announce('计时已重置');
}

function lap() {
  if (mode === 'stopwatch' && engine.lap()) {
    renderLaps();
    lastState = '';
    render();
    persist();
    announce('已记录第 ' + engine.stopwatch.laps.length + ' 次');
  }
}

function finish() {
  ring();
  $('completion').hidden = false;

  announce('倒计时结束，时间到了。');
  lastState = '';
  render();
  persist();

  $('tab-countdown').textContent = '倒计时';
  $('tab-countdown').setAttribute('aria-label', '倒计时');
}

function applyDuration(ms) {
  if (!engine.setDuration(ms)) return;

  $('completion').hidden = true;
  $('form-message').textContent = '';

  syncInputs();
  lastState = '';
  render();
  persist();
  announce('已设置时长 ' + timeParts(ms, true).main);
}

document.querySelectorAll('[data-mode]').forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

document.querySelector('[role=tablist]').addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();

    setMode(
      event.key === 'Home'
        ? 'countdown'
        : event.key === 'End'
          ? 'stopwatch'
          : mode === 'countdown'
            ? 'stopwatch'
            : 'countdown'
    );

    $('tab-' + mode).focus();
  }
});

$('start').addEventListener('click', toggle);
$('reset').addEventListener('click', reset);
$('lap').addEventListener('click', lap);

document.querySelectorAll('[data-minutes]').forEach((button) => {
  button.addEventListener('click', () => {
    applyDuration(Number(button.dataset.minutes) * 60000);
  });
});

$('custom-form').addEventListener('submit', (event) => {
  event.preventDefault();

  const inputs = ['hours', 'minutes', 'seconds'].map((id) => $(id));
  const values = inputs.map((input) => (
    input.value.trim() === '' ? NaN : Number(input.value)
  ));

  const invalid = values.findIndex((value, i) => (
    !Number.isInteger(value) ||
    value < 0 ||
    value > (i === 0 ? 99 : 59)
  ));

  if (invalid !== -1) {
    $('form-message').textContent =
      '请输入有效时长：小时 0–99，分、秒 0–59。';
    inputs[invalid].focus();
    return;
  }

  const ms = (values[0] * 3600 + values[1] * 60 + values[2]) * 1000;

  if (!ms) {
    $('form-message').textContent = '请设置至少 1 秒的时长。';
    $('seconds').focus();
    return;
  }

  applyDuration(ms);
});

function renderSound() {
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  $('sound').querySelector('span').textContent =
    soundEnabled ? '声音开启' : '声音关闭';

  $('sound').querySelector('use').setAttribute(
    'href',
    soundEnabled ? '#i-sound' : '#i-muted'
  );
}

$('sound').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  unlockAudio();
  renderSound();
  persist();
});

$('dismiss-completion').addEventListener('click', () => {
  $('completion').hidden = true;
});

async function fullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.body.requestFullscreen();
    }
  } catch {
    announce('当前浏览器暂不支持全屏显示');
  }
}

if (!document.fullscreenEnabled) {
  $('fullscreen').hidden = true;
}

$('fullscreen').addEventListener('click', fullscreen);

document.addEventListener('fullscreenchange', () => {
  $('fullscreen').setAttribute(
    'aria-label',
    document.fullscreenElement ? '退出全屏' : '进入全屏'
  );
});

document.addEventListener('keydown', (event) => {
  if (
    event.target.closest('input,textarea,select,button,a,[contenteditable=true]') ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.repeat
  ) return;

  if (event.code === 'Space') {
    event.preventDefault();
    toggle();
  } else if (event.key.toLowerCase() === 'r') {
    reset();
  } else if (event.key.toLowerCase() === 'l') {
    lap();
  } else if (event.key.toLowerCase() === 'f') {
    fullscreen();
  }
});

function tick() {
  if (engine.tick()) finish();
  render();
}

document.addEventListener('visibilitychange', () => {
  tick();
  persist();
});

window.addEventListener('pagehide', persist);

if (engine.tick()) {
  $('completion').hidden = false;
}

syncInputs();
renderLaps();
renderSound();
setMode(mode);

setInterval(tick, 40);