import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import sharp from "sharp";
import fluentFfmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const AUDIO_TARGET = 680 * 1024;
const AUDIO_HARD_CAP = 900 * 1024;
const OPUS_TARGET = 780 * 1024;
const COVER_TARGET = 120 * 1024;
const DOWNLOAD_LIMIT = 120 * 1024 * 1024;
const PAYLOAD_KB = 1300;
const RELAY_TIMEOUT_MS = 12000;
const FFMPEG_STEP_TIMEOUT_MS = 120000;

if (ffmpegInstaller?.path) {
  fluentFfmpeg.setFfmpegPath(ffmpegInstaller.path);
}

const ffmpegPathCache = ffmpegInstaller?.path || null;

function runFfmpeg(
  inputPath,
  outputPath,
  args,
  timeoutMs = FFMPEG_STEP_TIMEOUT_MS
) {
  return new Promise((resolve, reject) => {
    let timer;

    const cmd = fluentFfmpeg(inputPath)
      .outputOptions(args)
      .output(outputPath)
      .on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      })
      .on("end", () => {
        clearTimeout(timer);
        resolve();
      });

    timer = setTimeout(() => {
      try {
        cmd.kill("SIGKILL");
      } catch {}

      reject(new Error("ffmpeg timeout"));
    }, timeoutMs);

    cmd.run();
  });
}

function probeDurationSec(file) {
  return new Promise((resolve) => {
    if (!ffmpegPathCache) {
      return resolve(0);
    }

    execFile(
      ffmpegPathCache,
      ["-i", file],
      {
        timeout: 15000,
        maxBuffer: 2 * 1024 * 1024,
      },
      (_err, _stdout, stderr) => {
        const match =
          /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(
            String(stderr || "")
          );

        resolve(
          match
            ? Number(match[1]) * 3600 +
                Number(match[2]) * 60 +
                Number(match[3])
            : 0
        );
      }
    );
  });
}

async function probeBufferDuration(buffer) {
  const id = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const tmp = path.join(
    os.tmpdir(),
    `kana-duration-${id}.mp3`
  );

  try {
    fs.writeFileSync(tmp, buffer);
    return await probeDurationSec(tmp);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {}
  }
}

async function getDeliriusCandidate(ytUrl) {
  if (
    !/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(
      ytUrl
    )
  ) {
    throw new Error(
      "Debes proporcionar una URL válida de YouTube."
    );
  }

  const apiUrl =
    `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(
      ytUrl
    )}`;

  const res = await fetch(apiUrl, {
    signal: AbortSignal.timeout(120000),
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Delirius HTTP ${res.status}`);
  }

  const data = await res.json().catch(() => null);

  if (!data?.status || !data?.data?.download) {
    throw new Error(
      data?.message ||
        "Delirius no devolvió un enlace MP3"
    );
  }

  return data.data;
}

async function downloadBuffer(
  url,
  maxBytes = DOWNLOAD_LIMIT,
  timeoutMs = 150000
) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar`);
  }

  const len = Number(
    res.headers.get("content-length") || 0
  );

  if (len && len > maxBytes) {
    throw new Error("archivo demasiado grande");
  }

  const chunks = [];
  let total = 0;

  const reader = res.body.getReader();

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    total += value.length;

    if (total > maxBytes) {
      try {
        reader.cancel();
      } catch {}

      throw new Error("archivo demasiado grande");
    }

    chunks.push(Buffer.from(value));
  }

  if (!total) {
    throw new Error("descarga vacía");
  }

  return Buffer.concat(chunks);
}

