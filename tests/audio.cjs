const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const nodes = [];
const intervals = new Set();
let events = {};
class FakeAudio {
  constructor() {
    this.state = "running";
    this.currentTime = 1;
    this.destination = { name: "output" };
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.state = "suspended";
    return Promise.resolve();
  }
  createGain() {
    const node = {
      kind: "gain",
      gain: {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
        setTargetAtTime(value) {
          this.value = value;
        },
      },
      connect(target) {
        this.target = target;
      },
      disconnect() {},
    };
    nodes.push(node);
    return node;
  }
  createOscillator() {
    const node = {
      kind: "oscillator",
      frequency: { value: 0 },
      connect(target) {
        this.target = target;
      },
      disconnect() {},
      start() {},
      stop() {},
    };
    nodes.push(node);
    return node;
  }
}
const sandbox = {
  window: { AudioContext: FakeAudio },
  document: {
    hidden: false,
    addEventListener(name, fn) {
      events[name] = fn;
    },
  },
  setInterval(fn) {
    intervals.add(fn);
    return fn;
  },
  clearInterval(id) {
    intervals.delete(id);
  },
};
vm.runInNewContext(fs.readFileSync("audio.js", "utf8"), sandbox);
const audio = sandbox.window.LMAAudio;
audio.configure({ music: true, effects: false });
audio.unlock();
assert.equal(intervals.size, 1);
assert(nodes.some((node) => node.kind === "oscillator"));
const bus = nodes[0];
assert.equal(bus.gain.value, 1);
const before = nodes.length;
audio.click();
assert.equal(nodes.length, before);
audio.configure({ music: false, effects: true });
assert.equal(bus.gain.value, 0);
assert.equal(intervals.size, 0);
audio.click();
assert(nodes.length > before);
assert.equal(nodes.at(-1).target.name, "output");
audio.pause(true);
const paused = nodes.length;
audio.click();
assert.equal(nodes.length, paused);
audio.pause(false);
audio.configure({ music: true, effects: true });
assert.equal(intervals.size, 1);
sandbox.document.hidden = true;
events.visibilitychange();
assert.equal(intervals.size, 0);
sandbox.document.hidden = false;
events.visibilitychange();
assert.equal(intervals.size, 1);
console.log(
  "PASS: music has a separate mute bus, effects toggle independently, audio pauses for ads/hidden pages and resumes.",
);
