// Renders every SVG card on the profile. Run daily by .github/workflows/profile.yml.
// No dependencies: Node 22 fetch + templates. Pure SVG with SMIL (one-shot entrances) and CSS
// keyframes (continuous loops, which honour prefers-reduced-motion). GitHub's image proxy serves
// them with no third-party service in the path.
import { writeFileSync, readFileSync } from "node:fs";
const img = (f) => `data:image/jpeg;base64,${readFileSync(`assets/img/${f}`).toString("base64")}`;

const LOGIN = "EhsanulHaqueSiam";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const HOBBY = /^(nuvio-|bd-live-tv|homebrew-tap|macarchy|gradcode-releases|Portfolio_|pretext-demo|Antigravity|claude-skills$|skills$|dev$|EhsanulHaqueSiam$)/;
const C = {}, T = {}, CHIP = {};
const THEMES = {
  light: { C: { cyan: "#6E8B4A", violet: "#D9A441", pink: "#D86C57", mint: "#5F86B4", amber: "#D9A441" },
    T: { bg: "#F3EDE3", card: "#FBF8F3", ink: "#1C1A17", body: "#4A443D", muted: "#7A7268", faint: "#A8A094", line: "#E4DCCE", soft: "#EFE8DC" },
    CHIP: { green: ["#DDE8CF", "#3F5A24"], amber: ["#F6E5B5", "#7A5A12"], coral: ["#F6D3CA", "#8A3524"], sky: ["#D7E3F0", "#2F4D73"] } },
  dark: { C: { cyan: "#9DBB76", violet: "#E6B964", pink: "#E88C78", mint: "#86A9D2", amber: "#E6B964" },
    T: { bg: "#1B1917", card: "#24211D", ink: "#F3EDE3", body: "#D4CCC0", muted: "#9A9185", faint: "#6E675E", line: "#36312B", soft: "#2E2A25" },
    CHIP: { green: ["#2F4420", "#CFE3BD"], amber: ["#4A3A12", "#F1D89A"], coral: ["#4A2219", "#F3C2B6"], sky: ["#1F3550", "#C9DBF0"] } },
};
let DIR = "assets";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let uid = 0; const id = (p) => `${p}${(uid++).toString(36)}`;

// Shared defs: glow filter, grain, gradients, and the CSS loops with a reduced-motion switch
let DEFS = ""; const makeDefs = () => `<defs>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${T.ink === "#1C1A17" ? 0.1 : 0.95} 0 0 0 0 ${T.ink === "#1C1A17" ? 0.08 : 0.93} 0 0 0 0 ${T.ink === "#1C1A17" ? 0.05 : 0.89} 0 0 0 0.05 0"/></filter>
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
const card = (w, h, body) => svg(w, h, `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="18" fill="${T.card}" stroke="${T.line}"/>${body}`);
const title = (t, x = 24, y = 36) => `<text x="${x}" y="${y}" fill="${T.ink}" font-size="18" font-weight="700" letter-spacing="-0.2">${t}</text>`;
const label = (t, x, y, c = T.muted, a = "start") => `<text x="${x}" y="${y}" fill="${c}" font-size="14" letter-spacing="0.8" text-anchor="${a}">${t}</text>`;
const fadeIn = (begin, dur = 0.8) => `<animate attributeName="opacity" from="0" to="1" begin="${begin.toFixed(2)}s" dur="${dur}s" fill="freeze"/>`;
const EASE = `calcMode="spline" keySplines="0.16 1 0.3 1"`;
// Entrance that overshoots slightly before settling, like a spring
const spring = (begin, from = 24) => `<animateTransform attributeName="transform" type="translate" values="0 ${from};0 -4;0 0" keyTimes="0;0.7;1" begin="${begin.toFixed(2)}s" dur="1s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.3 1;0.3 0 0.4 1"/>`;

// Odometer: each digit is a column of 0-9 that slides to its final value, staggered per digit
function odometer(value, x, y, size, color = T.ink, delay = 0.2) {
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
    edges += `<path d="${d}" fill="none" stroke="${T.line}" stroke-width="1.4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" begin="${(0.6 + l * 0.4).toFixed(2)}s" dur="1s" fill="freeze"/></path>`;
    packets += `<circle r="2.5" fill="${C.cyan}" filter="url(#glow)" opacity="0"><animateMotion dur="${(2.2 + (k % 5) * 0.35).toFixed(2)}s" begin="${(1.8 + (k % 7) * 0.5).toFixed(2)}s" repeatCount="indefinite" path="${d}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="${(2.2 + (k % 5) * 0.35).toFixed(2)}s" begin="${(1.8 + (k % 7) * 0.5).toFixed(2)}s" repeatCount="indefinite"/></circle>`; k++; })));
  layers.forEach((L, l) => L.forEach((i) => { nodes += `<g opacity="0"><circle cx="${X[l]}" cy="${Y(l, i)}" r="9" fill="${T.card}" stroke="${[C.cyan, C.violet, C.pink][l]}" stroke-width="1.5"/><circle class="pulse" cx="${X[l]}" cy="${Y(l, i)}" r="4" fill="${[C.cyan, C.violet, C.pink][l]}" style="animation-delay:${((l * 4 + i) * 0.3).toFixed(1)}s"/>${fadeIn(0.5 + l * 0.4 + i * 0.08)}</g>`; }));
  const caps = ["research", "models", "production"].map((t, l) => `<text x="${X[l]}" y="96" fill="${T.muted}" font-size="14" letter-spacing="1.5" text-anchor="middle" opacity="0">${t.toUpperCase()}${fadeIn(1.2 + l * 0.3)}</text>`).join("");
  return `<g transform="translate(${ox} ${oy})">${edges}${nodes}${packets}${caps}</g>`;
}