async function compressAudio(
  buffer,
  targetBytes,
  dur,
  previewSecs = 0,
  codec = "mp3"
) {
  const id = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const tmpIn = path.join(
    os.tmpdir(),
    `p23-${id}-in`
  );

  const tmpOut = path.join(
    os.tmpdir(),
    `p23-${id}-out.${
      codec === "opus" ? "ogg" : "mp3"
    }`
  );

  fs.writeFileSync(tmpIn, buffer);

  try {
    if (!dur || dur <= 0.5) {
      dur = await probeDurationSec(tmpIn);
    }

    const fullDur = dur;

    let cut = 0;

    if (
      previewSecs &&
      fullDur > previewSecs + 2
    ) {
      cut = previewSecs;
    }

    let vk = Math.min(
      128,
      Math.floor(
        (targetBytes * 8) /
          1000 /
          Math.max(cut || fullDur, 1)
      )
    );

    if (codec !== "opus" && vk < 48) {
      vk = 48;

      cut = Math.floor(
        (targetBytes * 8) /
          (vk * 1000)
      );
    }

    const pre =
      cut > 0 &&
      cut < fullDur - 4
        ? [
            "-t",
            String(cut),
            "-af",
            `afade=t=out:st=${cut - 2.5}:d=2.5`,
          ]
        : [];

    const enc = (k) =>
      codec === "opus"
        ? [
            "-c:a",
            "libopus",
            "-b:a",
            `${k}k`,
            "-ac",
            k < 30 ? "1" : "2",
            "-ar",
            "48000",
            "-vbr",
            "off",
            "-application",
            "audio",
            "-compression_level",
            "10",
          ]
        : [
            "-c:a",
            "libmp3lame",
            "-b:a",
            `${k}k`,
            "-ac",
            "2",
            "-ar",
            "44100",
          ];

    await runFfmpeg(
      tmpIn,
      tmpOut,
      [...pre, ...enc(vk), "-y"]
    );

    let out = fs.readFileSync(tmpOut);

    if (out.length > AUDIO_HARD_CAP) {
      const rk =
        codec === "opus"
          ? Math.max(
              14,
              Math.floor(vk * 0.7)
            )
          : 32;

      await runFfmpeg(
        tmpIn,
        tmpOut,
        [...pre, ...enc(rk), "-y"]
      );

      out = fs.readFileSync(tmpOut);
    }

    return out.length <= AUDIO_HARD_CAP
      ? out
      : null;
  } finally {
    for (const file of [tmpIn, tmpOut]) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  }
}

async function makeCover(thumbBuf) {
  const attempts = [
    (img) =>
      img.resize(500, 500).jpeg({
        quality: 80,
      }),

    (img) =>
      img.resize(420, 420).jpeg({
        quality: 72,
      }),

    (img) =>
      img.resize(340, 340).jpeg({
        quality: 64,
      }),

    (img) =>
      img.resize(280, 280).jpeg({
        quality: 56,
      }),
  ];

  let best = null;

  for (const make of attempts) {
    try {
      const out = await make(
        sharp(thumbBuf)
      ).toBuffer();

      if (!best || out.length < best.length) {
        best = out;
      }

      if (out.length <= COVER_TARGET) {
        return out;
      }
    } catch {}
  }

  return best;
}

function cleanLyricsQuery(title) {
  let t = String(title || "");

  t = t.replace(
    /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu,
    " "
  );

  t = t.replace(
    /\([^()]*\)/g,
    (m) =>
      /official|audio|video|lyric|letra|visualizer|hd|4k|remaster|en vivo|live/i.test(
        m
      )
        ? " "
        : m
  );

  t = t.replace(
    /\[[^\[\]]*\]/g,
    (m) =>
      /official|audio|video|lyric|letra|visualizer|hd|4k/i.test(
        m
      )
        ? " "
        : m
  );

  t = t.replace(
    /\|\s*(?:official|audio|video|letra|lyrics?|music|hd|4k)\b[^|]*/gi,
    " "
  );

  t = t.replace(
    /\s[-–—]\s*(?:official\s+)?(?:music\s+)?(?:audio|video|lyrics?|letra|visualizer|hd|4k|remaster(?:ed)?).{0,60}$/gi,
    " "
  );

  t = t.replace(
    /\b(?:official|lyrics?)\s+(?:music\s+)?(?:video|audio)\b/gi,
    " "
  );

  t = t.replace(
    /\b(?:feat|ft)\.?\s+[^-|/]+/gi,
    " "
  );

  t = t
    .replace(/\(\s*\)/g, " ")
    .replace(/\[\s*\]/g, " ");

  t = t.replace(/\|\s*$/g, " ");

  t = t
    .replace(/\s{2,}/g, " ")
    .trim();

  return t;
}

