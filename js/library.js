// Built-in activity library. Text fields are {en, ro}. Diagrams use meters as units
// and are drawn by diagram.js.

export const CATEGORIES = ['arrival', 'warmup', 'technical', 'game', 'cooldown', 'break'];

// ---------- diagram helpers ----------

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Spread n players over a box on a jittered grid so they never overlap. */
function spread(n, seed, box, extra = {}) {
  const rnd = mulberry32(seed);
  const cols = Math.ceil(Math.sqrt((n * box.w) / box.h));
  const rows = Math.ceil(n / cols);
  const cw = box.w / cols;
  const rh = box.h / rows;
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    out.push({
      t: 'p',
      x: box.x + cw * (c + 0.25 + rnd() * 0.5),
      y: box.y + rh * (r + 0.25 + rnd() * 0.5),
      dir: rnd() * Math.PI * 2,
      ...extra,
    });
  }
  return out;
}

const field = (w, h, extra = {}) => ({ t: 'area', x: 0, y: 0, w, h, pitch: true, ...extra });

// ---------- shared localized bits ----------

const L = {
  kids12: { en: '12 (works for 8–14)', ro: '12 (merge pentru 8–14)' },
  square20: { en: '20 × 20 m', ro: '20 × 20 m' },
  ballEach: { en: 'One size-3 ball per child', ro: 'Câte o minge mărimea 3 pentru fiecare copil' },
};

// ---------- activities ----------

