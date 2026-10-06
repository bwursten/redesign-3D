/* ============================================================
   Scout Life 3D Camp prototype: content data
   Real titles/links from scoutlife.org (Oct 2026). In production
   this comes from the camp REST feed (pinned + latest per building).
   ============================================================ */
const IMG = (p) => `https://i0.wp.com/scoutlife.org/wp-content/uploads/${p}?resize=400%2C225&ssl=1`;
const SL = 'https://scoutlife.org';

const SECTIONS = {
  jokes:    { name: 'Jokes',              color: '#F26B21', url: 'https://jokes.scoutlife.org/' },
  games:    { name: 'Games',              color: '#2B7FD0', url: SL + '/games/' },
  hobbies:  { name: 'Hobbies & Projects', color: '#B7791F', url: SL + '/section/hobbies-projects/' },
  outdoors: { name: 'Outdoors & Gear',    color: '#1F5C3A', url: SL + '/section/outdoors/' },
  scouts:   { name: 'Scouts',             color: '#6A3FB5', url: SL + '/section/about-scouts/scouting-around/' },
  features: { name: 'Features',           color: '#C2185B', url: SL + '/' }
};

const BUILDINGS = [
  {
    id: 'campfire', name: 'Campfire Ring', section: 'jokes', icon: '🔥', widget: 'joke',
    pos: [0, 0], blurb: 'Pull up a log! Jokes, comics and silly stuff around the fire.',
    pinned: [
      { t: '101 Funny Halloween Jokes and Comics', u: SL + '/features/23079/funny-halloween-jokes/', img: IMG('2018/10/halloween-feature.jpg') }
    ],
    latest: [
      { t: 'Joke of the Day: Keys to Unlock a Banana', u: 'https://jokes.scoutlife.org/jokes/keys-to-unlock-a-banana/' },
      { t: 'Write a Funny Caption For This Photo', u: SL + '/games/write-a-funny-caption/192217/write-a-funny-caption-for-this-photo-175/', img: IMG('2026/09/funnycaption-feature.jpg') },
      { t: 'Wacky Adventures Comic', u: SL + '/wacky-adventures/' },
      { t: 'Pee Wee Harris Comic', u: SL + '/peewee/' },
      { t: '25 Funny Fish Jokes', u: 'https://fishing.scoutlife.org/25-funny-fish-jokes/' }
    ]
  },
  {
    id: 'gametent', name: 'Game Tent', section: 'games', icon: '🎮', widget: 'arcade',
    pos: [8, -5], blurb: 'Games, quizzes and the Scout Life Arcade.',
    pinned: [
      { t: 'How Much Do You Know About the Multisport Merit Badge?', u: SL + '/quizzes/191897/how-much-do-you-know-about-the-multisport-merit-badge/', img: IMG('2026/08/multisport-featured.jpg') }
    ],
    latest: [
      { t: 'Bike Blitz', u: SL + '/games/mobile-games/178477/bike-blitz/', img: IMG('2023/04/bikeblitz.jpg') },
      { t: 'Who Would Win? KPop Demon Hunters or Pokémon?', u: SL + '/quizzes/191435/who-would-win-kpop-demon-hunters-or-pokemon/' },
      { t: 'Tiger’s Backyard Bounce', u: SL + '/games/mobile-games/137281/tigers-backyard-bounce/' },
      { t: '‘You Make the Call’ Baseball Umpire Quiz', u: SL + '/quizzes/140566/you-make-the-call-baseball-umpire-quiz/' },
      { t: 'Dredd Speed’s Cosmic Air Hockey', u: SL + '/games/mobile-games/161644/dredd-speeds-cosmic-air-hockey/' }
    ]
  },
  {
    id: 'crafthut', name: 'Craft Hut', section: 'hobbies', icon: '🔨', widget: 'idea',
    pos: [-8, -5], blurb: 'Projects, crafts and things to build. Crank the Idea Machine!',
    pinned: [
      { t: 'How to Make a Ghost Decoration Using a Cardboard Tube', u: SL + '/hobbies-projects/projects/192234/how-to-make-a-ghost-decoration-using-a-cardboard-tube/', img: IMG('2026/09/ghost-featured.jpg') }
    ],
    latest: [
      { t: 'How to Make a Faux Stained-Glass Pumpkin', u: SL + '/hobbies-projects/projects/182598/how-to-make-a-faux-stained-glass-pumpkin/' },
      { t: 'Learn Morse Code With This Morse Translator and Decoder', u: SL + '/hobbies-projects/funstuff/575/morse-code-translator/', img: IMG('2007/02/morsecode-1.jpg') },
      { t: '10 Amazing Duct-Tape Creations You Can Make Right Now', u: SL + '/hobbies-projects/funstuff/157997/10-amazing-duct-tape-creations-you-can-make-right-now/' },
      { t: 'How to Make Invisible Ink for Writing Top-Secret Messages', u: SL + '/hobbies-projects/funstuff/162663/how-to-make-invisible-ink-for-writing-top-secret-messages/' },
      { t: 'How to Make a Fast Pinewood Derby Car', u: SL + '/hobbies-projects/projects/2952/fast-pinewood-derby-car/' }
    ]
  },
  {
    id: 'quartermaster', name: 'Quartermaster Cabin', section: 'outdoors', icon: '🎒', widget: 'gear',
    pos: [8, 6], blurb: 'Check out gear, outdoor skills and critters of the wild.',
    pinned: [
      { t: 'Recommended Gear for a Philmont Backpacking Trek', u: SL + '/outdoors/ask-the-gear-guy/192253/recommended-gear-for-a-philmont-backpacking-trek/' }
    ],
    latest: [
      { t: 'Creepy But Cool: These 5 Critters Are More Helpful Than Scary', u: SL + '/outdoors/animals-and-nature/192183/creepy-but-cool-these-5-critters-are-more-helpful-than-scary/', img: IMG('2026/09/creepycrawlies-feature.jpg') },
      { t: 'Stuff We Like: NEMO Double Haul', u: SL + '/outdoors/ask-the-gear-guy/192272/stuff-we-like-nemo-double-haul/' },
      { t: 'How Do I Prevent Blisters?', u: SL + '/outdoors/ask-the-gear-guy/192248/how-do-i-prevent-blisters/' },
      { t: 'How to Buy a Backpacking Stove For Your Next Camping Adventure', u: SL + '/outdoors/guygear/3315/backpacking-stoves-buying-guide/' },
      { t: 'Create an Emergency Pack or Kit', u: SL + '/outdoors/outdoorarticles/16727/create-an-emergency-pack-or-kit/' }
    ]
  }
];

