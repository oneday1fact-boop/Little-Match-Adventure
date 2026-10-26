/* Original, softly voiced pentatonic music. No recordings or remote audio. */
window.LMAAudio = (() => {
  let context,
    musicBus,
    melodyTimer,
    step = 0,
    nextNote = 0,
    paused = false;
  let music = false,
    effects = true;
  const melody = [
    72,
    76,
    79,
    76,
    74,
    76,
    72,
    null,
    69,
    72,
    76,
    74,
    72,
    69,
    67,
    null,
    72,
    74,
    76,
    79,
    81,
    79,
    76,
    null,
    74,
    76,
    72,
    69,
    67,
    69,
    72,
    null,
  ];
  function init() {
    if (!context) {
      context = new (window.AudioContext || window.webkitAudioContext)();
      musicBus = context.createGain();
      musicBus.gain.value = music ? 1 : 0;
      musicBus.connect(context.destination);
    }
    if (context.state === "suspended" && !paused && !document.hidden)
      context.resume().catch(() => {});
    return context;
  }
  function note(
    midi,
    when,
    duration,
    volume,
    type = "sine",
    background = false,
  ) {
    if (!context || midi === null) return;
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = type;
    voice.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, when);
    envelope.gain.linearRampToValueAtTime(volume, when + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    voice.connect(envelope);
    envelope.connect(background ? musicBus : context.destination);
    voice.start(when);
    voice.stop(when + duration + 0.05);
    voice.onended = () => {
      voice.disconnect();
      envelope.disconnect();
    };
  }
  function schedule() {
    if (!context || !music || paused || document.hidden) return;
    while (nextNote < context.currentTime + 0.18) {
      note(melody[step % melody.length], nextNote, 0.8, 0.035, "sine", true);
      if (step % 4 === 0) {
        note(step % 16 < 8 ? 48 : 53, nextNote, 1.9, 0.016, "sine", true);
        note(step % 16 < 8 ? 55 : 60, nextNote, 1.7, 0.009, "sine", true);
      }
      step++;
      nextNote += 0.43;
    }
  }
  function sync() {
    clearInterval(melodyTimer);
    melodyTimer = null;
    if (!context) return;
    musicBus.gain.setTargetAtTime(music ? 1 : 0, context.currentTime, 0.025);
    if (paused || document.hidden) {
      context.suspend().catch(() => {});
      return;
    }
    context.resume().catch(() => {});
    if (music) {
      nextNote = context.currentTime + 0.05;
      schedule();
      melodyTimer = setInterval(schedule, 100);
    }
  }
  return {
    configure(options) {
      music = options.music;
      effects = options.effects;
      sync();
    },
    unlock() {
      try {
        init();
        if (music && !melodyTimer) sync();
      } catch {}
    },
    pause(value) {
      paused = value;
      sync();
    },
    click() {
      if (!effects || paused || document.hidden) return;
      try {
        init();
        note(79, context.currentTime, 0.09, 0.025);
      } catch {}
    },
    celebrate() {
      if (!effects || paused || document.hidden) return;
      try {
        init();
        [72, 76, 79, 84].forEach((n, i) =>
          note(n, context.currentTime + i * 0.13, 0.5, 0.045),
        );
      } catch {}
    },
    visibility() {
      sync();
    },
  };
})();
document.addEventListener("visibilitychange", () =>
  window.LMAAudio.visibility(),
);