async function lrcSearch(params) {
  const qs = new URLSearchParams(
    params
  ).toString();

  const res = await fetch(
    `https://lrclib.net/api/search?${qs}`,
    {
      headers: {
        "User-Agent": "Sats/1.0",
      },
      signal: AbortSignal.timeout(20000),
    }
  );

  if (!res.ok) return null;

  const list = await res.json();

  if (!Array.isArray(list) || !list.length) {
    return null;
  }

  return list;
}

async function fetchLyrics(title, artist) {
  const clean = cleanLyricsQuery(title);

  const artistName = String(artist || "")
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,
      " "
    )
    .replace(/\s{2,}/g, " ")
    .trim();

  const attempts = [
    {
      track_name: clean,
      artist_name: artistName,
    },

    {
      q: `${clean} ${artistName}`,
    },

    {
      q: clean,
    },

    {
      track_name: clean,
    },

    {
      q: String(title || "").trim(),
    },

    {
      q: artistName
        ? `${artistName} ${clean
            .split(" ")
            .slice(0, 4)
            .join(" ")}`
        : clean,
    },
  ];

  let fallbackPlain = "";

  for (const params of attempts) {
    if (!Object.values(params).every(Boolean)) {
      continue;
    }

    try {
      const list = await lrcSearch(params);

      if (!list) continue;

      const synced = list.find(
        (t) => t.syncedLyrics
      );

      if (synced) {
        return {
          synced: String(
            synced.syncedLyrics
          ),
          plain: String(
            synced.plainLyrics || ""
          ),
        };
      }

      const plain = list.find(
        (t) => t.plainLyrics
      );

      if (
        plain &&
        !fallbackPlain
      ) {
        fallbackPlain = String(
          plain.plainLyrics
        );
      }
    } catch {}
  }

  if (
    !fallbackPlain &&
    clean &&
    artistName
  ) {
    try {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(
          artistName
        )}/${encodeURIComponent(clean)}`,
        {
          signal:
            AbortSignal.timeout(25000),

          headers: {
            "User-Agent": "Sats/1.0",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();

        if (
          data?.lyrics &&
          String(data.lyrics).trim()
            .length > 20
        ) {
          fallbackPlain = String(
            data.lyrics
          )
            .replace(/\r\n/g, "\n")
            .trim();
        }
      }
    } catch {}
  }

  return {
    synced: "",
    plain: fallbackPlain,
  };
}

function parseLrc(lrc) {
  const lines = [];

  for (
    const raw of String(lrc || "").split("\n")
  ) {
    const match =
      /^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/.exec(
        raw.trim()
      );

    if (match) {
      lines.push({
        t:
          Number(match[1]) * 60 +
          Number(match[2]),

        s: match[3].trim(),
      });
    }
  }

  lines.sort((a, b) => a.t - b.t);

  return lines;
}

function safeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildPlayerHtml(card) {
  const data = safeScriptJson([card]);

  return `<style>
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;box-sizing:border-box}
body{margin:0;background:transparent;font-family:Arial,sans-serif;color:#fff}
.wrap{width:100%;max-width:640px;margin:auto;padding:clamp(6px,2.5vw,10px)}
.card{border-radius:28px;background:linear-gradient(180deg,#15151c,#0c0c11 60%,#0a0a0e);border:1px solid rgba(255,255,255,.09);box-shadow:0 18px 44px rgba(0,0,0,.55);padding:clamp(10px,3vw,14px) clamp(12px,3.5vw,16px) clamp(14px,4vw,18px)}
.head{text-align:center;font:900 9px Arial;letter-spacing:3px;padding:4px 0 12px;background:linear-gradient(90deg,red,orange,yellow,lime,cyan,blue,violet,red);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:rgb 2s linear infinite}
.artbox{background:#17171d;border-radius:18px;padding:12px}
.art{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;background:#000}
.trow{display:flex;align-items:center;gap:10px;margin:14px 2px 2px}
.meta{min-width:0;flex:1}
.title{font:900 clamp(17px,5.4vw,24px) Arial;color:#fff;line-height:1.12;word-break:break-word}
.artist{font:700 13px Arial;color:#9a9cad;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.heart{border:none;background:none;font-size:clamp(24px,8.5vw,30px);line-height:1;color:#e8e8ee;padding:4px 6px;transition:transform .18s,color .18s}
.heart.liked{color:#00e05a;transform:scale(1.22)}
.heart:active{transform:scale(.86)}
.seek{margin:16px 2px 0}
.bar{height:4px;border-radius:99px;background:rgba(255,255,255,.18);overflow:hidden}
.fill{height:100%;width:0;background:#fff;border-radius:99px}
.times{display:flex;justify-content:space-between;font:700 11px Arial;color:#9a9cad;margin-top:7px}
.ctr{display:flex;align-items:center;justify-content:space-between;margin:14px 6px 4px}
.ctr>*{flex:0 0 auto}
.side{border:none;background:none;color:#e6e6ee;width:clamp(34px,10.5vw,48px);height:clamp(34px,10.5vw,48px);border-radius:50%;display:flex;align-items:center;justify-content:center}
.side.on{color:#00e05a}
.pb{width:clamp(54px,17vw,72px);height:clamp(54px,17vw,72px);border-radius:50%;border:none;background:#fff;color:#0c0c11;box-shadow:0 6px 18px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}
.pb:active{transform:scale(.94)}
.lrcbox{margin-top:14px;background:#141419;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:10px 12px}
.lrcbox h4{margin:0 0 6px;font:900 9px Arial;letter-spacing:2.5px;color:#7d7f93}
.lrc{max-height:148px;overflow-y:auto;position:relative}
.ln{padding:5px 2px;font:700 13px Arial;color:#63656f;transition:color .25s;cursor:pointer}
.ln.on{color:#fff;font-weight:900}
.hint{text-align:center;font:700 9px Arial;color:#6a6c7c;margin-top:10px;min-height:12px}
@keyframes rgb{from{background-position:200% 0}to{background-position:0 0}}
</style>

<body>
<div class="wrap">
<div class="card">

<div class="head">F I X X</div>

<div class="artbox">
<img class="art" id="art" src="${card.cover}" alt="portada">
</div>

<div class="trow">
<div class="meta">
<div class="title" id="title"></div>
<div class="artist" id="artist"></div>
</div>

<button class="heart" id="heart">✦</button>
</div>

<div class="seek">
<div class="bar" id="bar">
<div class="fill" id="fill"></div>
</div>

<div class="times">
<span id="cur">0:00</span>
<span id="dur">0:00</span>
</div>
</div>

<div class="ctr">

<button class="side" id="shuf" aria-label="aleatorio">
<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<polyline points="16 3 21 3 21 8"/>
<line x1="4" y1="20" x2="21" y2="3"/>
<polyline points="21 16 21 21 16 21"/>
<line x1="15" y1="15" x2="21" y2="21"/>
<line x1="4" y1="4" x2="9" y2="9"/>
</svg>
</button>

<button class="side" id="prev" aria-label="anterior">
<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
<polygon points="19 20 9 12 19 4 19 20"/>
<rect x="5" y="4" width="2" height="16"/>
</svg>
</button>

<button class="pb" id="play" aria-label="reproducir">
<svg id="playic" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display:block;margin:auto">
<polygon points="8.5 6 19 12 8.5 18 8.5 6" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>
</button>

<button class="side" id="next" aria-label="siguiente">
<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
<polygon points="5 4 15 12 5 20 5 4"/>
<rect x="17" y="4" width="2" height="16"/>
</svg>
</button>

<button class="side" id="rep" aria-label="repetir">
<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<polyline points="17 1 21 5 17 9"/>
<path d="M3 11V9a4 4 0 0 1 4-4h14"/>
<polyline points="7 23 3 19 7 15"/>
<path d="M21 13v2a4 4 0 0 1-4 4H3"/>
</svg>
</button>

</div>

<div class="lrcbox">
<h4>LETRA - I A N</h4>
<div class="lrc" id="lrc"></div>
</div>

<div class="hint" id="hint">
Toca ✦ para escuchar· toca una línea de la letra para ir a ese momento
</div>

</div>
</div>

<audio id="aud" preload="auto"></audio>

<script>
(function(){

var D=${data}[0];

var LRC=${JSON.stringify(
    card.lrcLines || []
  )};

var playing=false,
    liked=false,
    rep=false,
    shuf=false,
    curLn=-1;

var aud=document.getElementById('aud');
var fill=document.getElementById('fill');
var bar=document.getElementById('bar');
var cur=document.getElementById('cur');
var dur=document.getElementById('dur');
var play=document.getElementById('play');
var lrc=document.getElementById('lrc');
var hint=document.getElementById('hint');

document.getElementById('title').textContent=
  D.title||'Desconocido';

document.getElementById('artist').textContent=
  D.artist||'Desconocido';

function fmt(s){

  if(!isFinite(s)||s<0)
    return '0:00';

  s=Math.floor(s);

  var m=Math.floor(s/60);

  var r=String(s%60).padStart(2,'0');

  return m+':'+r;
}

var SRCS=(D.audioUrls||[]).slice();

if(D.audio)
  SRCS.push(D.audio);

var si=0;
var stTimer=null;

function applySrc(){

  if(SRCS.length)
    aud.src=SRCS[si];

}

applySrc();

function clearSt(){

  if(stTimer){
    clearTimeout(stTimer);
    stTimer=null;
  }

}

function nextSrc(){

  if(si>=SRCS.length-1)
    return;

  si++;

  clearSt();

  applySrc();

  hint.textContent=
    SRCS[si].indexOf('data:')===0
      ? '✦ La transmisión no cargó; reproduciendo audio de respaldo.'
      : 'Cambiando a otra fuente de audio…';

  tryPlay();

}

aud.addEventListener(
  'error',
  function(){
    nextSrc();
  }
);

aud.addEventListener(
  'playing',
  clearSt
);

aud.addEventListener(
  'play',
  function(){

    clearSt();

    if(
      si<SRCS.length-1 &&
      SRCS[si].indexOf('data:')!==0
    ){

      stTimer=setTimeout(
        function(){

          if(!aud.currentTime)
            nextSrc();

        },
        9000
      );

    }

  }
);

dur.textContent=fmt(D.secs||0);

function tryPlay(){

  var r=aud.play();

  if(r&&r.catch){

    r.catch(
      function(){

        hint.textContent=
          'El navegador bloqueó el audio. Toca ✦ otra vez.';

      }
    );

  }

}

var IC_PLAY=
  '<polygon points="8.5 6 19 12 8.5 18 8.5 6" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>';

var IC_PAUSE=
  '<rect x="7.5" y="6" width="3.6" height="12.5" rx="1"/><rect x="13" y="6" width="3.6" height="12.5" rx="1"/>';

function setIcon(i){

  document.getElementById(
    'playic'
  ).innerHTML=i;

}

function toggle(){

  if(playing){

    aud.pause();

    playing=false;

    setIcon(IC_PLAY);

  }else{

    tryPlay();

    playing=true;

    setIcon(IC_PAUSE);

  }

}

play.addEventListener(
  'pointerdown',
  function(e){

    e.preventDefault();

    toggle();

  }
);

aud.addEventListener(
  'play',
  function(){

    playing=true;

    setIcon(IC_PAUSE);

  }
);

aud.addEventListener(
  'pause',
  function(){

    playing=false;

    setIcon(IC_PLAY);

  }
);

aud.addEventListener(
  'timeupdate',
  function(){

    var c=aud.currentTime||0;

    var d=aud.duration||(D.secs||0);

    cur.textContent=fmt(c);

    dur.textContent=fmt(d);

    fill.style.width=
      d
        ? Math.min(
            100,
            c/d*100
          )+'%'
        : '0%';

    syncLrc(c);

  }
);

aud.addEventListener(
  'ended',
  function(){

    if(rep){

      aud.currentTime=0;

      tryPlay();

    }else{

      playing=false;

      setIcon(IC_PLAY);

    }

  }
);

bar.addEventListener(
  'pointerdown',
  function(e){

    if(!aud.duration)
      return;

    var r=bar.getBoundingClientRect();

    aud.currentTime=
      Math.max(
        0,
        Math.min(
          aud.duration,
          (e.clientX-r.left)/
          r.width*
          aud.duration
        )
      );

  }
);

document.getElementById(
  'heart'
).addEventListener(
  'pointerdown',
  function(e){

    e.preventDefault();

    liked=!liked;

    this.classList.toggle(
      'liked',
      liked
    );

    this.textContent=
      liked
        ? '✦'
        : '✦';

  }
);

document.getElementById(
  'rep'
).addEventListener(
  'pointerdown',
  function(e){

    e.preventDefault();

    rep=!rep;

    this.classList.toggle(
      'on',
      rep
    );

  }
);

document.getElementById(
  'shuf'
).addEventListener(
  'pointerdown',
  function(e){

    e.preventDefault();

    shuf=!shuf;

    this.classList.toggle(
      'on',
      shuf
    );

  }
);

document.getElementById(
  'prev'
).addEventListener(
  'pointerdown',
  function(e){

    e.preventDefault();

    aud.currentTime=
      Math.max(
        0,
        aud.currentTime-10
      );

  }
);

document.getElementById(
  'next'
).addEventListener(
  'pointerdown',
  function(e){

    e.preventDefault();

    aud.currentTime=
      Math.min(
        aud.duration||1e9,
        aud.currentTime+10
      );

  }
);

(function(){

  if(!LRC.length){

    var PL=D.plainLines||[];

    if(!PL.length){

      lrc.innerHTML=
        '<div class="ln" style="text-align:center;color:#8b8fa8;font-style:italic">✦ Letra no encontrada</div>';

      return;

    }

    for(
      var k=0;
      k<PL.length;
      k++
    ){

      var p=
        document.createElement('div');

      p.className='ln';

      p.textContent=
        PL[k]||'✦';

      lrc.appendChild(p);

    }

    return;

  }

  for(
    var i=0;
    i<LRC.length;
    i++
  ){

    (function(n){

      var d=
        document.createElement('div');

      d.className='ln';

      d.textContent=
        LRC[n].s||'✦';

      d.addEventListener(
        'pointerdown',
        function(e){

          e.preventDefault();

          if(aud.duration){

            aud.currentTime=
              LRC[n].t;

            if(!playing)
              toggle();

          }

        }
      );

      lrc.appendChild(d);

    })(i);

  }

})();

function syncLrc(t){

  if(!LRC.length)
    return;

  var i=-1;

  for(
    var j=0;
    j<LRC.length;
    j++
  ){

    if(LRC[j].t<=t)
      i=j;
    else
      break;

  }

  if(i===curLn)
    return;

  var prev=
    lrc.querySelector(
      '.ln.on'
    );

  if(prev)
    prev.classList.remove(
      'on'
    );

  curLn=i;

  if(i<0)
    return;

  var el=lrc.children[i];

  if(el){

    el.classList.add('on');

    lrc.scrollTop=
      el.offsetTop-
      lrc.clientHeight/2+
      el.clientHeight/2;

  }

}

})();
</script>
</body>`;
}

function buildUnifiedResponseData(card) {
  return Buffer.from(
    JSON.stringify({
      response_id:
        "kana-music-" + Date.now(),

      sections: [
        {
          view_model: {
            primitive: {
              __typename:
                "GenAIaeacdsnwHtmlPrimitive",

              payload:
                buildPlayerHtml(card),

              trusted_sources: [
                "nixel.dev",
              ],
            },

            __typename:
              "GenAISingleLayoutViewModel",
          },
        },
      ],
    })
  ).toString("base64");
}

function buildPayload(card) {
  return {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,

      botMetadata: {
        messageDisclaimerText: "",

        botResponseId:
          "sat-tachibana-24lite",

        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,

              signature:
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",

              certificateChain: [
                "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGE=",
              ],
            },
          ],
        },
      },
    },

    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,

          submessages: [
            {
              messageType: 2,
              messageText:
                "✦ sᥲtsυkι tᥲᥴhιbᥲᥒᥲ",
            },
          ],

          unifiedResponse: {
            data:
              buildUnifiedResponseData(card),
          },

          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,

            forwardedAiBotMessageInfo: {
              botJid:
                "549387664077@bot",
            },

            forwardOrigin: 4,
          },
        },
      },
    },
  };
}

async function run(m, { sock, text }) {
  const query =
    String(text || "").trim();

  if (!query) {
    return m.reply(
        `> Envía una URL de YouTube.\n\n` +
        `*Ejemplo:*\n` +
        `\`${m.prefix || "#"}ytmp3 https://www.youtube.com/watch?v=xxxxx\`\n\n` +
        `También puedes usar: \`${m.prefix || "#"}ytmp3 <URL de YouTube>\``
    );
  }

  if (
    !/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(
      query
    )
  ) {
    return m.reply(
      `✦ API - Delirius\n\n` +
        `Envía una URL de YouTub:\n` +
        `\`${m.prefix || "#"}ytmp3 https://www.youtube.com/watch?v=xxxxx\``
    );
  }

  await m.react("☁").catch(
    () => {}
  );

  let video;

  try {
    video =
      await getDeliriusCandidate(
        query
      );
  } catch (e) {
    console.error(
      "[PREW] Delirius falló:",
      e?.message || e
    );

    await m.react("✦").catch(
      () => {}
    );

    return m.reply(
      `✦ No pude obtener el audio: ${
        e?.message ||
        "error desconocido"
      }`
    );
  }

  const title =
    String(
      video.title ||
        "Desconocido"
    ).trim();

  const artist =
    String(
      video.author ||
        "YouTube"
    ).trim();

  const thumbnail =
    String(
      video.image || ""
    ).trim();

  const audioUrl =
    String(
      video.download || ""
    ).trim();

  if (!audioUrl) {
    await m.react("❌").catch(
      () => {}
    );

    return m.reply(
      "✦ Delirius no devolvió el enlace del audio."
    );
  }

  let audioRaw;
  let audioDur = 0;

  try {
    audioRaw =
      await downloadBuffer(
        audioUrl
      );

    if (!audioRaw?.length) {
      throw new Error(
        "la descarga llegó vacía"
      );
    }

    audioDur =
      await probeBufferDuration(
        audioRaw
      ).catch(() => 0);

  } catch (e) {
    console.error(
      "[PREW] descarga Delirius falló:",
      e?.message || e
    );

    await m.react("✦").catch(
      () => {}
    );

    return m.reply(
      `✦ No se pudo descargar el audio: ${
        e?.message ||
        "error desconocido"
      }`
    );
  }

  let coverB64 = "";

  try {
    if (thumbnail) {
      const thumbRes =
        await fetch(
          thumbnail,
          {
            signal:
              AbortSignal.timeout(
                30000
              ),

            headers: {
              "User-Agent":
                "Mozilla/5.0",
            },
          }
        );

      if (thumbRes.ok) {
        const thumb =
          Buffer.from(
            await thumbRes.arrayBuffer()
          );

        const cov =
          await makeCover(
            thumb
          );

        if (cov) {
          coverB64 =
            `data:image/jpeg;base64,${cov.toString(
              "base64"
            )}`;
        }
      }
    }
  } catch (e) {
    console.error(
      "[prueba23] portada falló:",
      e?.message || e
    );
  }

  const lyrics =
    await fetchLyrics(
      title,
      artist
    );

  const lrcLines =
    parseLrc(
      lyrics.synced
    );

  const secs =
    audioDur || 0;

  const isLong =
    secs > 100;

  const opusKbps =
    Math.floor(
      (OPUS_TARGET * 8) /
        1000 /
        Math.max(secs, 1)
    );

  let opusFull =
    isLong &&
    opusKbps >= 16;

  let usedPreview = 0;
  let compressed = null;

  if (opusFull) {
    compressed =
      await compressAudio(
        audioRaw,
        OPUS_TARGET,
        secs,
        0,
        "opus"
      ).catch(
        () => null
      );
  }

  if (!compressed) {
    opusFull = false;

    usedPreview =
      isLong ? 64 : 0;

    compressed =
      await compressAudio(
        audioRaw,
        AUDIO_TARGET,
        secs,
        usedPreview,
        "mp3"
      ).catch(
        () => null
      );
  }

  if (!compressed) {
    await m.react("🕒").catch(
      () => {}
    );

    return m.reply(
      "✦ No se pudo procesar el audio para la tarjeta."
    );
  }

  const card = {
    title:
      cleanLyricsQuery(
        title
      ) || title,

    artist,

    secs,

    cover:
      coverB64 ||
      thumbnail,

    audio: "",

    audioUrls: [
      audioUrl,
    ],

    lrcLines:
      lrcLines.slice(
        0,
        120
      ),

    plainLines:
      lrcLines.length
        ? []
        : String(
            lyrics.plain ||
              ""
          )
            .split("\n")
            .map(
              (x) =>
                x.trim()
            )
            .filter(Boolean)
            .slice(0, 100),
  };

  const setAudio = (
    buf
  ) => {
    card.audio =
      `data:${
        opusFull
          ? "audio/ogg"
          : "audio/mpeg"
      };base64,${buf.toString(
        "base64"
      )}`;
  };

  setAudio(
    compressed
  );

  const relay = (
    payload
  ) =>
    Promise.race([
      sock.relayMessage(
        m.chat,
        payload,
        {}
      ),

      new Promise(
        (_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "relayMessage timeout"
                )
              ),
            RELAY_TIMEOUT_MS
          )
      ),
    ]);

  const payloadKB = () =>
    Buffer.byteLength(
      JSON.stringify(
        buildPayload(
          card
        )
      )
    ) / 1024;

  if (
    payloadKB() >
    PAYLOAD_KB
  ) {
    const rawNow =
      compressed.length;

    const target =
      Math.max(
        480 * 1024,

        Math.floor(
          rawNow *
            ((PAYLOAD_KB - 40) /
              payloadKB())
        )
      );

    const fitted =
      await compressAudio(
        audioRaw,
        target,
        secs,
        usedPreview,
        opusFull
          ? "opus"
          : "mp3"
      ).catch(
        () => null
      );

    if (
      fitted &&
      fitted.length <
        compressed.length
    ) {
      compressed =
        fitted;

      setAudio(
        compressed
      );
    }

    if (
      payloadKB() >
      PAYLOAD_KB
    ) {
      card.lrcLines =
        lrcLines.slice(
          0,
          80
        );

      if (
        payloadKB() >
        PAYLOAD_KB
      ) {
        card.lrcLines =
          lrcLines.slice(
            0,
            40
          );
      }
    }
  }

  try {
    await relay(
      buildPayload(card)
    );

    await m.react("✅").catch(
      () => {}
    );

    console.log(
      `[PREVIEW] "${title}" vía Delirius | embebido ${
        opusFull
          ? `opus COMPLETA (${Math.round(
              secs
            )}s)`
          : usedPreview
          ? `vista previa ${usedPreview}s`
          : "mp3 completo"
      } | payload ${payloadKB().toFixed(
        0
      )}KB | letra ${
        lrcLines.length
          ? "sincronizada"
          : lyrics.plain
          ? "simple"
          : "no encontrada"
      }`
    );
  } catch (error) {
    console.error(
      "[PREW] envío de la tarjeta falló:",
      error?.message ||
        error
    );

    await m.react("❌").catch(
      () => {}
    );

    return m.reply(
      "✦ No pude enviar el reproductor."
    );
  }
}

export default {
  command: [
    "ytmp3",
    "mp3",
    "musica",
    "youtube",
  ],

  run,
};