/* "Today at Camp" strip: hand-picked. building = marker in camp (or null) */
const PROMOS = [
  { big: true, t: 'How to Make a Ghost Decoration Using a Cardboard Tube', dek: 'A spooky-cute project you can finish in an afternoon.', sec: 'hobbies', flag: 'SEASONAL', building: 'crafthut', u: BUILDINGS[2].pinned[0].u, img: IMG('2026/09/ghost-featured.jpg') },
  { t: 'Creepy But Cool: These 5 Critters Are More Helpful Than Scary', sec: 'outdoors', flag: 'NEW', building: 'quartermaster', u: BUILDINGS[3].latest[0].u, img: IMG('2026/09/creepycrawlies-feature.jpg') },
  { t: 'Bike Blitz', sec: 'games', flag: 'PLAY', building: 'gametent', u: BUILDINGS[1].latest[0].u, img: IMG('2023/04/bikeblitz.jpg') },
  { t: '101 Funny Halloween Jokes and Comics', sec: 'jokes', flag: 'HOT', building: 'campfire', u: BUILDINGS[0].pinned[0].u, img: IMG('2018/10/halloween-feature.jpg') },
  { t: 'Let’s Talk to the Author of ‘Diary of a Wimpy Kid’', sec: 'features', building: null, u: SL + '/features/192278/lets-talk-to-the-author-of-diary-of-a-wimpy-kid/', img: IMG('2026/09/jeff-kinney-wimpy-kid.jpg') }
];