// ---- Live data ----
const since = new Date(Date.now() - 365 * 864e5).toISOString();
const query = `query($login:String!,$since:DateTime!){ user(login:$login){
  followers{totalCount} pullRequests{totalCount}
  repositories(first:100, ownerAffiliations:OWNER, privacy:PUBLIC, isFork:false, orderBy:{field:PUSHED_AT,direction:DESC}){
    nodes{ name url stargazerCount pushedAt isArchived primaryLanguage{name color} defaultBranchRef{ target{ ... on Commit{ history(first:3){ nodes{ message } } } } } languages(first:6, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{name color} } } } }
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


// Relative time, e.g. "2h ago", "3d ago"
const ago = (iso) => { const m = (Date.now() - new Date(iso)) / 6e4, d = m / 1440; return m < 60 ? `${Math.max(1, m | 0)}m ago` : m < 1440 ? `${(m / 60) | 0}h ago` : d < 45 ? `${d | 0}d ago` : d < 365 ? `${Math.round(d / 30)} mo ago` : `${Math.round(d / 365)} yr ago`; };
const recent = repos.filter((r) => !HOBBY.test(r.name) && r.defaultBranchRef && Date.now() - new Date(r.pushedAt) < 30 * 864e5).slice(0, 4);
const lastMsg = (r) => (r.defaultBranchRef.target.history.nodes.find((c) => !/^Merge /.test(c.message)) || r.defaultBranchRef.target.history.nodes[0]).message.split("\n")[0];
const status = `${recent[0] ? `pushing ${recent[0].name} ${ago(recent[0].pushedAt)}` : "quiet day"} · ${current}-day streak · ${commits.toLocaleString("en-US")} commits this year`;

// Render every card twice: cream for light GitHub, warm charcoal for dark GitHub
import { mkdirSync } from "node:fs";
for (const [name, theme] of Object.entries(THEMES)) {
  Object.assign(C, theme.C); Object.assign(T, theme.T); Object.assign(CHIP, theme.CHIP);
  DIR = name === "light" ? "assets" : "assets/dark"; mkdirSync(DIR, { recursive: true }); DEFS = makeDefs();
// 2. Hero numbers: the four proof points from hq as odometers with glow dividers
{
  const stats = [["50K+", "USERS SERVED"], ["1.5x", "CLIENT REVENUE GROWTH"], ["3", "PAPERS &amp; TALKS"], ["8+", "PRODUCTION APPS"]];
  const cells = stats.map(([n, l], i) => { const cx = i * 300 + 150; const w = [...n].reduce((a, ch) => a + (/\d/.test(ch) ? 24.8 : ch === "." ? 11 : ch === "+" ? 23.5 : 27), 0);
    return `<g opacity="0">${odometer(n, cx - w / 2, 62, 40, T.ink, 0.2 + i * 0.15)}${label(l, cx, 92, T.muted, "middle")}${fadeIn(0.2 + i * 0.15)}${spring(0.2 + i * 0.15, 14)}</g>`; }).join("");
  const divs = [1, 2, 3].map((i) => `<line x1="${i * 300}" y1="26" x2="${i * 300}" y2="98" stroke="${T.line}"/><line class="breathe" x1="${i * 300}" y1="40" x2="${i * 300}" y2="84" stroke="${[C.cyan, C.violet, C.pink][i - 1]}" stroke-opacity="0.7" style="animation-delay:${i}s"/>`).join("");
  writeFileSync(`${DIR}/hero-stats.svg`, card(1200, 124, divs + cells));
}

// 3. Strength cards: animated gradient border, icon motion, lines wipe in
{
  const cards = [
    { t: "LLM systems in production", c: C.cyan, lines: ["RAG on Vertex AI, Document AI + Gemini", "Gemini 2.5 fine-tuning, LLM evals", "MCP servers, serverless GCP, Terraform"], proof: "DocMind · FlowCV MCP · Polashi · Veritas KYC",
      icon: `<g transform="translate(340 44)"><circle r="16" fill="none" stroke="${C.cyan}" stroke-opacity="0.4"/><circle class="spin" r="16" fill="none" stroke="${C.cyan}" stroke-dasharray="20 80" stroke-linecap="round"/><circle class="pulse" r="4" fill="${C.cyan}"/></g>` },
    { t: "Full-stack product", c: C.violet, lines: ["React 19, TanStack Start, Convex, Expo", "Flutter, Fastify, FastAPI, Postgres", "Go and Rust services, CI/CD to cloud"], proof: "InvoicePilot · Eventarc · 4 BetaScript sites",
      icon: `<g transform="translate(324 30)">${[0, 1, 2].map((k) => `<rect x="0" y="${k * 10}" width="32" height="6" rx="2" fill="${C.violet}" fill-opacity="${0.35 + k * 0.3}"><animate attributeName="x" values="0;${k % 2 ? -4 : 4};0" dur="${3 + k}s" repeatCount="indefinite"/></rect>`).join("")}</g>` },
    { t: "Research", c: C.pink, lines: ["NLP and LLMs, topic modeling", "Medical BERTs, Bengali NLP", "IEEE Xplore (Scopus), Taylor &amp; Francis"], proof: "2 papers · 1 conference talk",
      icon: `<g transform="translate(322 28)"><rect width="36" height="40" rx="4" fill="none" stroke="${C.pink}" stroke-opacity="0.6"/>${[0, 1, 2, 3].map((k) => `<rect x="7" y="${9 + k * 8}" width="0" height="2.5" rx="1" fill="${C.pink}"><animate attributeName="width" values="0;${k === 3 ? 12 : 22};${k === 3 ? 12 : 22};0" keyTimes="0;0.3;0.8;1" begin="${k * 0.25}s" dur="4s" repeatCount="indefinite"/></rect>`).join("")}</g>` },
  ];
  const body = cards.map((k, i) => { const x = i * 400, gid = id("gb"); const lines = k.lines.map((l, j) => { const cid = id("wp");
      return `<clipPath id="${cid}"><rect x="24" y="${96 + j * 26}" width="0" height="26"><animate attributeName="width" from="0" to="360" begin="${(0.7 + i * 0.25 + j * 0.18).toFixed(2)}s" dur="0.8s" fill="freeze" ${EASE}/></rect></clipPath><text clip-path="url(#${cid})" x="24" y="${114 + j * 26}" fill="${T.body}" font-size="18">${l}</text>`; }).join("");
    return `<g opacity="0" transform="translate(${x} 0)">
  <rect x="8" y="8" width="384" height="220" rx="18" fill="${T.card}" stroke="${T.line}"/>
  <rect x="8" y="8" width="384" height="220" rx="18" fill="none" stroke="${k.c}" stroke-opacity="0.25"/>
  <rect x="8" y="8" width="384" height="220" rx="18" fill="none" stroke="${k.c}" stroke-width="1.5" pathLength="100" stroke-dasharray="14 86" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="0" to="-100" dur="6s" begin="${i * 2}s" repeatCount="indefinite"/></rect>
  <rect x="24" y="24" width="${24 + k.t.length * 0}" height="0"/><rect x="24" y="26" width="34" height="18" rx="9" fill="${k.c}" fill-opacity="0.18"/><text x="41" y="39" fill="${k.c}" font-size="14" font-weight="700" text-anchor="middle">0${i + 1}</text>
  <text x="24" y="70" fill="${T.ink}" font-size="21" font-weight="700" letter-spacing="-0.3">${k.t}</text>
  <clipPath id="sp${i}"><rect x="306" y="22" width="72" height="72" rx="14"/></clipPath><image clip-path="url(#sp${i})" href="${img(`spot${i + 1}.jpg`)}" x="306" y="22" width="72" height="72" preserveAspectRatio="xMidYMid slice" opacity="0">${fadeIn(0.5 + i * 0.25)}</image>${lines}
  <text x="24" y="208" fill="${k.c}" font-size="16" font-weight="600" opacity="0">${k.proof}${fadeIn(1.5 + i * 0.25)}</text>
  ${fadeIn(0.15 + i * 0.25)}<animateTransform attributeName="transform" type="translate" values="${x} 28;${x} -5;${x} 0" keyTimes="0;0.7;1" begin="${(0.15 + i * 0.25).toFixed(2)}s" dur="1s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.3 1;0.3 0 0.4 1"/>
