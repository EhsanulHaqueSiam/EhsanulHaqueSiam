// Renders every SVG card on the profile. Run daily by .github/workflows/profile.yml.
// No dependencies: Node 22 fetch + templates. Pure SVG with SMIL (one-shot entrances) and CSS
// keyframes (continuous loops, which honour prefers-reduced-motion). GitHub's image proxy serves
// them with no third-party service in the path.
import { writeFileSync, readFileSync } from "node:fs";

const LOGIN = "EhsanulHaqueSiam";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const HOBBY = /^(nuvio-|bd-live-tv|homebrew-tap|macarchy|gradcode-releases|Portfolio_|pretext-demo|Antigravity|EhsanulHaqueSiam$)/;
const C = { cyan: "#22d3ee", violet: "#a78bfa", pink: "#f472b6", mint: "#34d399", amber: "#fbbf24" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let uid = 0; const id = (p) => `${p}${(uid++).toString(36)}`;

// Shared defs: glow filter, grain, gradients, and the CSS loops with a reduced-motion switch
const DEFS = `<defs>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0"/></filter>
</defs>
<style>
@keyframes drift1{0%{transform:translate(0,0)}50%{transform:translate(90px,40px)}100%{transform:translate(0,0)}}
@keyframes drift2{0%{transform:translate(0,0)}50%{transform:translate(-70px,-30px)}100%{transform:translate(0,0)}}
@keyframes drift3{0%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-50px) scale(1.15)}100%{transform:translate(0,0) scale(1)}}
@keyframes pulse{0%,100%{opacity:.35;r:4}50%{opacity:1;r:6}}
@keyframes rise{0%{transform:translateY(0);opacity:0}10%{opacity:.8}100%{transform:translateY(-140px);opacity:0}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes breathe{0%,100%{opacity:.5}50%{opacity:1}}
.d1{animation:drift1 14s ease-in-out infinite}.d2{animation:drift2 18s ease-in-out infinite}.d3{animation:drift3 22s ease-in-out infinite}
.pulse{animation:pulse 2.4s ease-in-out infinite}.rise{animation:rise 9s linear infinite}.marquee{animation:marquee 28s linear infinite}
.spin{animation:spin 30s linear infinite;transform-origin:center;transform-box:fill-box}.blink{animation:blink 1s step-end infinite}.breathe{animation:breathe 3s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;

const svg = (w, h, body, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}" ${extra}>${DEFS}${body}</svg>`;
const card = (w, h, body) => svg(w, h, `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="14" fill="#000" stroke="#27272a"/>${body}`);
const title = (t, x = 24, y = 36) => `<text x="${x}" y="${y}" fill="#fff" font-size="16" font-weight="700" letter-spacing="-0.2">${t}</text>`;
const label = (t, x, y, c = "#a1a1aa", a = "start") => `<text x="${x}" y="${y}" fill="${c}" font-size="12" letter-spacing="0.8" text-anchor="${a}">${t}</text>`;
const fadeIn = (begin, dur = 0.8) => `<animate attributeName="opacity" from="0" to="1" begin="${begin.toFixed(2)}s" dur="${dur}s" fill="freeze"/>`;
const EASE = `calcMode="spline" keySplines="0.16 1 0.3 1"`;
// Entrance that overshoots slightly before settling, like a spring
const spring = (begin, from = 24) => `<animateTransform attributeName="transform" type="translate" values="0 ${from};0 -4;0 0" keyTimes="0;0.7;1" begin="${begin.toFixed(2)}s" dur="1s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.3 1;0.3 0 0.4 1"/>`;

// Odometer: each digit is a column of 0-9 that slides to its final value, staggered per digit
function odometer(value, x, y, size, color = "#fff", delay = 0.2) {
  const str = String(value); const w = size * 0.62; const lh = size * 1.1; let out = "", cx = x;
  str.split("").forEach((ch, i) => {
    if (!/\d/.test(ch)) { out += `<text x="${cx}" y="${y}" fill="${color}" font-size="${size}" font-weight="700">${esc(ch)}</text>`; cx += w * (ch === "." || ch === "," ? 0.42 : ch === "+" ? 0.95 : 1.1); return; }
    const d = +ch, cid = id("od");
    out += `<clipPath id="${cid}"><rect x="${cx - 2}" y="${y - size}" width="${w + 4}" height="${lh}"/></clipPath><g clip-path="url(#${cid})"><g>
<animateTransform attributeName="transform" type="translate" from="0 ${lh * 3}" to="0 ${-d * lh}" begin="${(delay + i * 0.12).toFixed(2)}s" dur="1.4s" fill="freeze" ${EASE}/>
${Array.from({ length: 10 }, (_, k) => `<text x="${cx}" y="${y + k * lh}" fill="${color}" font-size="${size}" font-weight="700">${k}</text>`).join("")}</g></g>`;
    cx += w;
  });
  return out;
}
// Kinetic text: one line, letters fade in one by one while the whole line springs up from blur
function kinetic(text, x, y, size, color, begin = 0, gap = 0.045, weight = 700) {
  const fid = id("kb");
  const letters = [...text].map((ch, i) => `<tspan fill-opacity="0">${ch === " " ? " " : esc(ch)}<animate attributeName="fill-opacity" from="0" to="1" begin="${(begin + i * gap).toFixed(2)}s" dur="0.6s" fill="freeze"/></tspan>`).join("");
  return `<filter id="${fid}" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="10"><animate attributeName="stdDeviation" from="10" to="0" begin="${begin.toFixed(2)}s" dur="1.1s" fill="freeze"/></feGaussianBlur></filter>
<g filter="url(#${fid})"><text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" letter-spacing="-1.5" xml:space="preserve">${letters}</text>${spring(begin, 30)}</g>`;
}

// Neural pipeline figure: research → production, with packets travelling along the edges
function pipeline(ox, oy) {
  const layers = [[0, 1, 2, 3], [0, 1, 2], [0, 1]]; const X = [0, 120, 240]; const Y = (l, i) => (i - (layers[l].length - 1) / 2) * 42;
  let edges = "", packets = "", nodes = "", k = 0;
  layers.slice(0, -1).forEach((L, l) => L.forEach((i) => layers[l + 1].forEach((j) => {
    const x1 = X[l], y1 = Y(l, i), x2 = X[l + 1], y2 = Y(l + 1, j); const d = `M${x1} ${y1} C${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}`;
    edges += `<path d="${d}" fill="none" stroke="#27272a" stroke-width="1.2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" begin="${(0.6 + l * 0.4).toFixed(2)}s" dur="1s" fill="freeze"/></path>`;
    packets += `<circle r="2.5" fill="${[C.cyan, C.violet][l]}" filter="url(#glow)" opacity="0"><animateMotion dur="${(2.2 + (k % 5) * 0.35).toFixed(2)}s" begin="${(1.8 + (k % 7) * 0.5).toFixed(2)}s" repeatCount="indefinite" path="${d}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="${(2.2 + (k % 5) * 0.35).toFixed(2)}s" begin="${(1.8 + (k % 7) * 0.5).toFixed(2)}s" repeatCount="indefinite"/></circle>`; k++; })));
  layers.forEach((L, l) => L.forEach((i) => { nodes += `<g opacity="0"><circle cx="${X[l]}" cy="${Y(l, i)}" r="9" fill="#000" stroke="${[C.cyan, C.violet, C.pink][l]}" stroke-width="1.5"/><circle class="pulse" cx="${X[l]}" cy="${Y(l, i)}" r="4" fill="${[C.cyan, C.violet, C.pink][l]}" style="animation-delay:${((l * 4 + i) * 0.3).toFixed(1)}s"/>${fadeIn(0.5 + l * 0.4 + i * 0.08)}</g>`; }));
  const caps = ["research", "models", "production"].map((t, l) => `<text x="${X[l]}" y="96" fill="#71717a" font-size="11" letter-spacing="1.5" text-anchor="middle" opacity="0">${t.toUpperCase()}${fadeIn(1.2 + l * 0.3)}</text>`).join("");
  return `<g transform="translate(${ox} ${oy})">${edges}${nodes}${packets}${caps}</g>`;
}

// 1. Header: aurora blobs under grain, kinetic name, pipeline figure, rising particles
{
  const particles = Array.from({ length: 18 }, (_, i) => `<circle class="rise" cx="${60 + i * 64}" cy="320" r="${1 + (i % 3)}" fill="${[C.cyan, C.violet, C.pink, "#fff"][i % 4]}" style="animation-delay:${(-i * 0.7).toFixed(1)}s;animation-duration:${(8 + (i % 4) * 2)}s"/>`).join("");
  writeFileSync("assets/header.svg", svg(1200, 320, `
<clipPath id="hdr"><rect width="1200" height="320" rx="16"/></clipPath>
<g clip-path="url(#hdr)">
  <rect width="1200" height="320" fill="#000"/>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#fff" stroke-opacity="0.045"/></pattern>
  <rect width="1200" height="320" fill="url(#grid)"/>
  <rect width="1200" height="320" filter="url(#grain)" opacity="0.5"/>
  ${particles}
  ${kinetic("Ehsanul Haque Siam", 64, 128, 60, "#fff", 0.1)}
  <g opacity="0"><text x="66" y="172" fill="#d4d4d8" font-size="22" font-weight="500">AI Engineer · Full-Stack Developer · Published Researcher</text>${fadeIn(0.7)}${spring(0.7, 16)}</g>
  <g opacity="0"><text x="66" y="212" fill="#8b8b93" font-size="16">Software Engineer @ Ledgercross  ·  Lead Researcher (NLP &amp; LLMs) @ Arché Intelligence Lab</text>${fadeIn(1.0)}${spring(1.0, 12)}</g>
  <rect x="66" y="236" width="0" height="3" rx="1.5" fill="#27272a"><animate attributeName="width" from="0" to="560" begin="0.9s" dur="1.4s" fill="freeze" ${EASE}/></rect>
  <rect x="66" y="236" width="90" height="3" rx="1.5" fill="#fff" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="2.2s" dur="0.4s" fill="freeze"/><animate attributeName="x" values="66;536;66" dur="5s" begin="2.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/></rect>
  <g opacity="0"><text x="66" y="282" fill="#71717a" font-size="13" font-family="${MONO}">$ research --to production <tspan class="blink" fill="${C.cyan}">▍</tspan></text>${fadeIn(1.6)}</g>
  ${pipeline(850, 150)}
  <rect x="0.5" y="0.5" width="1199" height="319" rx="16" fill="none" stroke="#27272a"/>
</g>`));
}

// 2. Hero numbers: the four proof points from hq as odometers with glow dividers
{
  const stats = [["50K+", "USERS SERVED"], ["1.5x", "CLIENT REVENUE GROWTH"], ["3", "PAPERS &amp; TALKS"], ["8+", "PRODUCTION APPS"]];
  const cells = stats.map(([n, l], i) => { const cx = i * 300 + 150; const w = [...n].reduce((a, ch) => a + (/\d/.test(ch) ? 24.8 : ch === "." ? 11 : ch === "+" ? 23.5 : 27), 0);
    return `<g opacity="0">${odometer(n, cx - w / 2, 62, 40, "#fff", 0.2 + i * 0.15)}${label(l, cx, 92, "#a1a1aa", "middle")}${fadeIn(0.2 + i * 0.15)}${spring(0.2 + i * 0.15, 14)}</g>`; }).join("");
  const divs = [1, 2, 3].map((i) => `<line x1="${i * 300}" y1="26" x2="${i * 300}" y2="98" stroke="#27272a"/><line class="breathe" x1="${i * 300}" y1="40" x2="${i * 300}" y2="84" stroke="#fff" stroke-opacity="0.5" style="animation-delay:${i}s"/>`).join("");
  writeFileSync("assets/hero-stats.svg", card(1200, 124, divs + cells));
}

// 3. Strength cards: animated gradient border, icon motion, lines wipe in
{
  const cards = [
    { t: "LLM systems in production", c: C.cyan, lines: ["RAG on Vertex AI (Document AI + Gemini)", "Gemini 2.5 fine-tuning, LLM eval pipelines", "MCP servers, serverless GCP, Terraform"], proof: "DocMind · FlowCV MCP · Polashi · Veritas KYC",
      icon: `<g transform="translate(340 44)"><circle r="16" fill="none" stroke="${C.cyan}" stroke-opacity="0.4"/><circle class="spin" r="16" fill="none" stroke="${C.cyan}" stroke-dasharray="20 80" stroke-linecap="round"/><circle class="pulse" r="4" fill="${C.cyan}"/></g>` },
    { t: "Full-stack product", c: C.violet, lines: ["React 19, TanStack Start, Convex, Expo", "Flutter, Fastify, FastAPI, PostgreSQL, Go, Rust", "Design to CI/CD to cloud, end to end"], proof: "InvoicePilot · Eventarc · 4 BetaScript sites",
      icon: `<g transform="translate(324 30)">${[0, 1, 2].map((k) => `<rect x="0" y="${k * 10}" width="32" height="6" rx="2" fill="${C.violet}" fill-opacity="${0.35 + k * 0.3}"><animate attributeName="x" values="0;${k % 2 ? -4 : 4};0" dur="${3 + k}s" repeatCount="indefinite"/></rect>`).join("")}</g>` },
    { t: "Research", c: C.pink, lines: ["NLP and LLMs: topic modeling, medical BERTs", "Bengali NLP toward publication", "IEEE Xplore (Scopus), Taylor &amp; Francis"], proof: "2 papers · 1 conference talk",
      icon: `<g transform="translate(322 28)"><rect width="36" height="40" rx="4" fill="none" stroke="${C.pink}" stroke-opacity="0.6"/>${[0, 1, 2, 3].map((k) => `<rect x="7" y="${9 + k * 8}" width="0" height="2.5" rx="1" fill="${C.pink}"><animate attributeName="width" values="0;${k === 3 ? 12 : 22};${k === 3 ? 12 : 22};0" keyTimes="0;0.3;0.8;1" begin="${k * 0.25}s" dur="4s" repeatCount="indefinite"/></rect>`).join("")}</g>` },
  ];
  const body = cards.map((k, i) => { const x = i * 400, gid = id("gb"); const lines = k.lines.map((l, j) => { const cid = id("wp");
      return `<clipPath id="${cid}"><rect x="24" y="${70 + j * 24}" width="0" height="24"><animate attributeName="width" from="0" to="360" begin="${(0.7 + i * 0.25 + j * 0.18).toFixed(2)}s" dur="0.8s" fill="freeze" ${EASE}/></rect></clipPath><text clip-path="url(#${cid})" x="24" y="${86 + j * 24}" fill="#d4d4d8" font-size="14">${l}</text>`; }).join("");
    return `<g opacity="0" transform="translate(${x} 0)">
  <rect x="8" y="8" width="384" height="204" rx="14" fill="#000" stroke="#27272a"/>
  <rect x="8" y="8" width="384" height="204" rx="14" fill="none" stroke="${k.c}" stroke-opacity="0.35"/>
  <rect x="8" y="8" width="384" height="204" rx="14" fill="none" stroke="${k.c}" stroke-width="1.5" pathLength="100" stroke-dasharray="14 86" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="0" to="-100" dur="6s" begin="${i * 2}s" repeatCount="indefinite"/></rect>
  <rect x="24" y="30" width="36" height="4" rx="2" fill="${k.c}"><animate attributeName="width" values="36;72;36" dur="4s" begin="${i * 0.6}s" repeatCount="indefinite"/></rect>
  <text x="24" y="60" fill="#fff" font-size="19" font-weight="700" letter-spacing="-0.3">${k.t}</text>
  ${k.icon}${lines}
  <text x="24" y="190" fill="${k.c}" font-size="12.5" font-weight="600" opacity="0">${k.proof}${fadeIn(1.5 + i * 0.25)}</text>
  ${fadeIn(0.15 + i * 0.25)}<animateTransform attributeName="transform" type="translate" values="${x} 28;${x} -5;${x} 0" keyTimes="0;0.7;1" begin="${(0.15 + i * 0.25).toFixed(2)}s" dur="1s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.3 1;0.3 0 0.4 1"/>
</g>`; }).join("");
  writeFileSync("assets/strengths.svg", svg(1200, 220, body));
}

// 4. Marquee: the stack scrolling forever, two copies for a seamless loop
{
  const items = ["TypeScript", "React 19", "TanStack Start", "Convex", "Expo", "React Native", "Flutter", "Tailwind", "Fastify", "FastAPI", "PostgreSQL", "Drizzle", "Go", "Rust", "Java", "Python", "Gemini", "Vertex AI", "RAG", "LangChain", "LlamaIndex", "Qdrant", "Pinecone", "MCP", "PyTorch", "scikit-learn", "BERT", "Cloud Run", "Terraform", "Docker", "GitHub Actions", "Solidity"];
  let x = 0; const one = items.map((t, i) => { const w = t.length * 9.5 + 44; const g = `<g transform="translate(${x} 0)"><rect x="0" y="8" width="${w - 12}" height="30" rx="15" fill="#0a0a0a" stroke="#27272a"/><circle cx="16" cy="23" r="3" fill="${Object.values(C)[i % 5]}"/><text x="28" y="28" fill="#e4e4e7" font-size="13" font-family="${MONO}">${esc(t)}</text></g>`; x += w; return g; }).join("");
  const W = x;
  writeFileSync("assets/marquee.svg", svg(1200, 46, `<clipPath id="mq"><rect width="1200" height="46"/></clipPath><g clip-path="url(#mq)"><g class="marquee" style="animation-duration:${(W / 60).toFixed(0)}s">${one}<g transform="translate(${W} 0)">${one}</g></g></g>`));
}

// ---- Live data ----
const since = new Date(Date.now() - 365 * 864e5).toISOString();
const query = `query($login:String!,$since:DateTime!){ user(login:$login){
  followers{totalCount} pullRequests{totalCount}
  repositories(first:100, ownerAffiliations:OWNER, privacy:PUBLIC, isFork:false, orderBy:{field:PUSHED_AT,direction:DESC}){
    nodes{ name url stargazerCount pushedAt isArchived languages(first:6, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{name color} } } } }
  contributionsCollection(from:$since){ totalCommitContributions restrictedContributionsCount
    contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } } } } }`;
const res = await fetch("https://api.github.com/graphql", { method: "POST", headers: { authorization: `bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ query, variables: { login: LOGIN, since } }) });
const { data, errors } = await res.json();
if (errors) throw new Error(JSON.stringify(errors));
const u = data.user, cc = u.contributionsCollection;
const repos = u.repositories.nodes.filter((r) => !r.isArchived);
const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const stars = repos.reduce((n, r) => n + r.stargazerCount, 0);
const commits = cc.totalCommitContributions + cc.restrictedContributionsCount;
let current = 0, longest = 0, run = 0;
for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
for (let i = days.length - 1; i >= 0; i--) { if (days[i].contributionCount) current++; else if (i !== days.length - 1) break; }

// 5. Stats card: glowing ring of this year's contributions plus odometer counters
{
  const total = cc.contributionCalendar.totalContributions, r = 62, c = 2 * Math.PI * r;
  const stats = [["stars", stars], ["commits, 12 mo", commits], ["pull requests", u.pullRequests.totalCount], ["followers", u.followers.totalCount]];
  const grid = stats.map(([l, v], i) => { const x = 240 + (i % 2) * 170, y = 92 + Math.floor(i / 2) * 84;
    return `<g opacity="0">${odometer(v.toLocaleString("en-US"), x, y, 34, "#fff", 0.3 + i * 0.1)}${label(l.toUpperCase(), x, y + 22)}${fadeIn(0.1 + i * 0.15)}${spring(0.1 + i * 0.15, 16)}</g>`; }).join("");
  const orbit = [0, 1, 2].map((i) => `<circle r="2.5" fill="${[C.cyan, C.violet, C.pink][i]}" filter="url(#glow)"><animateMotion dur="${6 + i * 2}s" repeatCount="indefinite" path="M${r + 11},0 a${r + 11},${r + 11} 0 1,1 -${(r + 11) * 2},0 a${r + 11},${r + 11} 0 1,1 ${(r + 11) * 2},0"/></circle>`).join("");
  writeFileSync("assets/stats.svg", card(590, 260, `${title("GitHub, last 12 months")}
<g transform="translate(120 148)">
  <circle r="${r}" fill="none" stroke="#1f1f23" stroke-width="10"/>
  <circle r="${r}" fill="none" stroke="${C.cyan}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90)" filter="url(#glow)">
    <animate attributeName="stroke-dashoffset" from="${c}" to="${c * 0.08}" begin="0.2s" dur="1.8s" fill="freeze" ${EASE}/></circle>
  <circle r="${r + 11}" fill="none" stroke="#27272a" stroke-dasharray="2 6"/>${orbit}
  ${odometer(total.toLocaleString("en-US"), -([...total.toLocaleString("en-US")].reduce((a, ch) => a + (/\d/.test(ch) ? 18.6 : 7.8), 0) / 2), 10, 30, "#fff", 0.4)}
  <text x="0" y="34" fill="#a1a1aa" font-size="9.5" letter-spacing="0.6" text-anchor="middle">CONTRIBUTIONS</text>
</g>
${grid}
<g opacity="0">${label(`STREAK ${current} DAYS · LONGEST ${longest} · ${repos.length} PUBLIC REPOS`, 240, 236, "#71717a")}${fadeIn(0.9)}</g>`));
}

// 6. Languages: stacked bar grows in, legend bars fill proportionally
{
  const bytes = new Map();
  for (const r of repos) for (const e of r.languages.edges) bytes.set(e.node.name, { size: (bytes.get(e.node.name)?.size || 0) + e.size, color: e.node.color || "#888" });
  const top = [...bytes.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 8);
  const sum = top.reduce((n, [, v]) => n + v.size, 0), max = top[0][1].size;
  let x = 24, bar = "", legend = "";
  top.forEach(([name, v], i) => {
    const w = (v.size / sum) * 542, pct = ((v.size / sum) * 100).toFixed(1);
    bar += `<rect x="${x.toFixed(1)}" y="56" width="0" height="14" fill="${v.color}"><animate attributeName="width" from="0" to="${w.toFixed(1)}" begin="${(0.1 + i * 0.1).toFixed(2)}s" dur="0.9s" fill="freeze" ${EASE}/></rect>`; x += w;
    const lx = 24 + (i % 2) * 280, ly = 112 + Math.floor(i / 2) * 34;
    legend += `<g opacity="0"><circle cx="${lx + 6}" cy="${ly - 4}" r="6" fill="${v.color}" filter="url(#glow)"/><text x="${lx + 20}" y="${ly}" fill="#fff" font-size="14" font-weight="600">${esc(name)}</text><text x="${lx + 250}" y="${ly}" fill="#a1a1aa" font-size="13" text-anchor="end">${pct}%</text>
<rect x="${lx + 20}" y="${ly + 8}" width="230" height="2" fill="#1f1f23"/><rect x="${lx + 20}" y="${ly + 8}" width="0" height="2" fill="${v.color}"><animate attributeName="width" from="0" to="${((v.size / max) * 230).toFixed(1)}" begin="${(0.4 + i * 0.1).toFixed(2)}s" dur="0.9s" fill="freeze" ${EASE}/></rect>${fadeIn(0.2 + i * 0.1)}${spring(0.2 + i * 0.1, 10)}</g>`;
  });
  writeFileSync("assets/languages.svg", card(590, 260, `${title("Languages across public repos")}<clipPath id="bar"><rect x="24" y="56" width="542" height="14" rx="7"/></clipPath><g clip-path="url(#bar)"><rect x="24" y="56" width="542" height="14" fill="#1f1f23"/>${bar}</g>${legend}`));
}

// 7. Activity: last 90 days drawn on as a glowing area chart with a live dot at today
{
  const last = days.slice(-90), max = Math.max(1, ...last.map((d) => d.contributionCount));
  const W = 1200, H = 180, L = 24, R = 24, T = 48, B = 36, sx = (W - L - R) / (last.length - 1), sy = (H - T - B) / max;
  const pts = last.map((d, i) => [L + i * sx, H - B - d.contributionCount * sy]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${H - B} L${L} ${H - B} Z`;
  const total90 = last.reduce((n, d) => n + d.contributionCount, 0), peak = last.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a));
  const fmt = (s) => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const ticks = [0, 30, 60, 89].map((i) => `<text x="${pts[i][0].toFixed(1)}" y="${H - 12}" fill="#52525b" font-size="11" text-anchor="${i === 0 ? "start" : i === 89 ? "end" : "middle"}">${fmt(last[i].date)}</text>`).join("");
  const [ex, ey] = pts.at(-1);
  writeFileSync("assets/activity.svg", card(W, H, `${title("Contributions, last 90 days")}
<text x="${W - 24}" y="36" fill="#a1a1aa" font-size="13" text-anchor="end">${total90.toLocaleString("en-US")} total · peak ${peak.contributionCount} on ${fmt(peak.date)}</text>
${[0.25, 0.5, 0.75].map((f) => `<line x1="${L}" x2="${W - R}" y1="${(H - B - (H - T - B) * f).toFixed(1)}" y2="${(H - B - (H - T - B) * f).toFixed(1)}" stroke="#18181b"/>`).join("")}
<path d="${area}" fill="${C.cyan}" fill-opacity="0.12" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="1.2s" dur="0.8s" fill="freeze"/></path>
<path d="${line}" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" filter="url(#glow)"><animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.1s" dur="2s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1"/></path>
<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="${C.violet}" filter="url(#glow)" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="2s" dur="0.4s" fill="freeze"/></circle>
<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="none" stroke="${C.violet}" opacity="0"><animate attributeName="opacity" values="0;0.7;0" begin="2.4s" dur="2s" repeatCount="indefinite"/><animate attributeName="r" values="5;20" begin="2.4s" dur="2s" repeatCount="indefinite"/></circle>
${ticks}`));
}

// 8. Typing banner: lines type in and erase in a loop, pure SMIL
{
  const lines = ["Building AI systems that reach production", "Published in IEEE Xplore and Taylor & Francis", "Shipped apps serving 50,000+ users", "React 19 · Convex · Gemini on Vertex AI · MCP · Go · Rust"];
  const n = lines.length, T = n * 4.5, slot = 1 / n, cw = 12.05;
  const kt = (i) => { const s0 = i * slot, s1 = (i + 1) * slot; return [s0, s0 + slot * 0.38, s1 - slot * 0.18, s1 - slot * 0.03, s1].map((v) => Math.min(1, v).toFixed(4)); };
  const body = lines.map((t, i) => { const w = t.length * cw, k = kt(i);
    return `<clipPath id="t${i}"><rect x="0" y="0" width="0" height="40"><animate attributeName="width" values="0;0;${w};${w};0;0" keyTimes="0;${k[0]};${k[1]};${k[2]};${k[3]};1" dur="${T}s" repeatCount="indefinite"/></rect></clipPath>
<g clip-path="url(#t${i})"><text x="0" y="28" fill="#fff" font-size="20" font-family="${MONO}">${esc(t)}</text></g>`; }).join("");
  const cur = lines.map((t, i) => { const w = t.length * cw; return `0 0;${w} 0;${w} 0;0 0;0 0`; }).join(";");
  const curT = lines.flatMap((_, i) => kt(i)).join(";");
  writeFileSync("assets/typing.svg", svg(760, 40, `<g transform="translate(16 0)">${body}<rect y="8" width="2" height="26" fill="${C.cyan}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="${cur}" keyTimes="${curT}" dur="${T}s" repeatCount="indefinite"/></rect></g>`));
}

// 9. "Building now" strip in the README: public repos pushed in the last 30 days, hobby repos excluded
{
  const cutoff = Date.now() - 30 * 864e5;
  const active = repos.filter((r) => !HOBBY.test(r.name) && new Date(r.pushedAt).getTime() > cutoff).slice(0, 6);
  const strip = active.map((r) => `[**${r.name}**](${r.url})`).join(" · ");
  const updated = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Dhaka" });
  writeFileSync("README.md", readFileSync("README.md", "utf8").replace(/<!-- ACTIVE-PROJECTS-START -->[\s\S]*?<!-- ACTIVE-PROJECTS-END -->/,
    `<!-- ACTIVE-PROJECTS-START -->\n<sub>🔄 Building now (pushed in the last 30 days): ${strip || "quiet month"} · <i>updated ${updated}</i></sub>\n<!-- ACTIVE-PROJECTS-END -->`));
}
console.log(`rendered: ${stars} stars, ${commits} commits, ${repos.length} repos, streak ${current}/${longest}`);