/* Joke widget */
const JOTD = { lines: [['WILLIAM', 'What keys unlock a banana?'], ['EMMA', 'What?'], ['WILLIAM', 'Monkeys.']], credit: 'Joke of the Day from jokes.scoutlife.org', u: 'https://jokes.scoutlife.org/jokes/keys-to-unlock-a-banana/' };
const JOKES = {
  'Animals': [[['Q', 'What do you call a bear with no teeth?'], ['A', 'A gummy bear.']], [['Q', 'Why do fish live in salt water?'], ['A', 'Because pepper makes them sneeze.']], [['Q', 'What do you call a sleeping dinosaur?'], ['A', 'A dino-snore.']]],
  'Food': [[['Q', 'Why did the cookie go to the doctor?'], ['A', 'It felt crummy.']], [['Q', 'What do you call cheese that isn’t yours?'], ['A', 'Nacho cheese.']], [['Q', 'Why did the banana go to the doctor?'], ['A', 'It wasn’t peeling well.']]],
  'Knock-Knock': [[['', 'Knock knock.'], ['', 'Who’s there?'], ['', 'Lettuce.'], ['', 'Lettuce who?'], ['', 'Lettuce in, it’s cold out here!']], [['', 'Knock knock.'], ['', 'Who’s there?'], ['', 'Boo.'], ['', 'Boo who?'], ['', 'Don’t cry, it’s just a joke!']]],
  'Camping': [[['Q', 'Why don’t mountains get cold?'], ['A', 'They wear snowcaps.']], [['Q', 'What did the tent say to the camper?'], ['A', 'You’re in-tents!']], [['Q', 'How do trees get online?'], ['A', 'They log in.']]],
  'Monsters': [[['Q', 'Why didn’t the skeleton go to the dance?'], ['A', 'He had no body to go with.']], [['Q', 'What’s a ghost’s favorite dessert?'], ['A', 'I-scream.']]],
  'School': [[['Q', 'Why did the student eat his homework?'], ['A', 'The teacher said it was a piece of cake.']], [['Q', 'What’s a math teacher’s favorite place?'], ['A', 'Times Square.']]]
};

/* Arcade widget */
const GAMES = [
  { t: 'Bike Blitz', u: SL + '/games/mobile-games/178477/bike-blitz/', c1: '#3FA9F5', c2: '#FFC629', sprite: 'bike' },
  { t: 'Tiger’s Backyard Bounce', u: SL + '/games/mobile-games/137281/tigers-backyard-bounce/', c1: '#9BE15D', c2: '#F26B21', sprite: 'bounce' },
  { t: 'Pee Wee’s Basketball Madness', u: SL + '/games/mobile-games/139995/pee-wees-basketball-madness/', c1: '#1A1440', c2: '#F26B21', sprite: 'ball' },
  { t: 'Dredd Speed’s Cosmic Air Hockey', u: SL + '/games/mobile-games/161644/dredd-speeds-cosmic-air-hockey/', c1: '#1A1440', c2: '#00E5FF', sprite: 'puck' }
];

/* Idea Machine pool (type → icon) */
const IDEA_ICONS = { craft: '✂️', science: '🧪', outdoors: '⛺', art: '🎨', recipe: '🧑‍🍳', build: '🔨' };
const IDEAS = [
  { type: 'craft', t: 'Make a Ghost Decoration From a Cardboard Tube', time: '30 min', u: BUILDINGS[2].pinned[0].u },
  { type: 'science', t: 'Make Invisible Ink for Top-Secret Messages', time: '20 min', u: BUILDINGS[2].latest[3].u },
  { type: 'science', t: 'Learn Morse Code With the Morse Translator', time: '15 min', u: BUILDINGS[2].latest[1].u },
  { type: 'outdoors', t: 'Make a DIY Survival Kit', time: '45 min', u: SL + '/hobbies-projects/projects/180051/how-to-make-a-diy-survival-kit/' },
  { type: 'art', t: 'Make a Faux Stained-Glass Pumpkin', time: '1 hr', u: BUILDINGS[2].latest[0].u },
  { type: 'build', t: 'Build a Backyard Mini Golf Course', time: 'Weekend', u: SL + '/hobbies-projects/projects/718/fore/' },
  { type: 'build', t: 'Make a Fast Pinewood Derby Car', time: 'Weekend', u: BUILDINGS[2].latest[4].u },
  { type: 'craft', t: '10 Amazing Duct-Tape Creations', time: '30 min', u: BUILDINGS[2].latest[2].u },
  { type: 'recipe', t: 'Find a Camp Cooking Recipe', time: '30 min', u: SL + '/?s=recipe' }
];