</g>`; }).join("");
  writeFileSync(`${DIR}/strengths.svg`, svg(1200, 236, body));
}

// 4. Marquee: the stack scrolling forever, two copies for a seamless loop
{
  const items = ["TypeScript", "React 19", "TanStack Start", "Convex", "Expo", "React Native", "Flutter", "Tailwind", "Fastify", "FastAPI", "PostgreSQL", "Drizzle", "Go", "Rust", "Java", "Python", "Gemini", "Vertex AI", "RAG", "LangChain", "LlamaIndex", "Qdrant", "Pinecone", "MCP", "PyTorch", "scikit-learn", "BERT", "Cloud Run", "Terraform", "Docker", "GitHub Actions", "Solidity"];
  let x = 0; const one = items.map((t, i) => { const w = t.length * 10.5 + 48; const g = `<g transform="translate(${x} 0)"><rect x="0" y="8" width="${w - 12}" height="30" rx="15" fill="${T.card}" stroke="${T.line}"/><circle cx="16" cy="23" r="3" fill="${i % 2 ? C.cyan : "#e4e4e7"}"/><text x="28" y="28" fill="${T.body}" font-size="16" font-family="${MONO}">${esc(t)}</text></g>`; x += w; return g; }).join("");
  const W = x;
  writeFileSync(`${DIR}/marquee.svg`, svg(1200, 46, `<clipPath id="mq"><rect width="1200" height="46"/></clipPath><g clip-path="url(#mq)"><g class="marquee" style="animation-duration:${(W / 60).toFixed(0)}s">${one}<g transform="translate(${W} 0)">${one}</g></g></g>`));
}

// 1. Header: the painted studio with a scalloped edge, then name, roles and the live status line
{
  const scallops = Array.from({ length: 30 }, (_, i) => `a20,20 0 0,1 40,0`).join(" ");
  const wave = `M0 0 H1200 V400 ${scallops.replace(/a20,20 0 0,1 40,0/g, "a20,14 0 0,0 -40,0").replace("M0 0", "")} Z`;
  writeFileSync(`${DIR}/header.svg`, svg(1200, 690, `
<clipPath id="hdr"><rect width="1200" height="690" rx="18"/></clipPath>
<clipPath id="pic"><path d="M0 0 H1200 V404 ${Array.from({ length: 30 }, () => "a20,14 0 0,0 -40,0").join(" ")} Z"/></clipPath>
<g clip-path="url(#hdr)">
  <rect width="1200" height="690" fill="${T.bg}"/>
  <g clip-path="url(#pic)" opacity="0"><image href="${img("hero.jpg")}" x="0" y="-40" width="1200" height="510" preserveAspectRatio="xMidYMid slice"/>${fadeIn(0.05, 1.2)}</g>
  <rect width="1200" height="404" filter="url(#grain)" opacity="0.35" clip-path="url(#pic)"/>
  ${kinetic("Ehsanul Haque Siam", 64, 500, 60, T.ink, 0.5)}
  <g opacity="0"><text x="66" y="544" fill="${T.body}" font-size="25" font-weight="500">AI Engineer · Full-Stack Developer · Published Researcher</text>${fadeIn(1.0)}${spring(1.0, 16)}</g>
  <g opacity="0"><text x="66" y="580" fill="${T.muted}" font-size="18">Software Engineer @ Ledgercross  ·  Lead Researcher (NLP &amp; LLMs) @ Arché Intelligence Lab  ·  Dhaka</text>${fadeIn(1.2)}${spring(1.2, 12)}</g>
  <g opacity="0"><text x="66" y="616" fill="${T.body}" font-size="18">I turn papers into products that people use. Dhaka, UTC+6, usually online.</text>${fadeIn(1.5)}</g>
  <g opacity="0"><text x="66" y="650" fill="${T.muted}" font-size="16" font-family="${MONO}">$ status <tspan fill="${T.ink}">${esc(status)}</tspan> <tspan class="blink" fill="${C.cyan}">▍</tspan></text>${fadeIn(1.8)}</g>
  <g transform="translate(828 634)" opacity="0">${["research", "models", "production"].map((t, i) => `<rect x="${i * 122}" y="0" width="110" height="28" rx="14" fill="${[C.cyan, C.violet, C.pink][i]}" fill-opacity="0.16"/><text x="${i * 122 + 55}" y="19" fill="${[C.cyan, C.violet, C.pink][i]}" font-size="14" font-weight="700" letter-spacing="1" text-anchor="middle">${t.toUpperCase()}</text>${i < 2 ? `<circle r="2.5" fill="${[C.cyan, C.violet][i]}"><animateMotion dur="2.4s" begin="${i * 1.2}s" repeatCount="indefinite" path="M${i * 122 + 110} 14 L${i * 122 + 122} 14"/></circle>` : ""}`).join("")}${fadeIn(2.0)}</g>
  <rect x="0.5" y="0.5" width="1199" height="689" rx="18" fill="none" stroke="${T.line}"/>
</g>`));
}