export const LIBRARY = [
  {
    id: 'free-dribble',
    category: 'arrival',
    duration: 5,
    skills: ['dribbling', 'ball control'],
    title: { en: 'Free dribble + Coach says', ro: 'Dribling liber + „Antrenorul spune”' },
    summary: {
      en: 'Everyone dribbles their own ball and touches it with the part of the foot you call.',
      ro: 'Toți driblează cu mingea lor și ating mingea cu partea piciorului strigată.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: { en: 'One ball per child, 4 cones for the square', ro: 'Câte o minge de copil, 4 conuri pentru pătrat' },
    setup: {
      en: 'Mark a 20 × 20 m square. Start as soon as the first child arrives so nobody waits.',
      ro: 'Marcați un pătrat de 20 × 20 m. Începeți din momentul în care sosește primul copil, ca nimeni să nu aștepte.',
    },
    howTo: {
      en: 'Everyone dribbles freely. Call a part of the foot (“Sole!”, “Inside!”, “Outside!”) and the children touch the ball with it. Call “Freeze!” and they stop the ball with the sole and stand still like statues.',
      ro: 'Toți driblează liber. Strigați o parte a piciorului („talpa!”, „interior!”, „exterior!”), iar copiii ating mingea cu ea. Strigați „înghețați!”, iar ei opresc mingea cu talpa și stau nemișcați ca niște statui.',
    },
    coaching: [
      { en: 'Small touches, keep the ball close', ro: 'Atingeri mici, mingea aproape de picioare' },
      { en: 'Eyes up so you can see the space', ro: 'Privirea ridicată, ca să vezi spațiul liber' },
      { en: 'Use both feet', ro: 'Folosiți ambele picioare' },
    ],
    easier: { en: 'Only call “Freeze!” at first, then add one foot part at a time.', ro: 'La început strigați doar „înghețați!”, apoi adăugați câte o parte a piciorului.' },
    harder: { en: 'Call two commands in a row, or ask for the weaker foot only.', ro: 'Strigați două comenzi la rând sau cereți doar piciorul mai slab.' },
    calls: [
      { en: 'Sole!', ro: 'Talpa!' },
      { en: 'Inside!', ro: 'Interior!' },
      { en: 'Outside!', ro: 'Exterior!' },
      { en: 'Freeze!', ro: 'Înghețați!' },
      { en: 'Weaker foot!', ro: 'Piciorul slab!' },
    ],
    diagram: { w: 20, h: 20, items: [field(20, 20), ...spread(12, 7, { x: 1, y: 1, w: 18, h: 18 }, { c: 'blue', ball: true })] },
  },

  {
    id: 'muscle-warmup',
    category: 'warmup',
    duration: 3,
    skills: ['coordination', 'warm-up'],
    title: { en: 'Copy the coach: 6 moves', ro: 'Încălzire musculară: 6 mișcări' },
    summary: {
      en: 'Six simple moves, 30 seconds each, copied from the coach. No balls.',
      ro: 'Șase mișcări simple, câte 30 de secunde, copiate după antrenor. Fără mingi.',
    },
    players: L.kids12,
    space: { en: 'Two rows of six facing the coach', ro: 'Două rânduri de câte șase, cu fața la antrenor' },
    equipment: { en: 'None', ro: 'Nimic' },
    setup: {
      en: 'Two rows of six, an arm’s length apart, facing you. No balls.',
      ro: 'Două rânduri de câte șase copii, la distanță de un braț, cu fața la antrenor. Fără mingi.',
    },
    howTo: {
      en: 'The children copy you through six moves, 30 seconds each: squats (“sit on an invisible chair”), lunges (big steps, straight back), leg swings (arms wide, then switch legs), high knees, heel flicks (heels touch your bum) and tiptoe reaches. Count the reps out loud together.',
      ro: 'Copiii copiază antrenorul în șase mișcări, câte 30 de secunde fiecare: genuflexiuni („stați ca pe un scaun invizibil”), fandări (pași mari, spatele drept), balansări de picior (brațele larg depărtate, apoi schimbați piciorul), genunchi sus, călcâie la fund și vârfuri (întindeți-vă cât mai sus). Numărați împreună, cu voce tare, repetările.',
    },
    coaching: [
      { en: 'Slow and controlled', ro: 'Lent și controlat' },
      { en: 'Knees over toes', ro: 'Genunchii deasupra degetelor de la picioare' },
      { en: 'Soft landings', ro: 'Aterizări line' },
      { en: 'Keep it short and playful', ro: 'Scurt și jucăuș' },
    ],
    easier: { en: 'Do three moves only, 20 seconds each.', ro: 'Doar trei mișcări, câte 20 de secunde.' },
    harder: { en: 'Let a child lead one of the moves.', ro: 'Lăsați un copil să conducă una dintre mișcări.' },
    calls: [
      { en: 'Squats', ro: 'Genuflexiuni' },
      { en: 'Lunges', ro: 'Fandări' },
      { en: 'Leg swings', ro: 'Balansări' },
      { en: 'High knees', ro: 'Genunchi sus' },
      { en: 'Heel flicks', ro: 'Călcâie la fund' },
      { en: 'Tiptoes', ro: 'Vârfuri' },
    ],
    rounds: { count: 6, work: 30, rest: 5 },
    diagram: {
      w: 16,
      h: 9,
      items: [
        field(16, 9),
        { t: 'coach', x: 8, y: 1.6 },
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: 'p', c: 'blue', x: 2.5 + i * 2.2, y: 4.8 })),
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: 'p', c: 'blue', x: 2.5 + i * 2.2, y: 7.2 })),
      ],
    },
  },

  {
    id: 'traffic-light',
    category: 'warmup',
    duration: 3,
    skills: ['dribbling', 'listening'],
    title: { en: 'Traffic light', ro: 'Semaforul' },
    summary: {
      en: 'Green = dribble fast, yellow = slow, red = stop the ball with the sole.',
      ro: 'Verde = driblați repede, galben = încet, roșu = opriți mingea cu talpa.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: L.ballEach,
    setup: { en: 'Same square as the arrival game, one ball each.', ro: 'Aceeași zonă ca la jocul de sosire, câte o minge fiecare.' },
    howTo: {
      en: 'Call a colour. Green: dribble fast. Yellow: dribble slowly. Red: stop the ball with the sole and freeze. Change quickly to keep them guessing.',
      ro: 'Strigați o culoare. Verde: driblați repede. Galben: driblați încet. Roșu: opriți mingea cu talpa și înghețați. Schimbați des culorile ca să-i țineți atenți.',
    },
    coaching: [
      { en: 'Head up between touches', ro: 'Capul sus între atingeri' },
      { en: 'Change of speed, not just running', ro: 'Schimbare de ritm, nu doar alergare' },
      { en: 'Sole on top of the ball on red', ro: 'Talpa pe minge la roșu' },
    ],
    easier: { en: 'Hold up coloured cones instead of shouting.', ro: 'Ridicați conuri colorate în loc să strigați.' },
    harder: { en: 'Add purple = turn and go the other way.', ro: 'Adăugați mov = întoarcere și plecare în sens opus.' },
    calls: [
      { en: 'Green!', ro: 'Verde!', color: '#1f9d55' },
      { en: 'Yellow!', ro: 'Galben!', color: '#e6b800' },
      { en: 'Red!', ro: 'Roșu!', color: '#d63b2f' },
    ],
    diagram: {
      w: 20,
      h: 20,
      items: [
        field(20, 20),
        ...spread(12, 21, { x: 1, y: 3.5, w: 18, h: 15.5 }, { c: 'blue', ball: true }),
        { t: 'coach', x: 10, y: 1.2 },
        { t: 'mark', x: 13, y: 1.2, c: '#1f9d55' },
        { t: 'mark', x: 14.6, y: 1.2, c: '#e6b800' },
        { t: 'mark', x: 16.2, y: 1.2, c: '#d63b2f' },
      ],
    },
  },

  {
    id: 'sharks-minnows',
    category: 'technical',
    duration: 7,
    skills: ['dribbling', 'shielding', 'turning'],
    title: { en: 'Sharks and minnows', ro: 'Rechinii și peștișorii' },
    summary: {
      en: 'Two sharks try to knock the minnows’ balls out. Nobody is ever out.',
      ro: 'Doi rechini încearcă să scoată mingile peștișorilor din zonă. Nimeni nu e eliminat.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: { en: 'Balls for all minnows, 2 bibs for the sharks', ro: 'Mingi pentru toți peștișorii, 2 veste pentru rechini' },
    setup: {
      en: 'Two sharks without a ball: you and one child, swapped every 90 seconds. Everyone else is a minnow with a ball.',
      ro: 'Doi rechini fără minge (antrenorul și un copil, schimbat la fiecare 90 de secunde). Ceilalți sunt peștișori, fiecare cu minge.',
    },
    howTo: {
      en: 'Sharks try to knock the minnows’ balls out of the square. A minnow whose ball goes out does five alternating sole taps on the ball and comes straight back in, so nobody is eliminated.',
      ro: 'Rechinii încearcă să scoată mingile peștișorilor din zonă. Un peștișor a cărui minge iese face cinci atingeri alternative cu talpa pe minge și intră înapoi, așa că nimeni nu este eliminat.',
    },
    coaching: [
      { en: 'Head up, see the shark coming', ro: 'Capul sus, vezi rechinul care vine' },
      { en: 'Turn away with the sole or the inside of the foot', ro: 'Întoarceți-vă de la rechin cu talpa sau cu interiorul labei piciorului' },
      { en: 'Use both feet', ro: 'Folosiți ambele picioare' },
      { en: 'Swap the child shark every 90 seconds', ro: 'Schimbați copilul rechin la fiecare 90 de secunde' },
    ],
    easier: { en: 'One shark only, and the coach shark walks.', ro: 'Un singur rechin, iar antrenorul rechin merge la pas.' },
    harder: { en: 'Three sharks, or make the square smaller.', ro: 'Trei rechini sau un pătrat mai mic.' },
    rounds: { count: 4, work: 90, rest: 15 },
    diagram: {
      w: 20,
      h: 20,
      legend: { orange: { en: 'Shark (no ball)', ro: 'Rechin, fără minge' }, blue: { en: 'Minnow with ball', ro: 'Peștișor cu minge' } },
      items: [
        field(20, 20),
        ...spread(10, 33, { x: 1, y: 1, w: 18, h: 18 }, { c: 'blue', ball: true }),
        { t: 'p', c: 'orange', x: 7, y: 6.5, dir: 0.6 },
        { t: 'p', c: 'orange', x: 12.5, y: 12, dir: 1.0 },
      ],
    },
  },

  {
    id: 'gate-passing',
    category: 'technical',
    duration: 5,
    skills: ['passing', 'first touch'],
    title: { en: 'Passing through gates', ro: 'Pase prin porți' },
    summary: {
      en: 'Pairs pass through cone gates and count how many they make in 60 seconds.',
      ro: 'Perechile pasează prin porți din conuri și numără câte reușesc în 60 de secunde.',
    },
    players: { en: '6 pairs', ro: '6 perechi' },
    space: L.square20,
    equipment: { en: 'About 16 cones for 8 gates (1.5 m wide), one ball per pair', ro: 'Circa 16 conuri pentru 8 porți (1,5 m lățime), o minge pe pereche' },
    setup: {
      en: 'Scatter about 8 cone gates, 1.5 m wide, around the square. Six pairs, one ball per pair.',
      ro: 'Circa 8 porți din conuri (1,5 m lățime), împrăștiate în zonă. Șase perechi, câte o minge pentru fiecare pereche.',
    },
    howTo: {
      en: 'Pass through a gate to your partner. They stop it and pass through a different gate. Count the gates in 60 seconds, then try to beat your score. Three rounds.',
      ro: 'Pasați mingea printr-o poartă către partener, care o oprește și pasează printr-o altă poartă. Numărați porțile trecute în 60 de secunde, apoi încercați să vă depășiți scorul. Trei runde.',
    },
    coaching: [
      { en: 'Pass with the inside of the foot', ro: 'Interiorul labei piciorului' },
      { en: 'Standing foot next to the ball', ro: 'Piciorul de sprijin lângă minge' },
      { en: 'Say your partner’s name before you pass', ro: 'Spuneți numele partenerului înainte de pasă' },
      { en: 'Soft first touch', ro: 'Prima atingere moale' },
    ],
    easier: { en: 'Wider gates.', ro: 'Porți mai late.' },
    harder: { en: 'Every pass must go through a different gate from the last one.', ro: 'Fiecare pasă trebuie să treacă printr-o poartă diferită de precedenta.' },
    rounds: { count: 3, work: 60, rest: 30 },
    diagram: {
      w: 20,
      h: 20,
      legend: { blue: { en: 'Player in a pair', ro: 'Jucător în pereche' } },
      items: [
        field(20, 20),
        ...[
          [5, 3.5], [14.5, 3.5], [10, 7.5], [4.5, 10.5], [15, 10.5], [10, 13.5], [5, 17], [15, 17],
        ].map(([x, y]) => ({ t: 'gate', x, y, rot: 90 })),
        ...[
          [2, 3.5, 8, 3.5], [11.5, 3.5, 17.5, 3.5], [1.5, 10.5, 7.5, 10.5],
          [12, 10.5, 18, 10.5], [2, 17, 8, 17], [12, 17, 18, 17],
        ].flatMap(([x1, y1, x2, y2]) => [
          { t: 'p', c: 'blue', x: x1, y: y1, ball: true, dir: 0, len: 0 },
          { t: 'arrow', x1: x1 + 1.4, y1, x2: x2 - 1.1, y2 },
          { t: 'p', c: 'blue', x: x2, y: y2 },
        ]),
      ],
    },
  },

  {
    id: 'goal-attack',
    category: 'technical',
    duration: 5,
    skills: ['shooting'],
    title: { en: 'Goal attack', ro: 'Asaltul porții' },
    summary: {
      en: 'Three small goals, four children at each. Dribble a few steps and shoot.',
      ro: 'Trei porți mici, câte patru copii la fiecare. Dribling câțiva pași, apoi șut.',
    },
    players: { en: '3 groups of 4', ro: '3 grupuri de câte 4' },
    space: { en: 'Three lanes, balls 8 m from goal', ro: 'Trei culoare, mingile la 8 m de poartă' },
    equipment: { en: '3 small goals (or cone goals), 2 balls per group', ro: '3 porți mici (sau din conuri), 2 mingi pe grup' },
    setup: {
      en: 'Three small goals spaced apart, four children at each. Two balls per group placed 8 m from the goal.',
      ro: 'Trei porți mici, distanțate între ele, câte patru copii la fiecare. Două mingi pentru fiecare grup, așezate la 8 m de poartă.',
    },
    howTo: {
      en: 'One child keeps goal for three shots. The others take turns to dribble a few steps and shoot. Swap the keeper after three shots. Each group counts its goals and tries to beat that in the next round.',
      ro: 'Un copil este portar pentru trei șuturi, iar ceilalți driblează pe rând câțiva pași și șutează. Schimbați portarul după trei șuturi. Fiecare grup își numără golurile și încearcă să depășească numărul în runda următoare.',
    },
    coaching: [
      { en: 'Strike with the laces', ro: 'Loviți mingea cu ristul' },
      { en: 'Standing foot next to the ball', ro: 'Piciorul de sprijin lângă minge' },
      { en: 'Eyes on the target', ro: 'Ochii la țintă' },
      { en: 'Follow your shot in', ro: 'Urmăriți mingea după șut' },
    ],
    easier: { en: 'Move the balls closer, no keeper.', ro: 'Mingile mai aproape, fără portar.' },
    harder: { en: 'Shoot with the weaker foot, or from a pass.', ro: 'Șut cu piciorul mai slab sau din pasă.' },
    diagram: {
      w: 21,
      h: 13,
      legend: { orange: { en: 'Keeper, swap after 3 shots', ro: 'Portar, schimb după 3 șuturi' }, blue: { en: 'Shooter', ro: 'Șutor' } },
      items: [
        field(21, 13),
        ...[3.5, 10.5, 17.5].flatMap((cx) => [
          { t: 'goal', x: cx - 1.5, y: 0.6, w: 3, h: 0.6 },
          { t: 'p', c: 'orange', x: cx, y: 2.2 },
          { t: 'ball', x: cx - 0.5, y: 9.2 },
          { t: 'ball', x: cx + 0.5, y: 9.2 },
          { t: 'arrow', x1: cx, y1: 8.4, x2: cx, y2: 3.4, dash: true },
          { t: 'p', c: 'blue', x: cx - 1.6, y: 11.4 },
          { t: 'p', c: 'blue', x: cx, y: 11.8 },
          { t: 'p', c: 'blue', x: cx + 1.6, y: 11.4 },
        ]),
        { t: 'line', x1: 7, y1: 0, x2: 7, y2: 13, dash: true },
        { t: 'line', x1: 14, y1: 0, x2: 14, y2: 13, dash: true },
      ],
    },
  },

  {
    id: '3v3-two-pitches',
    category: 'game',
    duration: 25,
    skills: ['game', 'finding space', 'passing', 'shooting'],
    title: { en: '3 v 3 on two pitches', ro: 'Jocuri: 3 contra 3 pe două terenuri' },
    summary: {
      en: 'Two games at once so all 12 play. Three rounds of 8 minutes, new teams each round.',
      ro: 'Două jocuri în paralel, ca să joace toți 12. Trei runde de 8 minute, echipe noi la fiecare rundă.',
    },
    players: { en: '12 (2 × 3 v 3)', ro: '12 (2 × 3 contra 3)' },
    space: { en: 'Two 20 × 15 m pitches side by side', ro: 'Două terenuri de 20 × 15 m, unul lângă altul' },
    equipment: { en: '4 small goals, 6 red and 6 blue bibs, spare balls by each goal', ro: '4 porți mici, 6 veste roșii și 6 albastre, mingi de rezervă lângă fiecare poartă' },
    setup: {
      en: 'Two 20 × 15 m pitches side by side with a small goal at each end. Three players per team, six per pitch. Stand on the touchline between the two pitches.',
      ro: 'Două terenuri de 20 × 15 m unul lângă altul, cu o poartă mică la fiecare capăt. Trei jucători pe echipă, șase jucători pe teren. Antrenorul stă pe margine, între terenuri.',
    },
    howTo: {
      en: 'Both pitches play at once. Restart with a pass or dribble from the line, not a throw-in. Keep spare balls by each goal so play restarts in seconds. No keepers and no offside so everyone stays involved. About 30 seconds between rounds to swap bibs and drink. Mix the teams every round.',
      ro: 'Ambele terenuri se joacă în același timp. Reluați jocul cu o pasă sau un dribling de la linie, nu cu aruncare de la margine. Țineți mingi de rezervă lângă fiecare poartă, ca jocul să reînceapă în câteva secunde. Fără portari și fără ofsaid, ca toți să rămână implicați. Aproximativ 30 de secunde între runde pentru schimbat vestele și o gură de apă. Amestecați echipele la fiecare rundă.',
    },
    coaching: [
      { en: 'Stay on the side and let them play', ro: 'Rămâneți pe margine și lăsați-i să joace' },
      { en: 'Stop play once or twice at most, for a 20-second tip', ro: 'Opriți jocul o dată sau de două ori, pentru un sfat de 20 de secunde' },
      { en: 'Ask questions: “Where is the free space?”', ro: 'Puneți întrebări: „Unde este spațiul liber?”' },
      { en: 'Praise brave dribbles, passes to a friend and shots', ro: 'Lăudați dribling-urile curajoase, pasele către un prieten și șuturile' },
      { en: 'Count goals out loud for fun, but keep no table', ro: 'Numărați golurile cu voce tare, pentru distracție, dar nu țineți clasament' },
    ],
    easier: { en: '10–11 children: add one or two jokers who join the team with the ball.', ro: '10–11 copii: adăugați unul sau doi „jokeri” care se alătură echipei care are mingea.' },
    harder: { en: 'A goal counts double after a pass.', ro: 'Un gol valorează dublu după o pasă.' },
    rounds: { count: 3, work: 480, rest: 30 },
    diagram: {
      w: 22,
      h: 33,
      legend: { blue: { en: 'Team 1 bibs', ro: 'Veste echipa 1' }, orange: { en: 'Team 2 bibs', ro: 'Veste echipa 2' } },
      items: [
        { t: 'area', x: 1, y: 0, w: 20, h: 15, pitch: true },
        { t: 'area', x: 1, y: 18, w: 20, h: 15, pitch: true },
        ...[0, 18].flatMap((oy) => [
          { t: 'line', x1: 11, y1: oy, x2: 11, y2: oy + 15 },
          { t: 'goal', x: 0.2, y: oy + 6, w: 0.8, h: 3 },
          { t: 'goal', x: 21, y: oy + 6, w: 0.8, h: 3 },
          { t: 'p', c: 'blue', x: 4, y: oy + 7.5 },
          { t: 'p', c: 'blue', x: 8, y: oy + 4 },
          { t: 'p', c: 'blue', x: 8, y: oy + 11 },
          { t: 'p', c: 'orange', x: 18, y: oy + 7.5 },
          { t: 'p', c: 'orange', x: 14, y: oy + 4 },
          { t: 'p', c: 'orange', x: 14, y: oy + 11 },
          { t: 'ball', x: 11, y: oy + 7.5 },
        ]),
        { t: 'coach', x: 11, y: 16.5 },
      ],
    },
  },

  {
    id: 'finale-shoot-coach',
    category: 'cooldown',
    duration: 6,
    skills: ['shooting', 'fun', 'cool-down'],
    title: { en: 'Kids vs coach + huddle', ro: 'Copii contra antrenor + adunare' },
    summary: {
      en: 'Everyone shoots at the coach in goal, then a short stretch and team huddle.',
      ro: 'Fiecare copil șutează la antrenorul din poartă, apoi întindere ușoară și adunare.',
    },
    players: L.kids12,
    space: { en: 'One goal, a line of kids 8 m out', ro: 'O poartă, copiii la 8 m' },
    equipment: { en: 'One goal, a pile of balls', ro: 'O poartă, o grămadă de mingi' },
    setup: { en: 'You go in goal. Children line up with a ball each about 8 m away.', ro: 'Antrenorul intră în poartă. Copiii stau la rând, fiecare cu o minge, la circa 8 m.' },
    howTo: {
      en: 'Shots at goal (3 min): each child shoots once or twice against you, and you let a few in. Stretch and huddle (3 min): one minute of “tall tree, touch your toes”, then a huddle. Ask “What was your favourite moment today?”, give high-fives and say when the next training is. Every child carries one cone back.',
      ro: 'Șuturi la poartă (3 min): fiecare copil șutează o dată sau de două ori împotriva antrenorului din poartă, iar antrenorul lasă să intre câteva goluri. Întindere și adunare (3 min): un minut de „copac înalt, atingeți degetele de la picioare”, apoi o adunare. Întrebați „Care a fost momentul tău preferat azi?”, dați high-five și anunțați ziua următorului antrenament. Fiecare copil duce un con înapoi.',
    },
    coaching: [
      { en: 'Let them score, celebrate loudly', ro: 'Lăsați-i să marcheze, sărbătoriți cu voce tare' },
      { en: 'Ask: “What was your favourite moment today?”', ro: 'Întrebați: „Care a fost momentul tău preferat azi?”' },
      { en: 'Announce the next training day', ro: 'Anunțați ziua următorului antrenament' },
      { en: 'Each child carries one cone back', ro: 'Fiecare copil duce un con înapoi' },
    ],
    diagram: {
      w: 16,
      h: 12,
      items: [
        field(16, 12),
        { t: 'goal', x: 6, y: 0.4, w: 4, h: 0.7 },
        { t: 'coach', x: 8, y: 1.9 },
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: 'p', c: 'blue', x: 3 + i * 2, y: 10.3 })),
        { t: 'ball', x: 7.6, y: 8.6 },
        { t: 'arrow', x1: 8, y1: 8, x2: 8.6, y2: 2.9, dash: true },
      ],
    },
  },

  {
    id: 'animal-moves',
    category: 'warmup',
    duration: 4,
    skills: ['coordination', 'balance', 'listening'],
    title: { en: 'Animal moves', ro: 'Mișcări de animale' },
    summary: {
      en: 'Move around the square like the animal you call, then freeze like a statue.',
      ro: 'Copiii se mișcă prin zonă ca animalul strigat, apoi îngheață ca statuile.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: { en: 'No balls', ro: 'Fără mingi' },
    setup: { en: 'Everyone inside the 20 × 20 m square with room to move. No balls.', ro: 'Toți stau în zona de 20 × 20 m, cu loc de mișcare. Fără mingi.' },
    howTo: {
      en: 'Call an animal and everyone moves like it: bunny hops, frog jumps, giraffe walk on tiptoes or crab steps sideways. Call a new animal about every 45 seconds. In between, call “Freeze!”: stand like a statue on one leg, then switch legs. Start slow and finish with quick feet.',
      ro: 'Antrenorul strigă un animal, iar toți se mișcă prin zonă ca acel animal: sărituri de iepuraș, sărituri de broscuță, mers de girafă pe vârfuri sau pași de rac (în lateral). Strigați un animal nou la aproximativ 45 de secunde. Între animale strigați „înghețați”: toți stau ca o statuie pe un picior, apoi schimbă piciorul. Începeți încet și terminați cu picioare iuți.',
    },
    coaching: [
      { en: 'Land softly with bent knees', ro: 'Aterizați moale, cu genunchii îndoiți' },
      { en: 'Move into free space so nobody bumps', ro: 'Mișcați-vă în spațiul liber ca să nu vă ciocniți' },
      { en: 'Eyes up', ro: 'Privirea sus' },
      { en: 'Works on cold or wet ground too', ro: 'Merge și pe teren rece sau ud' },
    ],
    easier: { en: 'Two animals only, and you do them with the group.', ro: 'Doar două animale, făcute împreună cu antrenorul.' },
    harder: { en: 'Let the children invent an animal for everyone to copy.', ro: 'Lăsați copiii să inventeze un animal pe care îl copiază toți.' },
    calls: [
      { en: 'Bunny hops!', ro: 'Iepurașul!' },
      { en: 'Frog jumps!', ro: 'Broscuța!' },
      { en: 'Giraffe walk!', ro: 'Girafa!' },
      { en: 'Crab steps!', ro: 'Racul!' },
      { en: 'Freeze on one leg!', ro: 'Înghețați pe un picior!' },
    ],
    rounds: { count: 5, work: 45, rest: 10 },
    diagram: { w: 20, h: 20, items: [field(20, 20), ...spread(12, 51, { x: 1, y: 1, w: 18, h: 18 }, { c: 'blue' })] },
  },

  {
    id: 'coloured-cones',
    category: 'warmup',
    duration: 5,
    skills: ['dribbling', 'listening', 'stopping the ball'],
    title: { en: 'Coloured corners', ro: 'Conuri colorate' },
    summary: {
      en: 'Call a colour and everyone dribbles to that corner and stops the ball.',
      ro: 'Antrenorul strigă o culoare, iar toți driblează spre un con de acea culoare.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: { en: '3 cones of one colour in each corner, one ball each', ro: 'Câte 3 conuri de aceeași culoare în fiecare colț, câte o minge fiecare' },
    setup: { en: 'A group of three cones in each corner, one colour per corner (use the colours you have).', ro: 'Un grup de trei conuri în fiecare colț, câte o culoare pe colț (folosiți culorile pe care le aveți).' },
    howTo: {
      en: 'Call a colour. Everyone dribbles to a cone of that colour and stops the ball with the sole. Call the next colour straight away. Nobody is out; the aim is to arrive with the ball under control.',
      ro: 'Antrenorul strigă o culoare. Toți driblează spre un con de acea culoare și opresc mingea cu talpa. Strigați imediat următoarea culoare. Nimeni nu este eliminat; scopul este să ajungeți cu mingea sub control.',
    },
    coaching: [
      { en: 'Head up to find the right corner', ro: 'Capul sus ca să găsiți colțul potrivit' },
      { en: 'Small touches', ro: 'Atingeri mici' },
      { en: 'Stop the ball with the sole', ro: 'Opriți mingea cu talpa' },
    ],
    easier: { en: 'Point at the corner as you call it.', ro: 'Arătați colțul în timp ce strigați.' },
    harder: { en: 'Call two colours in a row, or weaker foot only.', ro: 'Strigați două culori la rând sau cereți doar piciorul mai slab.' },
    calls: [
      { en: 'Orange!', ro: 'Portocaliu!', color: '#e8692c' },
      { en: 'Green!', ro: 'Verde!', color: '#1f9d55' },
      { en: 'Blue!', ro: 'Albastru!', color: '#1f4fbf' },
      { en: 'Pink!', ro: 'Roz!', color: '#d64f8c' },
    ],
    diagram: {
      w: 20,
      h: 20,
      items: [
        field(20, 20),
        ...[
          [2, 2, '#e8692c'], [18, 2, '#1f9d55'], [2, 18, '#1f4fbf'], [18, 18, '#d64f8c'],
        ].flatMap(([x, y, c]) => [
          { t: 'cone', x: x - 0.7, y: y + 0.4, c },
          { t: 'cone', x: x + 0.7, y: y + 0.4, c },
          { t: 'cone', x, y: y - 0.8, c },
        ]),
        ...spread(12, 64, { x: 3.5, y: 3.5, w: 13, h: 13 }, { c: 'blue', ball: true }),
      ],
    },
  },

  {
    id: 'pirate-treasure',
    category: 'game',
    duration: 8,
    skills: ['dribbling', 'teamwork', 'quick decisions'],
    title: { en: 'Pirate treasure', ro: 'Comoara piraților' },
    summary: {
      en: 'Two teams race to dribble the treasure balls back to their ship, then steal from the other ship.',
      ro: 'Două echipe se întrec să ducă mingile-comoară la corabia lor, apoi fură din corabia rivală.',
    },
    players: { en: '2 teams of 6', ro: '2 echipe de câte 6' },
    space: { en: '20 × 20 m, a 4 × 8 m ship at each end', ro: '20 × 20 m, câte o corabie de 4 × 8 m la capete' },
    equipment: { en: '12 balls, cones for 2 ships and the island, bibs', ro: '12 mingi, conuri pentru 2 corăbii și insulă, veste' },
    setup: {
      en: 'Two teams of six, each with a “ship” (a 4 × 8 m cone rectangle) at opposite ends. Put all 12 balls, the treasure, in a pile on an island in the middle.',
      ro: 'Două echipe de câte șase, fiecare cu o „corabie” (un dreptunghi de conuri de 4 × 8 m) la capete opuse. Puneți toate cele 12 mingi, comoara, într-o grămadă pe insula din mijloc.',
    },
    howTo: {
      en: 'On “Go!” every player runs to the island, takes one ball and dribbles it back to their ship, one ball per trip. When the island is empty they may steal a ball from the other ship. After 90 seconds the team with more balls in its ship wins the round. Play four rounds and rebuild the treasure each time.',
      ro: 'La start, fiecare jucător aleargă la insulă, ia o minge și o driblează înapoi la corabia lui, câte o minge la fiecare drum. Când insula e goală, jucătorii pot fura o minge din corabia celeilalte echipe. După 90 de secunde, echipa cu mai multe mingi în corabie câștigă runda. Jucați patru runde, refăcând comoara de fiecare dată.',
    },
    coaching: [
      { en: 'Keep the ball close when it gets crowded', ro: 'Țineți mingea aproape când e aglomerat' },
      { en: 'Look for the free space', ro: 'Căutați spațiul liber' },
      { en: 'Use both feet', ro: 'Folosiți ambele picioare' },
    ],
    easier: { en: 'No stealing, just empty the island.', ro: 'Fără furat, doar goliți insula.' },
    harder: { en: 'Stolen balls must be dribbled with the weaker foot.', ro: 'Mingile furate se driblează doar cu piciorul mai slab.' },
    rounds: { count: 4, work: 90, rest: 30 },
    diagram: {
      w: 20,
      h: 20,
      legend: { blue: { en: 'Team 1', ro: 'Echipa 1' }, orange: { en: 'Team 2', ro: 'Echipa 2' } },
      items: [
        field(20, 20),
        { t: 'area', x: 0.8, y: 6, w: 4, h: 8, dash: true, label: { en: 'Ship 1', ro: 'Corabia 1' } },
        { t: 'area', x: 15.2, y: 6, w: 4, h: 8, dash: true, label: { en: 'Ship 2', ro: 'Corabia 2' } },
        { t: 'area', x: 8, y: 8, w: 4, h: 4, dash: true, label: { en: 'Treasure', ro: 'Comoara' } },
        ...[0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((r) => ({ t: 'ball', x: 8.8 + c * 0.8, y: 9.2 + r * 0.8 }))),
        ...[7, 9.3, 11.6].flatMap((y) => [
          { t: 'p', c: 'blue', x: 2, y },
          { t: 'p', c: 'blue', x: 3.6, y: y + 1.1 },
          { t: 'p', c: 'orange', x: 16.4, y },
          { t: 'p', c: 'orange', x: 18, y: y + 1.1 },
        ]),
        { t: 'arrow', x1: 4.8, y1: 9, x2: 7.6, y2: 9.5 },
        { t: 'arrow', x1: 15.2, y1: 11, x2: 12.4, y2: 10.5 },
        { t: 'arrow', x1: 7.6, y1: 11.2, x2: 4.8, y2: 11.6, dash: true },
        { t: 'arrow', x1: 12.4, y1: 8.8, x2: 15.2, y2: 8.4, dash: true },
      ],
    },
  },

  {
    id: 'clean-garden',
    category: 'technical',
    duration: 5,
    skills: ['striking the ball', 'accuracy'],
    title: { en: 'Clean the garden', ro: 'Curățăm grădina' },
    summary: {
      en: 'Each team kicks the balls out of its half along the ground. Fewest balls after 60 seconds wins.',
      ro: 'Fiecare echipă lovește mingile din jumătatea ei în cealaltă, pe jos. Câștigă cine are mai puține mingi după 60 de secunde.',
    },
    players: { en: '2 teams of 6', ro: '2 echipe de câte 6' },
    space: { en: '20 × 20 m split in two halves', ro: '20 × 20 m, împărțit în două jumătăți' },
    equipment: { en: '12 balls, a line of cones across the middle', ro: '12 mingi, un rând de conuri la mijloc' },
    setup: { en: 'Split the square into two halves with a line of cones. One team in each half with six balls scattered in each half.', ro: 'Zona de 20 × 20 m împărțită în două jumătăți printr-un rând de conuri. Două echipe de câte șase, câte una în fiecare jumătate, cu șase mingi împrăștiate în fiecare jumătate.' },
    howTo: {
      en: 'On “Go!” each team kicks the balls into the other half along the ground. Nobody crosses the middle line. After 60 seconds call stop: the team with fewer balls in its half wins. Play three or four rounds.',
      ro: 'La start, fiecare echipă lovește mingile în jumătatea cealaltă, pe jos, și nimeni nu trece linia de la mijloc. După 60 de secunde antrenorul strigă stop, iar echipa cu mai puține mingi în jumătatea ei câștigă. Jucați trei sau patru runde.',
    },
    coaching: [
      { en: 'Strike with the laces', ro: 'Loviți cu ristul' },
      { en: 'Standing foot next to the ball', ro: 'Piciorul de sprijin lângă minge' },
      { en: 'Keep the ball on the ground', ro: 'Loviți mingea pe jos' },
      { en: 'Eyes on the target half', ro: 'Ochii la jumătatea țintă' },
    ],
    easier: { en: 'Allow passes with the inside of the foot.', ro: 'Permiteți pase cu interiorul piciorului.' },
    harder: { en: 'Weaker foot only for the last round.', ro: 'Ultima rundă doar cu piciorul mai slab.' },
    rounds: { count: 4, work: 60, rest: 20 },
    diagram: {
      w: 20,
      h: 20,
      legend: { blue: { en: 'Team 1', ro: 'Echipa 1' }, orange: { en: 'Team 2', ro: 'Echipa 2' } },
      items: [
        field(20, 20),
        ...[2, 5, 8, 11, 14, 17].map((y) => ({ t: 'cone', x: 10, y, c: '#f2b705' })),
        ...[3, 6.5, 10, 13.5, 17].map((y, i) => ({ t: 'p', c: 'blue', x: i % 2 ? 6.5 : 3, y })),
        { t: 'p', c: 'blue', x: 4.5, y: 1.6 },
        ...[3, 6.5, 10, 13.5, 17].map((y, i) => ({ t: 'p', c: 'orange', x: i % 2 ? 13.5 : 17, y })),
        { t: 'p', c: 'orange', x: 15.5, y: 18.6 },
        ...[[5, 4.5], [2.5, 8.5], [8, 12.5], [4.5, 15.5], [7.5, 2.8], [2, 12.5]].map(([x, y]) => ({ t: 'ball', x, y })),
        ...[[15, 4.5], [17.5, 8.5], [12, 15.5], [16, 12.5], [12.5, 2.8], [18, 15]].map(([x, y]) => ({ t: 'ball', x, y })),
        { t: 'arrow', x1: 7.6, y1: 6.5, x2: 12.2, y2: 7 },
        { t: 'arrow', x1: 12.4, y1: 13.5, x2: 7.8, y2: 13 },
      ],
    },
  },

  {
    id: '3v3-four-goals',
    category: 'game',
    duration: 16,
    skills: ['game', 'scanning', 'switching play'],
    title: { en: '3 v 3 with four goals', ro: '3 contra 3 cu patru porți' },
    summary: {
      en: 'Each team defends two small goals and can score in either of the other two.',
      ro: 'Fiecare echipă apără două porți și poate marca în oricare dintre celelalte două.',
    },
    players: { en: '6 per pitch', ro: '6 pe teren' },
    space: { en: '20 × 15 m', ro: '20 × 15 m' },
    equipment: { en: '4 small goals per pitch, bibs, spare balls', ro: '4 porți mici pe teren, veste, mingi de rezervă' },
    setup: { en: 'A 20 × 15 m pitch with two small goals on each end line, one near each corner. Three players per team.', ro: 'Un teren de 20 × 15 m cu două porți mici pe fiecare linie de capăt, câte una lângă fiecare colț. Trei jucători pe echipă.' },
    howTo: {
      en: 'Each team defends the two goals on its end line and can score in either goal at the other end. No keepers. With two goals to aim at, children learn to look up and find the free goal.',
      ro: 'Fiecare echipă apără cele două porți de la capătul ei și marchează în oricare dintre cele două de la capătul opus. Fără portari. Cu două porți țintă, copiii învață să ridice privirea și să găsească poarta liberă.',
    },
    coaching: [
      { en: 'Ask: “Which goal is free?”', ro: 'Întrebați: „Care poartă e liberă?”' },
      { en: 'Praise looking up and changing direction', ro: 'Lăudați privirea ridicată și schimbarea direcției' },
      { en: 'Let them make mistakes', ro: 'Lăsați copiii să greșească' },
    ],
    easier: { en: 'Make the goals wider.', ro: 'Porți mai late.' },
    harder: { en: 'Scoring in the goal on the far side counts double.', ro: 'Golul în poarta din partea opusă valorează dublu.' },
    rounds: { count: 2, work: 480, rest: 30 },
    diagram: {
      w: 22,
      h: 15,
      legend: { blue: { en: 'Team 1', ro: 'Echipa 1' }, orange: { en: 'Team 2', ro: 'Echipa 2' } },
      items: [
        { t: 'area', x: 1, y: 0, w: 20, h: 15, pitch: true },
        { t: 'line', x1: 11, y1: 0, x2: 11, y2: 15 },
        { t: 'goal', x: 0.2, y: 1, w: 0.8, h: 2.5 },
        { t: 'goal', x: 0.2, y: 11.5, w: 0.8, h: 2.5 },
        { t: 'goal', x: 21, y: 1, w: 0.8, h: 2.5 },
        { t: 'goal', x: 21, y: 11.5, w: 0.8, h: 2.5 },
        { t: 'p', c: 'blue', x: 5, y: 7.5 },
        { t: 'p', c: 'blue', x: 9, y: 4 },
        { t: 'p', c: 'blue', x: 9, y: 11 },
        { t: 'p', c: 'orange', x: 13, y: 4 },
        { t: 'p', c: 'orange', x: 16, y: 7.5 },
        { t: 'p', c: 'orange', x: 13, y: 11 },
        { t: 'ball', x: 10.4, y: 7.5 },
        { t: 'arrow', x1: 11, y1: 7.2, x2: 20.4, y2: 2.6, dash: true },
        { t: 'arrow', x1: 11, y1: 7.8, x2: 20.4, y2: 12.4, dash: true },
      ],
    },
  },

  {
    id: 'body-part-stop',
    category: 'arrival',
    duration: 4,
    skills: ['ball control', 'coordination', 'fun'],
    title: { en: 'Stop it with…', ro: 'Oprește-o cu…' },
    summary: {
      en: 'Dribble freely; when you call a body part, stop the ball with it.',
      ro: 'Dribling liber; când strigați o parte a corpului, copiii opresc mingea cu ea.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: L.ballEach,
    setup: { en: 'One ball each in the 20 × 20 m square.', ro: 'Câte o minge fiecare, în zona de 20 × 20 m.' },
    howTo: {
      en: 'Everyone dribbles. Call a body part (“Knee!”, “Bum!”, “Elbow!”, “Sole!”) and they stop the ball by putting that part on it. The last one is the silliest, so it always gets a laugh.',
      ro: 'Toți driblează. Strigați o parte a corpului („Genunchiul!”, „Fundul!”, „Cotul!”, „Talpa!”) și copiii opresc mingea punând acea parte pe ea. Cea mai caraghioasă comandă aduce mereu zâmbete.',
    },
    coaching: [
      { en: 'Keep the ball close so you can stop it fast', ro: 'Mingea aproape ca s-o poți opri repede' },
      { en: 'Head up between calls', ro: 'Capul sus între comenzi' },
      { en: 'Praise the quickest stop', ro: 'Lăudați cea mai rapidă oprire' },
    ],
    easier: { en: 'Use only sole and knee.', ro: 'Doar talpa și genunchiul.' },
    harder: { en: 'Add “Turn!”: drag the ball back and go the other way.', ro: 'Adăugați „Întoarce!”: tragi mingea înapoi și pleci în sens opus.' },
    calls: [
      { en: 'Sole!', ro: 'Talpa!' },
      { en: 'Knee!', ro: 'Genunchiul!' },
      { en: 'Bum!', ro: 'Fundul!' },
      { en: 'Elbow!', ro: 'Cotul!' },
      { en: 'Heel!', ro: 'Călcâiul!' },
      { en: 'Turn!', ro: 'Întoarce!' },
    ],
    diagram: { w: 20, h: 20, items: [field(20, 20), ...spread(12, 88, { x: 1, y: 1, w: 18, h: 18 }, { c: 'blue', ball: true })] },
  },

  {
    id: 'gate-dribble',
    category: 'technical',
    duration: 5,
    skills: ['dribbling', 'changing direction'],
    title: { en: 'Gate dribbling', ro: 'Dribling prin porți' },
    summary: {
      en: 'Dribble through as many cone gates as you can in 60 seconds.',
      ro: 'Driblează prin cât mai multe porți din conuri în 60 de secunde.',
    },
    players: L.kids12,
    space: L.square20,
    equipment: { en: 'One ball each, about 20 cones for 10 gates', ro: 'Câte o minge fiecare, circa 20 de conuri pentru 10 porți' },
    setup: { en: 'Scatter about 10 cone gates, 1.5 m wide, around the square.', ro: 'Împrăștiați circa 10 porți din conuri, de 1,5 m lățime, în zonă.' },
    howTo: {
      en: 'Each child dribbles through as many gates as possible in 60 seconds, counting out loud. Never the same gate twice in a row. Rest, then try to beat your number.',
      ro: 'Fiecare copil driblează prin cât mai multe porți în 60 de secunde, numărând cu voce tare. Niciodată aceeași poartă de două ori la rând. Pauză, apoi încearcă să-ți depășești numărul.',
    },
    coaching: [
      { en: 'Look up to find the next free gate', ro: 'Privirea sus ca să găsești următoarea poartă liberă' },
      { en: 'Slow down before the gate, speed up after it', ro: 'Încetinește înainte de poartă, accelerează după' },
      { en: 'Turn with the outside of the foot', ro: 'Întoarce-te cu exteriorul piciorului' },
    ],
    easier: { en: 'Wider gates and walking pace.', ro: 'Porți mai late și ritm de mers.' },
    harder: { en: 'Coach stands in a gate to close it; find another.', ro: 'Antrenorul stă într-o poartă și o închide; găsiți alta.' },
    rounds: { count: 3, work: 60, rest: 30 },
    diagram: {
      w: 20,
      h: 20,
      items: [
        field(20, 20),
        ...[
          [4, 4, 0], [10, 3, 90], [16, 4.5, 0], [6.5, 9.5, 90], [13.5, 9, 0],
          [3.5, 15, 90], [10, 14, 0], [16.5, 15.5, 90], [8, 18, 0], [17, 10.5, 90],
        ].map(([x, y, rot]) => ({ t: 'gate', x, y, rot })),
        ...[
          [2.2, 5.6, -0.7], [8.4, 5, 0.2], [12.2, 6.2, -1.2], [15.4, 12, 2.4], [5, 12, -2],
          [11.2, 11.6, 1.2], [6.4, 16.6, 0.3], [13.4, 17.4, -0.4], [17.8, 7.4, 1.8],
        ].map(([x, y, dir]) => ({ t: 'p', c: 'blue', x, y, ball: true, dir })),
      ],
    },
  },

  {
    id: 'water-break',
    category: 'break',
    duration: 2,
    skills: ['rest'],
    title: { en: 'Water break', ro: 'Pauză de apă' },
    summary: {
      en: 'Drink, catch your breath, and listen to the next game.',
      ro: 'Apă, odihnă și ascultarea următorului joc.',
    },
    players: L.kids12,
    space: { en: 'By the bottles', ro: 'La sticlele cu apă' },
    equipment: { en: 'Water bottles', ro: 'Sticle cu apă' },
    setup: { en: 'Bottles lined up in one spot, away from the pitches.', ro: 'Sticlele așezate într-un singur loc, departe de terenuri.' },
    howTo: {
      en: 'Everyone drinks. Use the last 30 seconds to explain the next activity while they are gathered, and to set up cones or pick teams.',
      ro: 'Toți beau apă. Folosiți ultimele 30 de secunde ca să explicați activitatea următoare cât timp sunt adunați și ca să pregătiți conurile sau echipele.',
    },
    coaching: [
      { en: 'Explain the next game in under 20 seconds', ro: 'Explicați următorul joc în cel mult 20 de secunde' },
      { en: 'Demonstrate first, then let them play', ro: 'Demonstrați mai întâi, apoi lăsați-i să joace' },
      { en: 'Cold weather: keep it short and keep them moving', ro: 'Pe vreme rece: pauze scurte și copiii în mișcare' },
      { en: 'Make the new teams now', ro: 'Faceți acum echipele noi' },
    ],
  },
];

/** Coach notes that apply to the whole session, shown on the run screen. */
export const GENERAL_TIPS = [
  { en: 'Instructions: 20 seconds at most. Demonstrate first, then let them play.', ro: 'Instrucțiuni: cel mult 20 de secunde. Demonstrați mai întâi, apoi lăsați-i să joace.' },
  { en: 'No queues: never more than 3–4 children waiting. If a queue forms, add a ball or a goal.', ro: 'Fără cozi: niciodată mai mult de 3–4 copii care așteaptă. Dacă se formează o coadă, adăugați o minge sau o poartă.' },
  { en: 'No elimination: every game keeps all children playing.', ro: 'Fără eliminări: fiecare joc îi ține pe toți copiii în joc.' },
  { en: 'Praise effort: brave tries, passes to a friend, mistakes made trying something new.', ro: 'Lăudați efortul: încercările curajoase, pasele către un prieten și greșelile făcute încercând ceva nou.' },
  { en: 'Quieter children: pair them with a friendly partner and give them early touches.', ro: 'Copiii mai timizi: puneți-i cu un partener prietenos și dați-le atingeri devreme.' },
  { en: 'Safety: soft cones, clear stray balls, spare balls behind the goals.', ro: 'Siguranță: conuri moi, curățați terenurile de mingi rătăcite, mingile de rezervă în spatele porților.' },
];

/** The 60-minute U7 plan from the club PDF, used to seed a first session. */
export const SAMPLE_PLAN = {
  name: { en: 'U7 · 60 min · Lots of touches', ro: 'U7 · 60 min · Multe atingeri de minge' },
  team: 'U7',
  target: 60,
  focus: {
    en: 'Lots of touches, fun, first steps in dribbling, passing and shooting with both feet.',
    ro: 'Multe atingeri de minge, distracție și primii pași în dribling, pase și șuturi cu ambele picioare.',
  },
  blocks: [
    ['free-dribble', 5],
    ['traffic-light', 3],
    ['sharks-minnows', 7],
    ['water-break', 2],
    ['gate-passing', 5],
    ['goal-attack', 5],
    ['water-break', 2],
    ['3v3-two-pitches', 25],
    ['finale-shoot-coach', 6],
  ],
};
