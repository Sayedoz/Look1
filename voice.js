// Look 1 voice teacher: speaks words, praises the child by name, listens to "say it" attempts.
// Uses the browser's built-in voices (works offline for speaking; listening needs the internet in most browsers).
(() => {
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const KEY = 'look1.voice';
  let on = true, voices = [], lastLine = '', greeted = false;
  try { on = localStorage.getItem(KEY) !== '0'; } catch {}

  const V = (window.L1Voice = { name: '', canListen: !!SR });

  const load = () => { try { voices = synth ? synth.getVoices() : []; } catch { voices = []; } };
  if (synth) { load(); synth.addEventListener && synth.addEventListener('voiceschanged', load); }

  function best(prefix) {
    let top = null, topScore = -1;
    for (const v of voices) {
      const lang = (v.lang || '').replace('_', '-').toLowerCase();
      if (!lang.startsWith(prefix)) continue;
      let s = 0;
      if (prefix === 'en') s += lang === 'en-us' ? 3 : lang === 'en-gb' ? 2 : 0;
      if (/natural|neural|online|premium|enhanced/i.test(v.name)) s += 6;
      if (/google/i.test(v.name)) s += 4;
      if (/samantha|ava|allison|aria|jenny|zira|karen|serena|siri|female/i.test(v.name)) s += 3;
      if (v.localService) s += 1;
      if (s > topScore) { top = v; topScore = s; }
    }
    return top;
  }

  const pickOne = a => { let l; do { l = a[Math.floor(Math.random() * a.length)]; } while (a.length > 1 && l === lastLine); lastLine = l; return l; };
  const nm = () => V.name || '';
  const fill = s => s.replace(/\{n\}/g, nm()).replace(/\s+([,!.])/g, '$1').replace(/,\s*$/, '').trim();

  let activeSoundOutId = 0;
  let activeHighlightFn = null;

  function speak(text, o = {}) {
    if (!text || !synth || !on) { o.onend && o.onend(); return; }
    try {
      if (o.cancel) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const ar = o.lang === 'ar';
      const v = best(ar ? 'ar' : 'en');
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = ar ? 'ar-SA' : 'en-US';
      u.rate = o.rate ?? (ar ? 0.85 : 0.88);
      u.pitch = o.pitch ?? 1;
      if (o.onstart) u.onstart = o.onstart;
      if (o.onend) {
        let done = false;
        const f = () => { if (!done) { done = true; o.onend(); } };
        u.onend = f; u.onerror = f;
        setTimeout(f, 3500 + text.length * 120);
      }
      synth.speak(u);
    } catch { o.onend && o.onend(); }
  }

  const article = w => (/^[aeiou]/i.test(w) ? 'an' : 'a');

  V.registerHighlight = fn => {
    activeHighlightFn = fn;
  };

  V.stop = () => {
    activeSoundOutId++;
    if (activeHighlightFn) {
      try { activeHighlightFn(-1); } catch {}
    }
    try { synth && synth.cancel(); } catch {}
  };
  V.say = t => speak(t, { cancel: true });
  V.queue = (t, rate) => speak(t, { rate });

  // Word -> sounds (grapheme, spoken sound). Respelled so browser voices say sounds, not letter names.
  const SOUNDS = {
    bag: [['b','buh'],['a','ah'],['g','guh']],
    book: [['b','buh'],['oo','oo'],['k','kuh']],
    crayon: [['c','kuh'],['r','ruh'],['ay','ay'],['on','on']],
    pen: [['p','puh'],['e','eh'],['n','nuh']],
    pencil: [['p','puh'],['e','eh'],['n','nuh'],['c','suh'],['i','ih'],['l','luh']],
    case: [['c','kuh'],['a','ay'],['se','suh']],
    rubber: [['r','ruh'],['u','uh'],['bb','buh'],['er','er']],
    ruler: [['r','ruh'],['u','oo'],['l','luh'],['er','er']],
    teacher: [['t','tuh'],['ea','ee'],['ch','chuh'],['er','er']],
    poster: [['p','puh'],['o','oh'],['s','suh'],['t','tuh'],['er','er']],
    board: [['b','buh'],['oar','or'],['d','duh']],
    chair: [['ch','chuh'],['air','air']],
    desk: [['d','duh'],['e','eh'],['s','suh'],['k','kuh']],
  };
  V.map = word => {
    const w = String(word || '').toLowerCase(), out = []; let pos = 0;
    for (const tok of w.split(' ')) {
      const start = w.indexOf(tok, pos), m = SOUNDS[tok];
      if (!m || start < 0) return null;
      let p = start;
      for (const [g, s] of m) { if (w.substr(p, g.length) !== g) return null; out.push({ g, s, a: p, b: p + g.length - 1 }); p += g.length; }
      if (p !== start + tok.length) return null;
      pos = p;
    }
    return out;
  };
  V.lit = (word, gi, li) => {
    if (gi === 999) return true; // All letters highlighted for whole word
    if (gi < 0) return false;
    const m = V.map(word);
    if (!m) return undefined;
    const g = m[gi];
    return !!g && li >= g.a && li <= g.b;
  };
  V.sound = s => { if (s) speak(s, { cancel: true, rate: 0.92, pitch: 1.05 }); };
  V.letter = c => { if (c && c.trim()) speak(c.toUpperCase(), { rate: 0.85 }); };
  V.tap = w => { if (w) speak(w, { cancel: true, rate: 0.85 }); };
  V.word = (o, onHighlight) => {
    const w = o && (o.en || o); if (!w) return;
    const h = onHighlight || activeHighlightFn;
    V.stop();
    if (h) h(999);
    speak(w + '.', {
      cancel: true,
      rate: 0.82,
      onstart: () => { if (h) h(999); },
      onend: () => {
        if (h) h(-1);
        speak(`It's ${article(w)} ${w}.`);
      }
    });
  };

  V.soundOut = (word, onHighlight) => {
    const w = String(word || '').toLowerCase().trim();
    const h = onHighlight || activeHighlightFn;
    V.stop();
    activeSoundOutId++;
    const id = activeSoundOutId;

    const m = V.map(w);
    if (!m || !m.length) {
      if (h) h(999);
      speak(w, {
        cancel: true,
        rate: 0.82,
        onstart: () => { if (id === activeSoundOutId && h) h(999); },
        onend: () => { if (id === activeSoundOutId && h) h(-1); }
      });
      return;
    }

    let idx = 0;
    const playNext = () => {
      if (id !== activeSoundOutId) return;

      if (idx >= m.length) {
        setTimeout(() => {
          if (id !== activeSoundOutId) return;
          if (h) h(999);
          speak(w, {
            rate: 0.82,
            pitch: 1.02,
            onstart: () => { if (id === activeSoundOutId && h) h(999); },
            onend: () => { if (id === activeSoundOutId && h) h(-1); }
          });
        }, 120);
        return;
      }

      const item = m[idx];
      const step = idx;
      idx++;

      let stepDone = false;
      const next = () => {
        if (stepDone || id !== activeSoundOutId) return;
        stepDone = true;
        setTimeout(playNext, 70);
      };

      speak(item.s, {
        rate: 0.95,
        pitch: 1.08,
        onstart: () => {
          if (id === activeSoundOutId && h) h(step);
        },
        onend: next
      });

      setTimeout(next, Math.max(500, item.s.length * 150));
    };

    playNext();
  };

  V.ar = t => speak(t, { cancel: true, lang: 'ar' });
  V.hasArabic = () => !!best('ar');
  V.good = () => speak(fill(pickOne(['Great job, {n}!', 'Yes! Well done!', 'Super, {n}!', "That's right!", 'Awesome!', 'Fantastic, {n}!', 'Yes! You got it!'])));
  V.oops = () => speak(fill(pickOne(['Oops! Try again.', 'Almost! Try again, {n}.', 'Not quite. You can do it!', 'Hmm, have another go!'])));
  V.hello = () => {
    if (greeted) return; greeted = true;
    speak(fill("Hi {n}! Let's learn some English today."), { cancel: true });
  };
  V.done = stars => {
    const t = stars >= 3 ? 'Wow, {n}! Three stars! You are a superstar!'
      : stars === 2 ? 'Well done, {n}! Two stars!'
      : stars === 1 ? 'Good try, {n}! Let us practise again.'
      : 'You finished, {n}! Well done!';
    speak(fill(t), { cancel: true });
  };

  // ---- "Say it!" : listen to the child and respond like an encouraging teacher ----
  const ALIASES = {
    board: ['bored', 'bird', 'border', 'broad', 'borde', 'boar'],
    pen: ['pin', 'pan', 'ben', 'ten', 'pain', 'penny', 'peen', '10'],
    bag: ['back', 'beg', 'bad', 'bug', 'big', 'pack', 'bags'],
    book: ['look', 'cook', 'hook', 'buck', 'books', 'took'],
    crayon: ['crown', 'crane', 'crying', 'crayons', 'cran', 'krayon'],
    rubber: ['robber', 'brother', 'rubbers', 'rober', 'rover', 'eraser'],
    ruler: ['roller', 'rulers', 'rule', 'rooter', 'looter'],
    pencil: ['pencils', 'pensil', 'cancel', 'pence'],
    'pencil case': ['pencilcase', 'pencil space', 'pencils case', 'pencil', 'case', 'pencil-case'],
    teacher: ['teachers', 't-shirt', 'teach her', 'feature'],
    poster: ['posters', 'pasta', 'toaster', 'post'],
    chair: ['cheer', 'share', 'chairs', 'cher', 'char'],
    desk: ['disc', 'disk', 'dusk', 'deck', 'desks', "that's", 'dex'],
    apple: ['apples', 'aple', 'opal'],
  };

  const stripFraming = s =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, ' ')
      .replace(/\b(it's|its|it|is|this|that|that's|whats|what|a|an|the|my|say|said|see|look|oh)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };

  const isWordClose = (w, target) => {
    if (!w || !target) return false;
    if (w === target) return true;
    const d = lev(w, target);
    if (target.length <= 3) return d <= 1;
    if (target.length <= 5) return d <= 1;
    return d <= 2;
  };

  const isMatch = (alts, target) => {
    const t = String(target || '').toLowerCase().trim();
    const tClean = stripFraming(t) || t;
    const aliases = [t, tClean, ...(ALIASES[t] || []), ...(ALIASES[tClean] || [])];

    return alts.some(raw => {
      const a = String(raw || '').toLowerCase().trim();
      const aClean = stripFraming(a);
      const aFlat = a.replace(/[^a-z0-9]/g, '');
      const tFlat = t.replace(/[^a-z0-9]/g, '');

      if (a === t || aFlat === tFlat || aClean === tClean) return true;
      for (const al of aliases) {
        if (a === al || aClean === al || aFlat === al.replace(/[^a-z0-9]/g, '')) return true;
      }

      const words = aClean ? aClean.split(' ') : a.split(' ');
      if (words.includes(t) || words.includes(tClean)) return true;
      for (const al of aliases) {
        if (words.includes(al)) return true;
      }

      const tTokens = t.split(' ').filter(Boolean);
      if (tTokens.length > 1) {
        if (tTokens.every(tk => words.some(w => isWordClose(w, tk)))) return true;
        if (words.some(w => isWordClose(w, tTokens[0]))) return true;
      }

      for (const w of words) {
        if (isWordClose(w, tClean) || isWordClose(w, t)) return true;
        for (const al of aliases) {
          if (isWordClose(w, al)) return true;
        }
      }

      return false;
    });
  };

  V.listen = (target, cb) => {
    const t = String(target || '').toLowerCase();
    if (!SR) { cb({ ok: false, msg: '' }); return; }
    let finished = false;
    const finish = r => { if (!finished) { finished = true; cb(r); } };
    const start = () => {
      let rec;
      try { rec = new SR(); } catch { finish({ ok: false, msg: '' }); return; }
      rec.lang = 'en-US'; rec.maxAlternatives = 5; rec.interimResults = false; rec.continuous = false;
      let got = false;
      rec.onresult = e => {
        got = true;
        const alts = Array.from(e.results[0] || []).map(a => a.transcript.toLowerCase().replace(/[^a-z' ]/g, '').trim()).filter(Boolean);
        if (isMatch(alts, t)) {
          speak(fill(`Great job, {n}! You said ${t}.`), { cancel: true });
          finish({ ok: true, msg: `✔ You said “${t}”!` });
        } else {
          speak(`Almost! Listen. ${t}. Try again!`, { cancel: true, rate: 0.8 });
          finish({ ok: false, msg: alts[0] ? `I heard “${alts[0]}”. Try again!` : 'Try again!' });
        }
      };
      rec.onerror = e => {
        got = true;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') finish({ ok: false, msg: 'Please allow the microphone.' });
        else if (e.error === 'network') finish({ ok: false, msg: 'I need the internet to listen.' });
        else { speak("I couldn't hear you. Try again!", { cancel: true }); finish({ ok: false, msg: "I couldn't hear you. Try again!" }); }
      };
      rec.onend = () => { if (!got) { speak("I couldn't hear you. Try again!", { cancel: true }); finish({ ok: false, msg: "I couldn't hear you. Try again!" }); } };
      try { rec.start(); } catch { finish({ ok: false, msg: '' }); }
    };
    // Say the prompt first so the microphone does not hear the app's own voice.
    speak(fill(`Your turn, {n}! Say: ${t}.`), { cancel: true, onend: start });
  };

  // ---- floating on/off button + small styles ----
  const css = document.createElement('style');
  css.textContent = `
#l1-voice-toggle{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;width:48px;height:48px;border-radius:50%;border:0;font-size:24px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer}
.say-it{display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:4px}
.say-it .btn{min-height:52px;font-size:18px;padding:6px 18px}
.say-btn.listen{animation:l1pulse 1s infinite}
.say-btn.good{background:#3bb273;border-color:#3bb273;color:#fff}
.say-heard{width:100%;text-align:center;font-size:18px;font-weight:700}
.say-heard.good{color:#2a8a58}.say-heard.try{color:#c0392b}
@keyframes l1pulse{50%{transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){.say-btn.listen{animation:none}}`;
  document.head.appendChild(css);
  if (synth) {
    const b = document.createElement('button');
    b.id = 'l1-voice-toggle'; b.type = 'button';
    const paint = () => { b.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-label', on ? 'Voice on. Tap to mute' : 'Voice off. Tap to turn on'); };
    b.onclick = () => {
      on = !on;
      try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
      if (!on) V.stop(); else speak('Voice on!', { cancel: true });
      paint();
    };
    paint();
    document.body.appendChild(b);
  }
})();