// 1b. Right now: the four most recently pushed public repos with their last commit, live
{
  const rows = recent.map((r, i) => { const y = 68 + i * 54; const msg = lastMsg(r);
    return `<g opacity="0">
  <circle cx="34" cy="${y}" r="5" fill="${r.primaryLanguage?.color || "#71717a"}"/>
  <text x="50" y="${y + 5}" fill="${T.ink}" font-size="19" font-weight="700">${esc(r.name)}</text>
  <text x="${50 + r.name.length * 11 + 12}" y="${y + 5}" fill="${T.muted}" font-size="15">${esc(r.primaryLanguage?.name || "")}</text>
  <text x="50" y="${y + 26}" fill="${T.muted}" font-size="16" font-family="${MONO}">${esc(msg.length > 88 ? msg.slice(0, 85) + "..." : msg)}</text>
  ${(() => { const d = (Date.now() - new Date(r.pushedAt)) / 864e5; const [bg, fg] = d < 1 ? CHIP.green : d < 7 ? CHIP.amber : CHIP.coral; const t = ago(r.pushedAt); const w = t.length * 7.2 + 20; return `<rect x="${1164 - w}" y="${y - 9}" width="${w}" height="20" rx="10" fill="${bg}"/><text x="${1164 - w / 2}" y="${y + 5}" fill="${fg}" font-size="14" font-weight="600" text-anchor="middle">${t}</text>`; })()}
  ${fadeIn(0.2 + i * 0.15)}${spring(0.2 + i * 0.15, 14)}</g>`; }).join("");
  const live = `<g transform="translate(1152 32)"><circle r="4" fill="${C.cyan}"/><circle r="4" fill="none" stroke="${C.cyan}"><animate attributeName="r" values="4;12" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite"/></circle></g>`;
  writeFileSync(`${DIR}/now.svg`, card(1200, 68 + recent.length * 54 + 14, `${title("Right now")}<text x="1140" y="36" fill="${T.muted}" font-size="15" text-anchor="end">LIVE · pushed in the last 30 days · rendered ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Dhaka" })}</text>${live}${rows}`));
}

// 5. Stats card: glowing ring of this year's contributions plus odometer counters
{
  const total = cc.contributionCalendar.totalContributions, r = 62, c = 2 * Math.PI * r;
  const stats = [["stars", stars], ["commits, 12 mo", commits], ["pull requests", u.pullRequests.totalCount], ["followers", u.followers.totalCount]];
  const grid = stats.map(([l, v], i) => { const x = 240 + (i % 2) * 170, y = 92 + Math.floor(i / 2) * 84;
    return `<g opacity="0">${odometer(v.toLocaleString("en-US"), x, y, 34, T.ink, 0.3 + i * 0.1)}${label(l.toUpperCase(), x, y + 22)}${fadeIn(0.1 + i * 0.15)}${spring(0.1 + i * 0.15, 16)}</g>`; }).join("");
  const orbit = [0, 1, 2].map((i) => `<circle r="2.5" fill="${[C.cyan, C.violet, C.pink][i]}" filter="url(#glow)"><animateMotion dur="${6 + i * 2}s" repeatCount="indefinite" path="M${r + 11},0 a${r + 11},${r + 11} 0 1,1 -${(r + 11) * 2},0 a${r + 11},${r + 11} 0 1,1 ${(r + 11) * 2},0"/></circle>`).join("");
  writeFileSync(`${DIR}/stats.svg`, card(590, 260, `${title("GitHub, last 12 months")}
<g transform="translate(120 148)">
  <circle r="${r}" fill="none" stroke="${T.soft}" stroke-width="10"/>
  <circle r="${r}" fill="none" stroke="${C.cyan}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90)" filter="url(#glow)">
    <animate attributeName="stroke-dashoffset" from="${c}" to="${c * 0.08}" begin="0.2s" dur="1.8s" fill="freeze" ${EASE}/></circle>
  <circle r="${r + 11}" fill="none" stroke="${T.line}" stroke-dasharray="2 6"/>${orbit}
  ${odometer(total.toLocaleString("en-US"), -([...total.toLocaleString("en-US")].reduce((a, ch) => a + (/\d/.test(ch) ? 18.6 : 7.8), 0) / 2), 10, 30, T.ink, 0.4)}
  <text x="0" y="34" fill="${T.muted}" font-size="12" letter-spacing="0.6" text-anchor="middle">CONTRIBUTIONS</text>
</g>
${grid}
<g opacity="0">${label(`STREAK ${current} DAYS · LONGEST ${longest} · ${repos.length} PUBLIC REPOS`, 240, 236, T.muted)}${fadeIn(0.9)}</g>`));
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
    legend += `<g opacity="0"><circle cx="${lx + 6}" cy="${ly - 4}" r="6" fill="${v.color}" filter="url(#glow)"/><text x="${lx + 20}" y="${ly}" fill="${T.ink}" font-size="18" font-weight="600">${esc(name)}</text><text x="${lx + 250}" y="${ly}" fill="${T.muted}" font-size="16" text-anchor="end">${pct}%</text>
<rect x="${lx + 20}" y="${ly + 8}" width="230" height="2" fill="${T.soft}"/><rect x="${lx + 20}" y="${ly + 8}" width="0" height="2" fill="${v.color}"><animate attributeName="width" from="0" to="${((v.size / max) * 230).toFixed(1)}" begin="${(0.4 + i * 0.1).toFixed(2)}s" dur="0.9s" fill="freeze" ${EASE}/></rect>${fadeIn(0.2 + i * 0.1)}${spring(0.2 + i * 0.1, 10)}</g>`;
  });
  writeFileSync(`${DIR}/languages.svg`, card(590, 260, `${title("Languages across public repos")}<clipPath id="bar"><rect x="24" y="56" width="542" height="14" rx="7"/></clipPath><g clip-path="url(#bar)"><rect x="24" y="56" width="542" height="14" fill="${T.soft}"/>${bar}</g>${legend}`));
}