/* Gear Guide widget */
const GEAR = [
  { type: 'Ask the Gear Guy', t: 'Recommended Gear for a Philmont Backpacking Trek', q: 'I’m going backpacking at Philmont and need new gear. What do you recommend?', u: BUILDINGS[3].pinned[0].u },
  { type: 'Stuff We Like', t: 'NEMO Double Haul', u: BUILDINGS[3].latest[1].u },
  { type: 'Ask the Gear Guy', t: 'How Do I Prevent Blisters?', q: 'My feet get blisters on every hike. Help!', u: BUILDINGS[3].latest[2].u },
  { type: 'Buying Guide', t: 'How to Buy a Backpacking Stove', u: BUILDINGS[3].latest[3].u },
  { type: 'Buying Guide', t: 'Expert’s Guide to Trail-Running Gear', u: SL + '/outdoors/2410/trail-running/' }
];

/* Section shelves (Widget Zone 3) */
const SHELVES = [
  { name: 'Scouting Around', sec: 'scouts', u: SL + '/section/about-scouts/scouting-around/', items: [
    ['Use the Compass Game to Improve Your Navigation Skills', SL + '/about-scouts/scouting-around/191944/use-the-compass-game-to-improve-your-navigation-skills/'],
    ['Scouts Go the Extra Mile With the Multisport Merit Badge', SL + '/about-scouts/scouting-around/192163/scouts-go-the-extra-mile-with-the-multisport-merit-badge/'],
    ['Four Creative Fundraising Ideas for Scout Troops', SL + '/about-scouts/scouting-around/191970/creative-fundraisers/']] },
  { name: 'Fishing', sec: 'outdoors', u: 'https://fishing.scoutlife.org/', items: [
    ['8 Fishing Knots to Know', 'https://fishing.scoutlife.org/8-fishing-knots-to-know/'],
    ['Name That Fish Quiz', 'https://fishing.scoutlife.org/name-that-fish-quiz/'],
    ['25 Funny Fish Jokes', 'https://fishing.scoutlife.org/25-funny-fish-jokes/']] },
  { name: 'Pinewood Derby', sec: 'hobbies', u: SL + '/pinewood-derby/', items: [
    ['Take a Look at Fun KPop Demon Hunters Pinewood Derby Cars', SL + '/hobbies-projects/pinewood-derby/191553/take-a-look-at-awesome-kpop-demon-hunters-pinewood-derby-cars/'],
    ['The Outstanding Pinewood Derby Cars in Our 2026 Hall of Fame', SL + '/hobbies-projects/pinewood-derby/188756/rev-up-your-imagination-with-these-awesome-pinewood-derby-cars-of-2026/'],
    ['How to Make a Fast Pinewood Derby Car', SL + '/hobbies-projects/projects/2952/fast-pinewood-derby-car/']] },
  { name: 'Eagle Projects', sec: 'scouts', u: 'https://eagleprojects.scoutlife.org/', items: [
    ['Organized STEM Discovery Day', 'https://eagleprojects.scoutlife.org/stem-discovery-day/'],
    ['Restored Eroded Riverbank', 'https://eagleprojects.scoutlife.org/taking-back-the-riverbank-livestaking/'],
    ['Improved Tropical Audubon Society’s Property', 'https://eagleprojects.scoutlife.org/eagles-working-for-the-birds-tropical-audubon-society/']] },
  { name: 'Fiction', sec: 'features', u: 'https://fiction.scoutlife.org/', items: [
    ['Stolen Treasure', 'https://fiction.scoutlife.org/stolen-treasure/'],
    ['Jason and the Argonauts', 'https://fiction.scoutlife.org/jason-and-the-argonauts/'],
    ['The Sunjammer', 'https://fiction.scoutlife.org/the-sunjammer/']] }
];

const SUBSCRIBE = (c) => `https://subscribe.scoutlife.org/subscribe/sl?utm_source=scoutlife&utm_medium=web&utm_campaign=${c}`;
