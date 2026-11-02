// Look 1 voice teacher: speaks words, praises the child by name, listens to "say it" attempts.
// Powered by Project Read (projectread.ai/tools/word-mapper) studio phonics recordings and alignments.
(() => {
  const synth = window.speechSynthesis;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const KEY = "look1.voice";
  let on = true, voices = [], lastLine = "", greeted = false;
  try { on = localStorage.getItem(KEY) !== "0"; } catch {}

  const V = (window.L1Voice = { name: "", canListen: !!SR });

  // Pre-warm the speech synthesis engine on first interaction to eliminate initial audio latency
  let primed = false;
  const prime = () => {
    if (primed) return;
    primed = true;
    try {
      if (synth) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0.01;
        u.rate = 10;
        synth.speak(u);
      }
    } catch {}
  };
  ["touchstart", "mousedown", "pointerdown", "keydown"].forEach(evt => {
    window.addEventListener(evt, prime, { once: true, passive: true });
  });

  const load = () => { try { voices = synth ? synth.getVoices() : []; } catch { voices = []; } };
  if (synth) { load(); synth.addEventListener && synth.addEventListener("voiceschanged", load); }

  function best(prefix) {
    let top = null, topScore = -1;
    for (const v of voices) {
      const lang = (v.lang || "").replace("_", "-").toLowerCase();
      if (!lang.startsWith(prefix)) continue;
      let s = 0;
      if (prefix === "en") s += lang === "en-us" ? 3 : lang === "en-gb" ? 2 : 0;
      if (/natural|neural|online|premium|enhanced/i.test(v.name)) s += 6;
      if (/google/i.test(v.name)) s += 4;
      if (/samantha|ava|allison|aria|jenny|zira|karen|serena|siri|female/i.test(v.name)) s += 3;
      if (v.localService) s += 1;
      if (s > topScore) { top = v; topScore = s; }
    }
    return top;
  }

  const pickOne = a => { let l; do { l = a[Math.floor(Math.random() * a.length)]; } while (a.length > 1 && l === lastLine); lastLine = l; return l; };
  const nm = () => V.name || "";
  const fill = s => s.replace(/\{n\}/g, nm()).replace(/\s+([,!.])/g, "$1").replace(/,\s*$/, "").trim();

  let activeSoundOutId = 0;
  let activeHighlightFn = null;
  let currentAudio = null;
  let currentAnim = null;

  function speak(text, o = {}) {
    if (!text || !synth || !on) { o.onend && o.onend(); return; }
    try {
      if (o.cancel && (synth.speaking || synth.pending)) {
        synth.cancel();
      }
      const u = new SpeechSynthesisUtterance(text);
      const ar = o.lang === "ar";
      const v = best(ar ? "ar" : "en");
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = ar ? "ar-SA" : "en-US";
      u.rate = o.rate ?? (ar ? 0.85 : 0.84);
      u.pitch = o.pitch ?? 1;
      if (o.onstart) u.onstart = o.onstart;
      if (o.onend) {
        let done = false;
        const f = () => { if (!done) { done = true; o.onend && o.onend(); } };
        u.onend = f; u.onerror = f;
        setTimeout(f, 3500 + text.length * 120);
      }
      synth.speak(u);
    } catch { o.onend && o.onend(); }
  }

  const article = w => (/^[aeiou]/i.test(w) ? "an" : "a");

  V.registerHighlight = fn => {
    activeHighlightFn = fn;
  };

  V.stop = () => {
    activeSoundOutId++;
    if (activeHighlightFn) {
      try { activeHighlightFn(-1); } catch {}
    }
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }
    if (currentAnim) {
      cancelAnimationFrame(currentAnim);
      currentAnim = null;
    }
    try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch {}
  };
  V.say = t => speak(t, { cancel: true });
  V.queue = (t, rate) => speak(t, { rate });

  // Standard International Phonetic Alphabet (IPA) sounds for letter pronunciations
  const IPA_LETTERS = {
    a: "ah",   // /æ/ as in apple, cat
    b: "buh",  // /b/ as in bag, book
    c: "kuh",  // /k/ as in crayon, cat
    d: "duh",  // /d/ as in desk, dog
    e: "eh",   // /e/ as in pen, elephant
    f: "fuh",  // /f/ as in fish
    g: "guh",  // /ɡ/ as in bag, girl
    h: "huh",  // /h/ as in hat
    i: "ih",   // /ɪ/ as in pencil, in
    j: "juh",  // /dʒ/ as in jam
    k: "kuh",  // /k/ as in book, kite
    l: "luh",  // /l/ as in ruler, leg
    m: "muh",  // /m/ as in monkey
    n: "nuh",  // /n/ as in pen, net
    o: "aw",   // /ɒ/ as in on, octopus
    p: "puh",  // /p/ as in pen, pencil
    q: "kwuh", // /kw/ as in queen
    r: "ruh",  // /r/ as in ruler, rubber
    s: "suh",  // /s/ as in desk, sun
    t: "tuh",  // /t/ as in teacher, tent
    u: "uh",   // /ʌ/ as in rubber, umbrella
    v: "vuh",  // /v/ as in van
    w: "wuh",  // /w/ as in wet, window
    x: "ks",   // /ks/ as in box, fox
    y: "yuh",  // /j/ as in yes, yo-yo
    z: "zuh"   // /z/ as in zebra
  };
  V.ipaSound = ch => IPA_LETTERS[String(ch || "").toLowerCase()] || ch;

  // Project Read Word Mapper reference data: studio audio + exact millisecond character alignments
  const PROJECT_READ = {
  "bag": {
    "audio": "/audio/bag.mp3",
    "chars": [
      {
        "c": "b",
        "s": 0.128,
        "e": 0.255
      },
      {
        "c": "a",
        "s": 0.255,
        "e": 0.453
      },
      {
        "c": "g",
        "s": 0.453,
        "e": 0.58
      }
    ],
    "blend": {
      "s": 0.58,
      "e": 1.115
    }
  },
  "book": {
    "audio": "/audio/book.mp3",
    "chars": [
      {
        "c": "b",
        "s": 0.151,
        "e": 0.244
      },
      {
        "c": "o",
        "s": 0.244,
        "e": 0.325
      },
      {
        "c": "o",
        "s": 0.325,
        "e": 0.395
      },
      {
        "c": "k",
        "s": 0.395,
        "e": 0.522
      }
    ],
    "blend": {
      "s": 0.522,
      "e": 1.068
    }
  },
  "crayon": {
    "audio": "/audio/crayon.mp3",
    "chars": [
      {
        "c": "c",
        "s": 0.186,
        "e": 0.313
      },
      {
        "c": "r",
        "s": 0.313,
        "e": 0.406
      },
      {
        "c": "a",
        "s": 0.406,
        "e": 0.488
      },
      {
        "c": "y",
        "s": 0.488,
        "e": 0.569
      },
      {
        "c": "o",
        "s": 0.569,
        "e": 0.697
      },
      {
        "c": "n",
        "s": 0.697,
        "e": 0.848
      }
    ],
    "blend": {
      "s": 0.848,
      "e": 1.393
    }
  },
  "pen": {
    "audio": "/audio/pen.mp3",
    "chars": [
      {
        "c": "p",
        "s": 0.174,
        "e": 0.255
      },
      {
        "c": "e",
        "s": 0.255,
        "e": 0.395
      },
      {
        "c": "n",
        "s": 0.395,
        "e": 0.522
      }
    ],
    "blend": {
      "s": 0.522,
      "e": 1.115
    }
  },
  "pencil": {
    "audio": "/audio/pencil.mp3",
    "chars": [
      {
        "c": "p",
        "s": 0.139,
        "e": 0.232
      },
      {
        "c": "e",
        "s": 0.232,
        "e": 0.302
      },
      {
        "c": "n",
        "s": 0.302,
        "e": 0.372
      },
      {
        "c": "c",
        "s": 0.372,
        "e": 0.464
      },
      {
        "c": "i",
        "s": 0.464,
        "e": 0.546
      },
      {
        "c": "l",
        "s": 0.546,
        "e": 0.65
      }
    ],
    "blend": {
      "s": 0.65,
      "e": 1.161
    }
  },
  "case": {
    "audio": "/audio/case.mp3",
    "chars": [
      {
        "c": "c",
        "s": 0.104,
        "e": 0.232
      },
      {
        "c": "a",
        "s": 0.232,
        "e": 0.43
      },
      {
        "c": "s",
        "s": 0.43,
        "e": 0.522
      },
      {
        "c": "e",
        "s": 0.522,
        "e": 0.72
      }
    ],
    "blend": {
      "s": 0.72,
      "e": 1.115
    }
  },
  "rubber": {
    "audio": "/audio/rubber.mp3",
    "chars": [
      {
        "c": "r",
        "s": 0.209,
        "e": 0.302
      },
      {
        "c": "u",
        "s": 0.302,
        "e": 0.36
      },
      {
        "c": "b",
        "s": 0.36,
        "e": 0.418
      },
      {
        "c": "b",
        "s": 0.418,
        "e": 0.476
      },
      {
        "c": "e",
        "s": 0.476,
        "e": 0.557
      },
      {
        "c": "r",
        "s": 0.557,
        "e": 0.662
      }
    ],
    "blend": {
      "s": 0.662,
      "e": 1.3
    }
  },
  "ruler": {
    "audio": "/audio/ruler.mp3",
    "chars": [
      {
        "c": "r",
        "s": 0.139,
        "e": 0.232
      },
      {
        "c": "u",
        "s": 0.232,
        "e": 0.325
      },
      {
        "c": "l",
        "s": 0.325,
        "e": 0.418
      },
      {
        "c": "e",
        "s": 0.418,
        "e": 0.476
      },
      {
        "c": "r",
        "s": 0.476,
        "e": 0.557
      }
    ],
    "blend": {
      "s": 0.557,
      "e": 1.022
    }
  },
  "teacher": {
    "audio": "/audio/teacher.mp3",
    "chars": [
      {
        "c": "t",
        "s": 0.139,
        "e": 0.244
      },
      {
        "c": "e",
        "s": 0.244,
        "e": 0.313
      },
      {
        "c": "a",
        "s": 0.313,
        "e": 0.383
      },
      {
        "c": "c",
        "s": 0.383,
        "e": 0.43
      },
      {
        "c": "h",
        "s": 0.43,
        "e": 0.499
      },
      {
        "c": "e",
        "s": 0.499,
        "e": 0.569
      },
      {
        "c": "r",
        "s": 0.569,
        "e": 0.697
      }
    ],
    "blend": {
      "s": 0.697,
      "e": 1.115
    }
  },
  "poster": {
    "audio": "/audio/poster.mp3",
    "chars": [
      {
        "c": "p",
        "s": 0.151,
        "e": 0.279
      },
      {
        "c": "o",
        "s": 0.279,
        "e": 0.43
      },
      {
        "c": "s",
        "s": 0.43,
        "e": 0.522
      },
      {
        "c": "t",
        "s": 0.522,
        "e": 0.615
      },
      {
        "c": "e",
        "s": 0.615,
        "e": 0.697
      },
      {
        "c": "r",
        "s": 0.697,
        "e": 0.801
      }
    ],
    "blend": {
      "s": 0.801,
      "e": 1.393
    }
  },
  "board": {
    "audio": "/audio/board.mp3",
    "chars": [
      {
        "c": "b",
        "s": 0.174,
        "e": 0.267
      },
      {
        "c": "o",
        "s": 0.267,
        "e": 0.348
      },
      {
        "c": "a",
        "s": 0.348,
        "e": 0.383
      },
      {
        "c": "r",
        "s": 0.383,
        "e": 0.453
      },
      {
        "c": "d",
        "s": 0.453,
        "e": 0.58
      }
    ],
    "blend": {
      "s": 0.58,
      "e": 1.068
    }
  },
  "chair": {
    "audio": "/audio/chair.mp3",
    "chars": [
      {
        "c": "c",
        "s": 0.139,
        "e": 0.244
      },
      {
        "c": "h",
        "s": 0.244,
        "e": 0.325
      },
      {
        "c": "a",
        "s": 0.325,
        "e": 0.406
      },
      {
        "c": "i",
        "s": 0.406,
        "e": 0.488
      },
      {
        "c": "r",
        "s": 0.488,
        "e": 0.592
      }
    ],
    "blend": {
      "s": 0.592,
      "e": 1.022
    }
  },
  "desk": {
    "audio": "/audio/desk.mp3",
    "chars": [
      {
        "c": "d",
        "s": 0.151,
        "e": 0.244
      },
      {
        "c": "e",
        "s": 0.244,
        "e": 0.406
      },
      {
        "c": "s",
        "s": 0.406,
        "e": 0.511
      },
      {
        "c": "k",
        "s": 0.511,
        "e": 0.639
      }
    ],
    "blend": {
      "s": 0.639,
      "e": 1.115
    }
  },
  "apple": {
    "audio": "/audio/apple.mp3",
    "chars": [
      {
        "c": "a",
        "s": 0.116,
        "e": 0.244
      },
      {
        "c": "p",
        "s": 0.244,
        "e": 0.337
      },
      {
        "c": "p",
        "s": 0.337,
        "e": 0.43
      },
      {
        "c": "l",
        "s": 0.43,
        "e": 0.511
      },
      {
        "c": "e",
        "s": 0.511,
        "e": 0.639
      }
    ],
    "blend": {
      "s": 0.639,
      "e": 1.022
    }
  }
};

  // Pre-load audio elements for zero-latency instant playback
  const audioCache = {};
  const getAudio = url => {
    if (!audioCache[url]) {
      const a = new Audio(url);
      a.preload = "auto";
      audioCache[url] = a;
    }
    return audioCache[url];
  };
  // Prime all audio objects
  Object.values(PROJECT_READ).forEach(m => { getAudio(m.audio); });

  V.lit = (word, gi, li) => {
    if (gi === 999) return true; // All letters highlighted (whole word blend)
    if (gi < 0 || gi == null) return false; // Nothing highlighted
    if (Array.isArray(gi)) return gi.includes(li);
    return gi === li; // Exact character index highlighted
  };

  V.sound = s => { if (s) speak(s, { cancel: true, rate: 0.88, pitch: 1.05 }); };
  V.letter = c => {
    const ch = String(c || "").toLowerCase().trim();
    if (!ch) return;
    speak(V.ipaSound(ch), { cancel: true, rate: 0.86, pitch: 1.05 });
  };
  V.tap = w => { if (w) speak(w, { cancel: true, rate: 0.85 }); };

  // Sound out each letter in perfect sync using Project Read Word Mapper:
  V.soundOut = (word, onHighlight) => {
    const raw = String(word || "").toLowerCase().trim();
    const h = onHighlight || activeHighlightFn;
    V.stop();
    activeSoundOutId++;
    const id = activeSoundOutId;

    if (!on) return;

    // Special case: two-word phrase "pencil case"
    if (raw === "pencil case") {
      playPencilCase(id, h);
      return;
    }

    const map = PROJECT_READ[raw];
    if (map) {
      playProjectReadWord(raw, map, id, h);
      return;
    }

    // Fallback for any unknown word: pronounce whole word with speech synthesis
    if (h) h(999);
    speak(raw, {
      cancel: true,
      rate: 0.78,
      onstart: () => { if (id === activeSoundOutId && h) h(999); },
      onend: () => { if (id === activeSoundOutId && h) h(-1); }
    });
  };

  function playProjectReadWord(word, map, id, h) {
    const audio = getAudio(map.audio);
    currentAudio = audio;
    audio.pause();
    audio.currentTime = 0;

    let highlighted = -1;
    const step = () => {
      if (id !== activeSoundOutId || currentAudio !== audio) return;
      const t = audio.currentTime;
      let target = -1;

      for (let i = 0; i < map.chars.length; i++) {
        const c = map.chars[i];
        if (t >= c.s && t < c.e) {
          target = i;
          break;
        }
      }

      if (target === -1 && t >= map.blend.s && t <= map.blend.e + 0.15) {
        target = 999; // Blend phase: whole word highlighted
      }

      if (target !== highlighted) {
        highlighted = target;
        if (h) h(target);
      }

      if (!audio.paused && !audio.ended && t <= map.blend.e + 0.25) {
        currentAnim = requestAnimationFrame(step);
      } else if (audio.ended || t > map.blend.e + 0.2) {
        // Blending finished: hold highlight briefly, then speak full sentence
        setTimeout(() => {
          if (id !== activeSoundOutId) return;
          speak("It's " + article(word) + " " + word + ".", {
            rate: 0.82,
            pitch: 1.0,
            onstart: () => { if (id === activeSoundOutId && h) h(999); },
            onend: () => { if (id === activeSoundOutId && h) h(-1); }
          });
        }, 220);
      }
    };

    audio.play().then(() => {
      if (id === activeSoundOutId) {
        currentAnim = requestAnimationFrame(step);
      }
    }).catch(err => {
      console.warn("Audio play failed, falling back to speech synthesis", err);
      if (h) h(999);
      speak(word, {
        onend: () => { if (id === activeSoundOutId && h) h(-1); }
      });
    });
  }

  function playPencilCase(id, h) {
    const pMap = PROJECT_READ["pencil"];
    const cMap = PROJECT_READ["case"];
    if (!pMap || !cMap) {
      if (h) h(999);
      speak("pencil case", {
        onend: () => { if (id === activeSoundOutId && h) h(-1); }
      });
      return;
    }

    // Part 1: play "pencil" (indices 0..5)
    const pAudio = getAudio(pMap.audio);
    currentAudio = pAudio;
    pAudio.pause();
    pAudio.currentTime = 0;

    let highlighted = -1;
    const pStep = () => {
      if (id !== activeSoundOutId || currentAudio !== pAudio) return;
      const t = pAudio.currentTime;
      let target = -1;

      for (let i = 0; i < pMap.chars.length; i++) {
        const c = pMap.chars[i];
        if (t >= c.s && t < c.e) {
          target = i;
          break;
        }
      }

      if (target === -1 && t >= pMap.blend.s && t <= pMap.blend.e + 0.15) {
        target = [0, 1, 2, 3, 4, 5]; // Highlight "pencil" during its blend
      }

      if (target !== highlighted) {
        highlighted = target;
        if (h) h(target);
      }

      if (!pAudio.paused && !pAudio.ended && t <= pMap.blend.e + 0.25) {
        currentAnim = requestAnimationFrame(pStep);
      } else if (pAudio.ended || t > pMap.blend.e + 0.2) {
        // Proceed to "case" after short pause
        setTimeout(() => {
          if (id !== activeSoundOutId) return;
          playCasePart();
        }, 180);
      }
    };

    function playCasePart() {
      const cAudio = getAudio(cMap.audio);
      currentAudio = cAudio;
      cAudio.pause();
      cAudio.currentTime = 0;

      let cHighlighted = -1;
      const cStep = () => {
        if (id !== activeSoundOutId || currentAudio !== cAudio) return;
        const t = cAudio.currentTime;
        let target = -1;

        // "pencil " is 7 chars (0..6), so "case" starts at index 7
        for (let i = 0; i < cMap.chars.length; i++) {
          const c = cMap.chars[i];
          if (t >= c.s && t < c.e) {
            target = 7 + i;
            break;
          }
        }

        if (target === -1 && t >= cMap.blend.s && t <= cMap.blend.e + 0.15) {
          target = [7, 8, 9, 10]; // Highlight "case" during its blend
        }

        if (target !== cHighlighted) {
          cHighlighted = target;
          if (h) h(target);
        }

        if (!cAudio.paused && !cAudio.ended && t <= cMap.blend.e + 0.25) {
          currentAnim = requestAnimationFrame(cStep);
        } else if (cAudio.ended || t > cMap.blend.e + 0.2) {
          // Whole phrase completed
          setTimeout(() => {
            if (id !== activeSoundOutId) return;
            speak("It's a pencil case.", {
              rate: 0.82,
              pitch: 1.0,
              onstart: () => { if (id === activeSoundOutId && h) h(999); },
              onend: () => { if (id === activeSoundOutId && h) h(-1); }
            });
          }, 220);
        }
      };

      cAudio.play().then(() => {
        if (id === activeSoundOutId) {
          currentAnim = requestAnimationFrame(cStep);
        }
      }).catch(() => {
        if (h) h(999);
        speak("pencil case", {
          onend: () => { if (id === activeSoundOutId && h) h(-1); }
        });
      });
    }

    pAudio.play().then(() => {
      if (id === activeSoundOutId) {
        currentAnim = requestAnimationFrame(pStep);
      }
    }).catch(() => {
      if (h) h(999);
      speak("pencil case", {
        onend: () => { if (id === activeSoundOutId && h) h(-1); }
      });
    });
  }

  V.word = (o, onHighlight) => {
    const w = o && (o.en || o); if (!w) return;
    V.soundOut(w, onHighlight);
  };

  // Tap an individual letter in a vocabulary word:
  V.tapLetter = (word, charIndex, onHighlight) => {
    const w = String(word || "").toLowerCase().trim();
    const h = onHighlight || activeHighlightFn;
    V.stop();
    activeSoundOutId++;
    const id = activeSoundOutId;

    const map = PROJECT_READ[w];
    if (map && map.chars[charIndex]) {
      const ch = map.chars[charIndex];
      const audio = getAudio(map.audio);
      currentAudio = audio;
      audio.pause();
      audio.currentTime = ch.s;
      if (h) h(charIndex);
      audio.play().then(() => {
        const checkEnd = () => {
          if (id !== activeSoundOutId || currentAudio !== audio) return;
          if (audio.currentTime >= ch.e || audio.paused) {
            audio.pause();
            setTimeout(() => {
              if (id === activeSoundOutId && h) h(-1);
            }, 300);
          } else {
            currentAnim = requestAnimationFrame(checkEnd);
          }
        };
        currentAnim = requestAnimationFrame(checkEnd);
      }).catch(() => {
        // Fallback to speech synthesis
        speak(V.ipaSound(ch.c), {
          rate: 0.86,
          pitch: 1.05,
          onstart: () => { if (id === activeSoundOutId && h) h(charIndex); },
          onend: () => { if (id === activeSoundOutId && h) h(-1); }
        });
      });
      return;
    }

    const sound = V.ipaSound(w[charIndex] || "");
    const lightUp = () => { if (id === activeSoundOutId && h) h(charIndex); };
    speak(sound, {
      cancel: true,
      rate: 0.86,
      pitch: 1.05,
      onstart: lightUp,
      onend: () => {
        setTimeout(() => {
          if (id === activeSoundOutId && h) h(-1);
        }, 400);
      }
    });
    setTimeout(lightUp, 35);
  };

  // Phonics card display (e.g. Aa / apple): speaks IPA letter sound, then the keyword
  V.phonicsCard = (letter, keyword) => {
    V.stop();
    activeSoundOutId++;
    const id = activeSoundOutId;
    const lSound = V.ipaSound(letter);
    const kw = String(keyword || "").toLowerCase().trim();

    speak(lSound, {
      cancel: true,
      rate: 0.86,
      pitch: 1.05,
      onend: () => {
        if (id !== activeSoundOutId) return;
        setTimeout(() => {
          if (id !== activeSoundOutId) return;
          speak(kw + ".", {
            rate: 0.78,
            pitch: 1.0
          });
        }, 250);
      }
    });
  };

  // Missing letter selection in Phonics activity:
  // - Plays the selected letter's sound with zero delay
  // - If correct: completes the word, pronounces the word clearly, and ONLY advances after pronunciation completes
  // - If incorrect: plays the tapped letter sound and offers gentle encouragement to try again
  V.missingLetterSelect = (selectedLetter, word, isCorrect, onAdvance) => {
    V.stop();
    activeSoundOutId++;
    const id = activeSoundOutId;
    const letterSound = V.ipaSound(selectedLetter);
    const w = String(word || "").toLowerCase().trim();

    if (isCorrect) {
      speak(letterSound, {
        cancel: true,
        rate: 0.86,
        pitch: 1.05,
        onend: () => {
          if (id !== activeSoundOutId) return;
          setTimeout(() => {
            if (id !== activeSoundOutId) return;
            const map = PROJECT_READ[w];
            if (map) {
              const audio = getAudio(map.audio);
              currentAudio = audio;
              audio.pause();
              audio.currentTime = map.blend.s; // Play whole word blend
              audio.play().then(() => {
                const checkDone = () => {
                  if (id !== activeSoundOutId || currentAudio !== audio) return;
                  if (audio.currentTime >= map.blend.e + 0.1 || audio.paused || audio.ended) {
                    audio.pause();
                    setTimeout(() => {
                      if (id !== activeSoundOutId) return;
                      speak("It's " + article(w) + " " + w + ".", {
                        rate: 0.82,
                        pitch: 1.0,
                        onend: () => {
                          if (id !== activeSoundOutId) return;
                          setTimeout(() => {
                            if (id !== activeSoundOutId) return;
                            onAdvance && onAdvance();
                          }, 350);
                        }
                      });
                    }, 200);
                  } else {
                    currentAnim = requestAnimationFrame(checkDone);
                  }
                };
                currentAnim = requestAnimationFrame(checkDone);
              }).catch(() => {
                fallbackPronounce();
              });
            } else {
              fallbackPronounce();
            }
          }, 200);
        }
      });

      function fallbackPronounce() {
        speak(w + ".", {
          rate: 0.76,
          pitch: 1.0,
          onend: () => {
            if (id !== activeSoundOutId) return;
            setTimeout(() => {
              if (id !== activeSoundOutId) return;
              speak("It's " + article(w) + " " + w + ".", {
                rate: 0.82,
                pitch: 1.0,
                onend: () => {
                  if (id !== activeSoundOutId) return;
                  setTimeout(() => {
                    if (id !== activeSoundOutId) return;
                    onAdvance && onAdvance();
                  }, 350);
                }
              });
            }, 200);
          }
        });
      }

      // Safety timeout to ensure activity progresses even if audio subsystem hangs
      setTimeout(() => {
        if (id === activeSoundOutId) onAdvance && onAdvance();
      }, 6500);
    } else {
      speak(letterSound, {
        cancel: true,
        rate: 0.86,
        pitch: 1.05,
        onend: () => {
          if (id !== activeSoundOutId) return;
          setTimeout(() => {
            if (id !== activeSoundOutId) return;
            V.oops();
          }, 200);
        }
      });
    }
  };

  // Card matching tap handler
  V.tapCard = id => {
    if (!id) return;
    const str = String(id);
    if (str.startsWith("case-")) {
      V.letter(str.replace("case-", ""));
    } else if (str.startsWith("pic-")) {
      const kw = str.replace("pic-", "");
      speak(kw, { cancel: true, rate: 0.85 });
    } else {
      speak(str, { cancel: true, rate: 0.85 });
    }
  };

  V.ar = t => speak(t, { cancel: true, lang: "ar" });
  V.hasArabic = () => !!best("ar");
  V.good = () => speak(fill(pickOne(["Great job, {n}!", "Yes! Well done!", "Super, {n}!", "That's right!", "Awesome!", "Fantastic, {n}!", "Yes! You got it!"])));
  V.oops = () => speak(fill(pickOne(["Oops! Try again.", "Almost! Try again, {n}.", "Not quite. You can do it!", "Hmm, have another go!"])));
  V.hello = () => {
    if (greeted) return; greeted = true;
    speak(fill("Hi {n}! Let's learn some English today."), { cancel: true });
  };
  V.done = stars => {
    const t = stars >= 3 ? "Wow, {n}! Three stars! You are a superstar!"
      : stars === 2 ? "Well done, {n}! Two stars!"
      : stars === 1 ? "Good try, {n}! Let us practise again."
      : "You finished, {n}! Well done!";
    speak(fill(t), { cancel: true });
  };

  // ---- "Say it!" : listen to the child and respond like an encouraging teacher ----
  const ALIASES = {
    board: ["bored", "bird", "border", "broad", "borde", "boar"],
    pen: ["pin", "pan", "ben", "ten", "pain", "penny", "peen", "10"],
    bag: ["back", "beg", "bad", "bug", "big", "pack", "bags"],
    book: ["look", "cook", "hook", "buck", "books", "took"],
    crayon: ["crown", "crane", "crying", "crayons", "cran", "krayon"],
    rubber: ["robber", "brother", "rubbers", "rober", "rover", "eraser"],
    ruler: ["roller", "rulers", "rule", "rooter", "looter"],
    pencil: ["pencils", "pensil", "cancel", "pence"],
    "pencil case": ["pencilcase", "pencil space", "pencils case", "pencil", "case", "pencil-case"],
    teacher: ["teachers", "t-shirt", "teach her", "feature"],
    poster: ["posters", "pasta", "toaster", "post"],
    chair: ["cheer", "share", "chairs", "cher", "char"],
    desk: ["disc", "disk", "dusk", "deck", "desks", "that's", "dex"],
    apple: ["apples", "aple", "opal"],
  };

  const stripFraming = s =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, " ")
      .replace(/\b(it's|its|it|is|this|that|that's|whats|what|a|an|the|my|say|said|see|look|oh)\b/g, " ")
      .replace(/\s+/g, " ")
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
    const t = String(target || "").toLowerCase().trim();
    const tClean = stripFraming(t) || t;
    const aliases = [t, tClean, ...(ALIASES[t] || []), ...(ALIASES[tClean] || [])];

    return alts.some(raw => {
      const a = String(raw || "").toLowerCase().trim();
      const aClean = stripFraming(a);
      const aFlat = a.replace(/[^a-z0-9]/g, "");
      const tFlat = t.replace(/[^a-z0-9]/g, "");

      if (a === t || aFlat === tFlat || aClean === tClean) return true;
      for (const al of aliases) {
        if (a === al || aClean === al || aFlat === al.replace(/[^a-z0-9]/g, "")) return true;
      }

      const words = aClean ? aClean.split(" ") : a.split(" ");
      if (words.includes(t) || words.includes(tClean)) return true;
      for (const al of aliases) {
        if (words.includes(al)) return true;
      }

      const tTokens = t.split(" ").filter(Boolean);
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
    const t = String(target || "").toLowerCase();
    if (!SR) { cb({ ok: false, msg: "" }); return; }
    let finished = false;
    const finish = r => { if (!finished) { finished = true; cb(r); } };
    const start = () => {
      let rec;
      try { rec = new SR(); } catch { finish({ ok: false, msg: "" }); return; }
      rec.lang = "en-US"; rec.maxAlternatives = 5; rec.interimResults = false; rec.continuous = false;
      let got = false;
      rec.onresult = e => {
        got = true;
        const alts = Array.from(e.results[0] || []).map(a => a.transcript.toLowerCase().replace(/[^a-z' ]/g, "").trim()).filter(Boolean);
        if (isMatch(alts, t)) {
          speak(fill("Great job, {n}! You said " + t + "."), { cancel: true });
          finish({ ok: true, msg: "✔ You said “" + t + "”!" });
        } else {
          speak("Almost! Listen. " + t + ". Try again!", { cancel: true, rate: 0.8 });
          finish({ ok: false, msg: alts[0] ? "I heard “" + alts[0] + "”. Try again!" : "Try again!" });
        }
      };
      rec.onerror = e => {
        got = true;
        if (e.error === "not-allowed" || e.error === "service-not-allowed") finish({ ok: false, msg: "Please allow the microphone." });
        else if (e.error === "network") finish({ ok: false, msg: "I need the internet to listen." });
        else { speak("I couldn't hear you. Try again!", { cancel: true }); finish({ ok: false, msg: "I couldn't hear you. Try again!" }); }
      };
      rec.onend = () => { if (!got) { speak("I couldn't hear you. Try again!", { cancel: true }); finish({ ok: false, msg: "I couldn't hear you. Try again!" }); } };
      try { rec.start(); } catch { finish({ ok: false, msg: "" }); }
    };
    // Say the prompt first so the microphone does not hear the app's own voice.
    speak(fill("Your turn, {n}! Say: " + t + "."), { cancel: true, onend: start });
  };

  // ---- floating on/off button + small styles ----
  const css = document.createElement("style");
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
    const b = document.createElement("button");
    b.id = "l1-voice-toggle"; b.type = "button";
    const paint = () => { b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-label", on ? "Voice on. Tap to mute" : "Voice off. Tap to turn on"); };
    b.onclick = () => {
      on = !on;
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
      if (!on) V.stop(); else speak("Voice on!", { cancel: true });
      paint();
    };
    paint();
    document.body.appendChild(b);
  }
})();