// 7. Activity: last 90 days drawn on as a glowing area chart with a live dot at today
{
  const last = days.slice(-90), max = Math.max(1, ...last.map((d) => d.contributionCount));
  const W = 1200, H = 180, L = 24, R = 24, TOP = 48, B = 36, sx = (W - L - R) / (last.length - 1), sy = (H - TOP - B) / max;
  const pts = last.map((d, i) => [L + i * sx, H - B - d.contributionCount * sy]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)[0].toFixed(1)} ${H - B} L${L} ${H - B} Z`;
  const total90 = last.reduce((n, d) => n + d.contributionCount, 0), peak = last.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a));
  const fmt = (s) => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const ticks = [0, 30, 60, 89].map((i) => `<text x="${pts[i][0].toFixed(1)}" y="${H - 12}" fill="${T.faint}" font-size="14" text-anchor="${i === 0 ? "start" : i === 89 ? "end" : "middle"}">${fmt(last[i].date)}</text>`).join("");
  const [ex, ey] = pts.at(-1);
  writeFileSync(`${DIR}/activity.svg`, card(W, H, `${title("Contributions, last 90 days")}
<text x="${W - 24}" y="36" fill="${T.muted}" font-size="16" text-anchor="end">${total90.toLocaleString("en-US")} total · peak ${peak.contributionCount} on ${fmt(peak.date)}</text>
${[0.25, 0.5, 0.75].map((f) => `<line x1="${L}" x2="${W - R}" y1="${(H - B - (H - TOP - B) * f).toFixed(1)}" y2="${(H - B - (H - TOP - B) * f).toFixed(1)}" stroke="${T.soft}"/>`).join("")}
<path d="${area}" fill="${C.cyan}" fill-opacity="0.12" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="1.2s" dur="0.8s" fill="freeze"/></path>
<path d="${line}" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" filter="url(#glow)"><animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.1s" dur="2s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1"/></path>
<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="${C.pink}" filter="url(#glow)" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="2s" dur="0.4s" fill="freeze"/></circle>
<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="none" stroke="${C.pink}" opacity="0"><animate attributeName="opacity" values="0;0.7;0" begin="2.4s" dur="2s" repeatCount="indefinite"/><animate attributeName="r" values="5;20" begin="2.4s" dur="2s" repeatCount="indefinite"/></circle>
${ticks}`));
}


// 7b. Isometric calendar: 53 weeks x 7 days of contributions as bars, drawn from the same data
{
  const weeks = cc.contributionCalendar.weeks; const t = 16, cos = 0.9, sin = 0.32;
  const maxC = Math.max(1, ...days.map((d) => d.contributionCount)); const hOf = (c) => (c ? 5 + Math.sqrt(c / maxC) * 120 : 0);
  const shades = T.ink === "#1C1A17" ? ["#E6DFD2", "#CFDDBE", "#A7C285", "#6E8B4A", "#3F5A24"] : ["#2E2A25", "#3F5A24", "#5F7F3A", "#86A85A", "#B5D08F"];
  const level = (c) => (c === 0 ? 0 : c < 4 ? 1 : c < 10 ? 2 : c < 20 ? 3 : 4);
  const mix = (hex, to, k) => { const a = hex.match(/\w\w/g).map((v) => parseInt(v, 16)), b = to.match(/\w\w/g).map((v) => parseInt(v, 16)); return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
  const ox = 330, oy = 190; let bars = "";
  weeks.forEach((w, wi) => { let g = "";
    w.contributionDays.forEach((d, di) => { const c = d.contributionCount, h = hOf(c), top = shades[level(c)];
      const x = ox + (wi - di) * cos * t, y = oy + (wi + di) * sin * t;
      const p = (dx, dy) => `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;
      const topF = `${p(0, -h)} ${p(cos * t, -h - sin * t)} ${p(0, -h - t)} ${p(-cos * t, -h - sin * t)}`;
      if (!h) { g += `<polygon points="${topF}" fill="${T.soft}" stroke="${T.card}" stroke-width="0.6"/>`; return; }
      const left = `${p(-cos * t, -sin * t)} ${p(0, 0)} ${p(0, -h)} ${p(-cos * t, -h - sin * t)}`;
      const right = `${p(0, 0)} ${p(cos * t, -sin * t)} ${p(cos * t, -h - sin * t)} ${p(0, -h)}`;
      g += `<polygon points="${left}" fill="${mix(top, "#000000", 0.28)}"/><polygon points="${right}" fill="${mix(top, "#000000", 0.14)}"/><polygon points="${topF}" fill="${top}"/>`;
    });
    bars += `<g opacity="0">${g}<animate attributeName="opacity" from="0" to="1" begin="${(0.1 + wi * 0.03).toFixed(2)}s" dur="0.5s" fill="freeze"/><animateTransform attributeName="transform" type="translate" from="0 40" to="0 0" begin="${(0.1 + wi * 0.03).toFixed(2)}s" dur="0.7s" fill="freeze" ${EASE}/></g>`;
  });
  const months = []; weeks.forEach((w, wi) => { const d = new Date(w.contributionDays[0].date + "T00:00:00Z"); if (d.getUTCDate() <= 7) months.push([wi, d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })]); });
  const labels = months.map(([wi, m]) => `<text x="${(ox + (wi - 7.6) * cos * t).toFixed(1)}" y="${(oy + (wi + 7.6) * sin * t + 6).toFixed(1)}" fill="${T.faint}" font-size="12" letter-spacing="0.5" text-anchor="end">${m.toUpperCase()}</text>`).join("");
  const legend = shades.map((c, i) => `<rect x="${1040 + i * 20}" y="526" width="14" height="14" rx="3" fill="${i ? c : T.soft}"/>`).join("");
  const total = cc.contributionCalendar.totalContributions;
  writeFileSync(`${DIR}/calendar.svg`, card(1200, 560, `${title("Contributions, last 12 months")}
<text x="1176" y="36" fill="${T.muted}" font-size="15" text-anchor="end">${total.toLocaleString("en-US")} contributions · longest streak ${longest} days · ${stars} stars</text>
${bars}${labels}
<text x="1030" y="538" fill="${T.faint}" font-size="12" text-anchor="end">LESS</text>${legend}<text x="1148" y="538" fill="${T.faint}" font-size="12">MORE</text>`));
}


// Text wrapping by character budget (system fonts, so an estimate is all we can do)
const wrap = (text, max) => { const out = []; let line = ""; for (const w of text.split(" ")) { if ((line + " " + w).trim().length > max) { out.push(line.trim()); line = w; } else line += " " + w; } if (line.trim()) out.push(line.trim()); return out; };
const chip = (x, y, text, color, size = 12) => { const w = text.length * (size * 0.62) + 22; return { w, svg: `<rect x="${x}" y="${y - 15}" width="${w.toFixed(0)}" height="22" rx="11" fill="${color}" fill-opacity="0.16"/><text x="${(x + w / 2).toFixed(1)}" y="${y}" fill="${color}" font-size="${size}" font-weight="700" text-anchor="middle">${esc(text)}</text>` }; };
const chipRow = (x, y, items, color) => items.map((t) => { const c = chip(x, y, t, color); x += c.w + 8; return c.svg; }).join("");
const months = (from) => { const a = new Date(from + "-01T00:00:00Z"), b = new Date(); return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth(); };
const repoOf = (name) => repos.find((r) => r.name.toLowerCase() === name.toLowerCase());

// 9. Current roles: one card per role (so each can be a link), with live tenure
{
  const roles = [
    { file: "role-ledgercross", role: "Software Engineer", org: "Ledgercross", site: "ledgercross.com", since: "2026-06", c: C.cyan, lines: wrap("Full-stack and platform. Built InvoicePilot: React 19, Fastify, PostgreSQL, FastAPI OCR, Solidity, a 700-test backend and QuickBooks, Xero, NetSuite and Sage integrations. Rebuilt Veritas KYC on Cloud Run with Document AI + Gemini and Terraform.", 62) },
    { file: "role-arche", role: "Lead Researcher, NLP & LLMs", org: "Arché Intelligence Lab", site: "arche-lab.org", since: "2026-06", c: C.violet, lines: wrap("Leading LLM and Bengali NLP research toward peer-reviewed publication with a distributed team of researchers across AIUB, BUET, BRAC and RUET.", 62) },
  ];
  roles.forEach((r) => { const m = months(r.since); const tenure = `NOW · ${m < 1 ? "THIS MONTH" : m === 1 ? "1 MO" : `${m} MO`}`; const c1 = chip(24, 44, tenure, r.c);
    writeFileSync(`${DIR}/${r.file}.svg`, card(590, 236, `<rect x="0.5" y="0.5" width="589" height="235" rx="18" fill="none" stroke="${r.c}" stroke-opacity="0.25"/>
${c1.svg}${chip(24 + c1.w + 8, 44, `SINCE ${r.since.replace("-", "/")}`, T.muted).svg}
<text x="24" y="82" fill="${T.ink}" font-size="21" font-weight="700" letter-spacing="-0.3">${esc(r.role)}</text>
${chip(24, 108, r.org, r.c, 13).svg}<text x="${24 + chip(24, 108, r.org, r.c, 13).w + 10}" y="108" fill="${T.muted}" font-size="14">${esc(r.site)} ↗</text>
${r.lines.slice(0, 5).map((l, j) => `<text x="24" y="${138 + j * 22}" fill="${T.body}" font-size="15">${esc(l)}</text>`).join("")}
<circle class="pulse" cx="560" cy="32" r="4" fill="${r.c}"/>`)); });
}

// 10. Project cards: one SVG per repo so each can be a link in the README, with live stars and last push
const WORK = [
  ["Eventarc", "QR access control, food tracking, live dashboards and bulk SMS for events of up to 60,000 attendees.", ["Go", "PostgreSQL", "Redis", "Convex", "React"]],
  ["docmind", "Document Q&A API: ingest, retrieve, rerank and answer with grounded citations.", ["Vertex AI RAG", "Gemini", "Docling", "Qdrant"]],
  ["flowcv-mcp", "MCP server and CLI giving AI assistants full control of the FlowCV resume builder. 50 tools.", ["MCP", "Node", "Chrome automation"]],
  ["polashi", "Provably-fair LLM social-deduction benchmark. An anti-cheat firewall makes secret leakage structurally impossible.", ["Python", "LLM eval"]],
  ["ScholarHub", "272 spiders indexing 12,000+ scholarships daily, full-text search and an admin review flow.", ["React 19", "TanStack Start", "Convex", "Python"]],
  ["kaajkormo", "Swipe-to-apply job portal with AI CV parsing and skill-match scoring.", ["React 19", "Rust/Axum", "PostgreSQL 17"]],
  ["DoinikHishab", "Money tracker for Bangladesh: envelope budgeting, net worth, 325 tests. Android, iOS and web.", ["Expo", "React Native", "Convex"]],
  ["Gaze-Tracker-Android", "Hands-free Android control: gaze navigation, dwell-to-click, 9-point calibration.", ["MediaPipe", "Accessibility Service"]],
];
const LABEL = { Eventarc: "Eventarc", docmind: "DocMind", "flowcv-mcp": "FlowCV MCP", polashi: "Polashi", ScholarHub: "ScholarHub", kaajkormo: "KaajKormo", DoinikHishab: "DoinikHishab", "Gaze-Tracker-Android": "Gaze Tracker" };
WORK.forEach(([name, desc, stack], i) => {
  const r = repoOf(name); const lang = r?.primaryLanguage; const accent = [C.cyan, C.violet, C.pink, C.mint][i % 4];
  const meta = [r?.stargazerCount ? `${r.stargazerCount} stars` : null, r ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(" · ");
  const lines = wrap(desc, 60).slice(0, 2);
  writeFileSync(`${DIR}/work-${name.toLowerCase()}.svg`, card(590, 170, `
<circle cx="32" cy="38" r="6" fill="${lang?.color || accent}"/><text x="48" y="44" fill="${T.ink}" font-size="20" font-weight="700" letter-spacing="-0.3">${esc(LABEL[name] || name)}</text>
<text x="566" y="44" fill="${T.muted}" font-size="13" text-anchor="end">${esc(meta)}</text>
${lines.map((l, j) => `<text x="24" y="${76 + j * 23}" fill="${T.body}" font-size="15">${esc(l)}</text>`).join("")}
<g opacity="0">${chipRow(24, 140, stack, accent)}${fadeIn(0.3 + (i % 2) * 0.15)}</g>
<rect x="0.5" y="0.5" width="589" height="169" rx="18" fill="none" stroke="${accent}" stroke-opacity="0.22"/>`));
});

// 11. Earlier roles: a timeline from the first role to today, with live "months ago" positioning
{
  const earlier = [
    ["Research Assistant", "Deepchain Labs", "2026-04", "2026-05", "Blockchain, cybersecurity and quantum cryptography R&D", C.pink],
    ["AI Engineering Intern", "Unies", "2026-02", "2026-05", "RAG pipelines, LLM evaluation, FastAPI backends", C.mint],
    ["Solo Developer", "BetaScript LLC", "2026-01", "2026-05", "4 production React 19 sites, 1.5x revenue, 50K+ users", C.violet],
    ["AI & Data Engineer", "BDTracks", "2025-08", "2026-05", "15+ scrapers, Gemini 2.5 fine-tuned on Vertex AI", C.cyan],
    ["Team Lead, Game Development", "AIUB", "2024-10", "2024-12", "Led 5 developers shipping a 2D OpenGL platformer", C.violet],
  ];
  const start = "2024-10", span = months(start) + 1, x0 = 420, x1 = 1176, px = (ym) => x0 + ((span - 1 - months(ym)) / span) * (x1 - x0);
  const rows = earlier.map(([role, org, a, b, what, c], i) => { const y = 72 + i * 62; const bx = px(a), bw = Math.max(18, px(b) + (x1 - x0) / span - bx);
    const fmt = (ym) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    return `<g opacity="0"><text x="24" y="${y}" fill="${T.ink}" font-size="16" font-weight="700">${esc(role)}</text>${chip(24 + role.length * 9.6 + 12, y, org, c, 12).svg}
<text x="24" y="${y + 20}" fill="${T.muted}" font-size="13">${fmt(a)} to ${fmt(b)} · ${esc(what)}</text>
<rect x="${x0}" y="${y - 6}" width="${x1 - x0}" height="10" rx="5" fill="${T.soft}"/><rect x="${bx.toFixed(1)}" y="${y - 6}" width="0" height="10" rx="5" fill="${c}"><animate attributeName="width" from="0" to="${bw.toFixed(1)}" begin="${(0.3 + i * 0.15).toFixed(2)}s" dur="0.9s" fill="freeze" ${EASE}/></rect>${fadeIn(0.1 + i * 0.12)}</g>`; }).join("");
  const ticks = []; for (let k = 0; k <= span; k += 6) { const d = new Date(start + "-01T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + k); const ym = d.toISOString().slice(0, 7); if (x1 - px(ym) < 70) continue; ticks.push(`<text x="${px(ym).toFixed(1)}" y="${72 + earlier.length * 62 - 8}" fill="${T.faint}" font-size="12" text-anchor="middle">${d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })}</text>`); }
  ticks.push(`<text x="${x1}" y="${72 + earlier.length * 62 - 8}" fill="${C.cyan}" font-size="12" text-anchor="end" font-weight="700">TODAY</text>`);
  writeFileSync(`${DIR}/earlier.svg`, card(1200, 72 + earlier.length * 62 + 40, `${title("Earlier")}<text x="1176" y="36" fill="${T.muted}" font-size="14" text-anchor="end">BSc CSE, AIUB (2022 to 2026) · CGPA 3.90 · 3x Dean's List · 1st Runner-Up, AIUB CS Fest 2024 · full history on LinkedIn ↗</text>${rows}${ticks.join("")}`));
}

// 12. Stack: labelled chip rows
{
  const groups = [["AI", ["Gemini", "Vertex AI", "RAG", "LangChain", "LlamaIndex", "Qdrant", "Pinecone", "MCP", "BERT", "PyTorch", "scikit-learn"], C.cyan],
    ["WEB & MOBILE", ["TypeScript", "React 19", "TanStack Start", "Convex", "Expo", "React Native", "Flutter", "Tailwind", "Fastify", "FastAPI"], C.violet],
    ["BACKEND & INFRA", ["PostgreSQL", "Drizzle", "Go", "Rust", "Java", "Python", "Cloud Run", "Terraform", "Docker", "GitHub Actions", "Solidity"], C.pink]];
  const rows = groups.map(([label, items, c], i) => { const y = 52 + i * 52; return `<g opacity="0"><text x="24" y="${y}" fill="${T.muted}" font-size="12" font-weight="700" letter-spacing="1.2">${esc(label)}</text>${chipRow(170, y, items, c)}${fadeIn(0.1 + i * 0.2)}${spring(0.1 + i * 0.2, 12)}</g>`; }).join("");
  writeFileSync(`${DIR}/stack.svg`, card(1200, 180, rows));
}

// 13. Research: one card per paper so each can link to its DOI or listing
{
  const papers = [["research-qpain", "PAPER", "IEEE QPAIN 2026", "Decoding Research Trends: A Clustering Based Topic Modeling Framework", "IEEE Xplore, Scopus indexed · DOI 10.1109/QPAIN69676.2026.11545814 ↗", C.cyan],
    ["research-idaa", "CHAPTER", "IDAA 2025 · Taylor & Francis", "Beyond NER: A Comparative Benchmark of Medical BERTs for Multi-Label Adverse Drug Reaction Classification", "Book chapter · BioBERT and PubMedBERT on PsyTAR · Google Scholar ↗", C.violet],
    ["research-climate", "TALK", "South Asian Climate Conference 2024", "Cyclones and Calamity: A Historical and Statistical Unmasking of Losses in Bangladesh", "Statistical analysis and presentation · certificate on the portfolio ↗", C.pink]];
  papers.forEach(([file, kind, venue, t, note, c]) => { const lines = wrap(t, 100); const k = chip(24, 38, kind, c);
    writeFileSync(`${DIR}/${file}.svg`, card(1200, lines.length > 1 ? 112 : 92, `<rect x="0.5" y="0.5" width="1199" height="${lines.length > 1 ? 111 : 91}" rx="18" fill="none" stroke="${c}" stroke-opacity="0.25"/>
${k.svg}<text x="${24 + k.w + 12}" y="38" fill="${T.ink}" font-size="16" font-weight="700">${esc(venue)}</text>
${lines.map((l, j) => `<text x="24" y="${62 + j * 20}" fill="${T.body}" font-size="15" font-style="italic">${esc(l)}</text>`).join("")}
<text x="1176" y="38" fill="${T.muted}" font-size="13" text-anchor="end">${esc(note)}</text>`)); });
}

// 13b. Navigation pills, one per section so each is a link
["Now", "Work", "Research", "Earlier", "Stack", "Activity"].forEach((label) => { const w = label.length * 10 + 40;
  writeFileSync(`${DIR}/nav-${label.toLowerCase()}.svg`, svg(w, 40, `<rect x="0.5" y="0.5" width="${w - 1}" height="39" rx="20" fill="${T.card}" stroke="${T.line}"/><text x="${w / 2}" y="25" fill="${T.ink}" font-size="15" font-weight="600" text-anchor="middle">${label}</text>`)); });

// 14. Footer: the ask. The live status line lives in the header only, so nothing overlaps the heading.
{
  writeFileSync(`${DIR}/footer.svg`, card(1200, 140, `
<text x="600" y="50" fill="${T.ink}" font-size="24" font-weight="700" text-anchor="middle" letter-spacing="-0.4">Open to AI/ML engineering, full-stack and research roles.</text>
<text x="600" y="80" fill="${T.body}" font-size="16" text-anchor="middle">If you ship AI features and care whether they work, we should talk.</text>
<g opacity="0"><rect x="430" y="94" width="340" height="34" rx="17" fill="${C.cyan}" fill-opacity="0.16"/><text x="600" y="117" fill="${C.cyan}" font-size="16" font-weight="700" text-anchor="middle" font-family="${MONO}">ehsanul.siamdev@gmail.com</text>${fadeIn(0.4)}${spring(0.4, 10)}</g>`));
}

// 8. Typing banner: lines type in and erase in a loop, pure SMIL
{
  const lines = ["Building AI systems that reach production", "Published in IEEE Xplore and Taylor & Francis", "Shipped apps serving 50,000+ users", "React 19 · Convex · Gemini on Vertex AI · MCP · Go · Rust"];
  const n = lines.length, CYC = n * 4.5, slot = 1 / n, cw = 13.25;
  const kt = (i) => { const s0 = i * slot, s1 = (i + 1) * slot; return [s0, s0 + slot * 0.38, s1 - slot * 0.18, s1 - slot * 0.03, s1].map((v) => Math.min(1, v).toFixed(4)); };
  const body = lines.map((t, i) => { const w = t.length * cw, k = kt(i);
    return `<clipPath id="t${i}"><rect x="0" y="0" width="0" height="48"><animate attributeName="width" values="0;0;${w};${w};0;0" keyTimes="0;${k[0]};${k[1]};${k[2]};${k[3]};1" dur="${CYC}s" repeatCount="indefinite"/></rect></clipPath>
<g clip-path="url(#t${i})"><text x="0" y="30" fill="${T.ink}" font-size="22" font-family="${MONO}">${esc(t)}</text></g>`; }).join("");
  const cur = lines.map((t, i) => { const w = t.length * cw; return `0 0;${w} 0;${w} 0;0 0;0 0`; }).join(";");
  const curT = lines.flatMap((_, i) => kt(i)).join(";");
  writeFileSync(`${DIR}/typing.svg`, svg(820, 48, `<rect x="0.5" y="0.5" width="819" height="47" rx="24" fill="${T.card}" stroke="${T.line}"/><g transform="translate(24 2)">${body}<rect y="8" width="2" height="26" fill="${C.cyan}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="${cur}" keyTimes="${curT}" dur="${CYC}s" repeatCount="indefinite"/></rect></g>`));
}

}
console.log(`rendered: ${stars} stars, ${commits} commits, ${repos.length} repos, streak ${current}/${longest}`);
