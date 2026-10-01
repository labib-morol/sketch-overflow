// SketchOverflow word bank — CSE / Engineering focused + general fillers.
// No repeats: each room draws from a shuffled "bag" and tracks used words.

// ─────────────────────────────────────────────────────────────────────────────
// CLASSMATES — transcribed from Labib's class list screenshot.
// ⚠️ EDIT THIS LIST if any spelling is off (OCR of the screenshot may have
//    mangled a few names — fix them here, then restart the server).
// ─────────────────────────────────────────────────────────────────────────────
const CLASSMATES = [
  'Md Nabil Hasan', 'Jamir Alam Sohan', 'Jannatul Ferdaus', 'Md Labib Morol',
  'Parneendu Bank', 'Md Tusiar Alam Chowdhury', 'Shaan Md Nafees West',
  'Md Reon Reham Tahabir', 'Md Ifthikar Islam Sizpon', 'Indrojit Adhikary',
  'Rudojit Sarkar', 'Arie Jabin Moumita', 'Md Mehedi Hasan', 'Ayham Saad Hossain',
  'Md Sayem Sheikh', 'Afran Amitk', 'Md Montasir Mubin', 'Jakia Nusrat Kamal Era',
  'Junayed Ahmed Saad', 'Jannatul Muminat Tahin', 'Md Mahfuzur Rahman Nafis',
  'Mahbub E Ahad', 'Abraray Ahsin', 'Anmadul Haque Tanvir',
  'Md Shamil Yossar Hossain Shanto', 'Asmadul Haq Ehsn', 'Md Ibrahim Ul Haque',
  'Muzhtab Ahamed', 'Md Sohrul Islam Sohaj', 'Md Shyam Saddad',
  'Md Mubir Hossain', 'Md Rakib Sarjar', 'Shakil Hasan', 'Sanjida Tahmina Zamin',
  'Sanjida Mahamud', 'Md Jannaul Abedin', 'Safwan Muhtasim', 'Hasnin Adhab',
  'Abid Hasan', 'Tahfim Al Azim', 'Rupaiya Saha Anpta', 'Md Ali Hossain',
  'Rawwar Tanvir Dihan'
];

const BANK = {
  cse: {
    easy: [
      'keyboard', 'mouse cursor', 'monitor', 'laptop', 'usb drive', 'headphones', 'printer', 'power button',
      'loading bar', 'error message', 'copy paste', 'password', 'login screen', 'wifi signal', 'bluetooth',
      'screenshot', 'emoji', 'download arrow', 'trash bin', 'folder icon', 'file icon', 'search bar',
      'notification bell', 'battery icon', 'airplane mode', 'dark mode', 'popup ad', 'spam email',
      'caps lock', 'enter key', 'space bar', 'ctrl alt delete', 'blue screen', 'hacker hoodie', 'captcha',
      'barcode', 'qr code', 'scroll bar', 'settings gear', 'volume icon', 'play button', 'webcam',
      'touch screen', 'stylus pen', 'sd card', 'sim card', 'ethernet port', 'restart button',
      'computer', 'computer mouse', 'mouse pad', 'desktop computer', 'smartphone', 'selfie stick',
      'memory card', 'pen drive', 'web camera', 'projector', 'loudspeaker', 'remote control',
      'digital clock', 'stopwatch', 'calculator', 'typewriter', 'landline phone', 'floppy disk',
      'cassette tape', 'video game controller', 'atm machine', 'television', 'youtube',
      'google search', 'whatsapp', 'instagram', 'electric switch', 'extension board',
      'emergency light', 'voltage stabilizer'
    ],
    medium: [
      'CPU', 'GPU', 'RAM stick', 'motherboard', 'hard disk', 'SSD', 'heat sink', 'cooling fan', 'power supply',
      'server rack', 'data center', 'circuit board', 'resistor', 'capacitor', 'transistor', 'LED', 'breadboard',
      'multimeter', 'soldering iron', 'oscilloscope', 'flowchart', 'algorithm', 'binary code', 'data table',
      'database', 'spreadsheet', 'command line', 'terminal window', 'code editor', 'whiteboard diagram',
      'bug in code', 'software patch', 'antivirus', 'firewall', 'encryption key', 'phishing email',
      'email inbox', 'chat bubble', 'video call', 'live stream', 'cloud storage', 'upload arrow',
      'ethernet cable', 'LAN cable', 'router', 'modem', 'hotspot', 'joystick', 'gamepad', 'VR headset',
      'motion sensor', 'GPS map', 'self driving car', 'electric car', 'charging station', 'power bank',
      'smartwatch', 'drone', '3D printer', 'robotic arm', 'barcode scanner', 'fingerprint scanner',
      'CCTV camera', 'smart tv', 'linux penguin', 'commit graph', 'uml diagram', 'network switch',
      'logic gates', 'truth table', 'state machine', 'signal tower', 'satellite dish', 'raspberry pi',
      'arduino board', 'drone propeller', 'mechanical keyboard', 'graphics tablet'
    ],
    hard: [
      'recursion', 'infinite loop', 'stack overflow', 'memory leak', 'null pointer', 'deadlock',
      'race condition', 'hash map', 'binary tree', 'linked list', 'sorting algorithm', 'binary search',
      'big O notation', 'merge conflict', 'pull request', 'git blame', 'rubber duck debugging',
      'pair programming', 'code review', 'technical debt', 'spaghetti code', 'hello world',
      'segmentation fault', 'kernel panic', 'distributed system', 'load balancer', 'microservices',
      'virtual machine', 'container', 'docker whale', 'kubernetes', 'machine learning', 'neural network',
      'deep learning', 'chatbot', 'recommendation engine', 'blockchain', 'bitcoin mining', 'smart contract',
      'cryptography', 'public key', 'two factor authentication', 'man in the middle attack',
      'SQL injection', 'buffer overflow', 'brute force attack', 'packet sniffer', 'port scanner',
      'denial of service', 'capture the flag', 'white hat hacker', 'onion routing', 'subnet mask',
      'IP address', 'DNS lookup', 'domain name', 'TCP handshake', 'latency', 'bandwidth', 'packet loss',
      'network topology', 'mesh network', 'star topology', 'client server', 'peer to peer', 'API gateway',
      'REST API', 'webhook', 'websocket', 'JSON file', 'regex pattern', 'compiler', 'interpreter',
      'bytecode', 'garbage collection', 'dynamic typing', 'exception handling', 'try catch block',
      'breakpoint', 'unit test', 'integration test', 'continuous integration', 'deployment pipeline',
      'version control', 'staging server', 'production bug', 'hotfix patch', 'feature branch', 'code freeze',
      'open source', 'agile sprint', 'kanban board', 'standup meeting', 'turing machine',
      'finite state machine', 'quantum computing', 'qubit', 'superposition', 'kalman filter',
      'PID controller', 'feedback loop', 'fourier transform', 'overfitting', 'gradient descent',
      'backpropagation', 'training data', 'decision tree', 'support vector', 'clustering', 'tokens',
      'compiler warning', 'runtime error', 'infinite recursion', 'cache hit', 'race to idle',
      'watchdog timer', 'interrupt handler', 'bootloader', 'firmware update', 'opcode', 'assembly code'
    ]
  },
  engg: {
    easy: [
      'hammer', 'screwdriver', 'wrench', 'nails', 'hand saw', 'power drill', 'ladder', 'gear', 'wheel',
      'pulley', 'lever', 'spring', 'magnet', 'battery', 'light bulb', 'wire coil', 'fuse', 'switch',
      'candle', 'flashlight', 'toolbox', 'ruler', 'compass', 'protractor', 'pencil sharpener', 'glue gun',
      'tape measure', 'safety helmet', 'work gloves', 'safety goggles', 'bridge', 'tunnel', 'dam', 'crane',
      'forklift', 'tractor', 'bulldozer', 'excavator', 'dump truck', 'concrete mixer', 'traffic light',
      'road roller', 'water pump', 'bucket', 'broom', 'fence', 'roof', 'chimney', 'stairs', 'escalator',
      'elevator', 'clock tower', 'windmill', 'watermill', 'water well', 'anchor', 'lighthouse',
      'fire hydrant', 'fire extinguisher', 'hinge', 'padlock', 'chain', 'hook', 'rope knot', 'barrel',
      'funnel', 'valve handle', 'faucet', 'shower head', 'radiator', 'thermostat', 'smoke alarm',
      'power socket', 'extension cord', 'circuit breaker panel',
      'scissors', 'stapler', 'paper clip', 'bottle opener', 'can opener', 'corkscrew',
      'rubber band', 'spirit level', 'sandpaper', 'paint roller', 'shovel', 'pickaxe',
      'wheelbarrow', 'lawn mower', 'hacksaw', 'nut and bolt', 'wedge', 'ramp', 'crowbar',
      'sledgehammer', 'screw jack'
    ],
    medium: [
      'piston', 'turbine', 'engine block', 'gearbox', 'pipe wrench', 'solar panel', 'wind turbine',
      'electric motor', 'generator', 'transformer', 'fuse box', 'conveyor belt', 'hydraulic press',
      'pneumatic cylinder', 'printer nozzle', 'laser cutter', 'lathe machine', 'milling machine',
      'drill press', 'bench vise', 'caliper', 'micrometer', 'blueprint', 'drafting table', 'truss bridge',
      'suspension bridge', 'cantilever beam', 'arch dam', 'cooling tower', 'water tank', 'irrigation canal',
      'retaining wall', 'scaffolding', 'rivet', 'ball bearing', 'camshaft', 'crankshaft', 'fuel injector',
      'alternator', 'shock absorber', 'disc brake', 'drum brake', 'gear shift', 'spark plug',
      'exhaust pipe', 'air filter', 'oil filter', 'tyre tread', 'spare wheel', 'jack stand', 'torque wrench',
      'pressure gauge', 'flow meter', 'solder wire', 'heat gun', 'wire stripper', 'multimeter probes',
      'robotic gripper', 'stepper motor', 'servo motor', 'belt drive', 'chain drive', 'sprocket',
      'universal joint', 'leaf spring', 'differential gear', 'flywheel', 'centrifuge', 'distillation column'
    ],
    hard: [
      'heat exchanger', 'control system', 'entropy', 'thermodynamics', 'newtons cradle', 'magnetic field',
      'electric field', 'electromagnetic wave', 'laser beam', 'fiber optics', 'semiconductor',
      'superconductor', 'nanotechnology', 'airfoil', 'drag force', 'lift force', 'thrust vectoring',
      'gyroscope precession', 'torque', 'shear force', 'bending moment', 'stress strain curve',
      'youngs modulus', 'hookes law', 'fulcrum', 'moment of inertia', 'centrifugal force',
      'coriolis effect', 'sonar', 'radar screen', 'jet engine', 'rocket nozzle', 'fuel tank',
      'payload fairing', 'satellite orbit', 'space station', 'rover on mars', 'heat shield',
      'parachute deploy', 'wind tunnel', 'vacuum chamber', 'refrigeration cycle', 'boiler',
      'steam turbine', 'nuclear reactor', 'control rod', 'solar tracker', 'photovoltaic cell',
      'induction motor', 'synchronous motor', 'transformer coil', 'rectifier circuit', 'amplifier',
      'oscillator circuit', 'antenna tower', 'signal modulation', 'multiplexer', 'flip flop circuit',
      'seven segment display', 'arithmetic logic unit', 'microcontroller', 'embedded system',
      'PLC panel', 'SCADA system', 'closed loop control', 'open loop system', 'damping',
      'resonance', 'vibration mode', 'fatigue crack', 'weld seam', 'CNC machine', 'tolerance stack',
      'section modulus', 'buckling column', 'truss analysis', 'free body diagram', 'fin efficiency',
      'compressor stage', 'nozzle throat', 'impeller', 'draft tube', 'penstock', 'surge tank'
    ]
  },
  general: {
    easy: [
      'cat', 'dog', 'fish', 'bird', 'elephant', 'giraffe', 'penguin', 'dolphin', 'shark', 'octopus',
      'butterfly', 'spider web', 'bee hive', 'turtle', 'snail', 'frog', 'crocodile', 'zebra', 'kangaroo',
      'koala', 'panda', 'tiger', 'lion', 'monkey', 'owl', 'eagle', 'parrot', 'flamingo', 'peacock',
      'bat', 'fox', 'wolf', 'bear', 'deer', 'horse', 'cow', 'pig', 'sheep', 'goat', 'duck', 'chicken',
      'sunflower', 'rose', 'cactus', 'palm tree', 'pine tree', 'mushroom', 'clover', 'maple leaf',
      'rainbow', 'tornado', 'volcano', 'island', 'desert', 'jungle', 'waterfall', 'river', 'lake',
      'ocean wave', 'snowflake', 'icicle', 'cloud', 'lightning', 'hurricane', 'earthquake', 'meteor',
      'comet', 'galaxy', 'planet', 'astronaut', 'alien', 'UFO', 'castle', 'palace', 'temple', 'pyramid',
      'igloo', 'tent', 'cabin', 'skyscraper', 'statue', 'fountain', 'bench', 'street lamp', 'mailbox',
      'suitcase', 'backpack', 'umbrella', 'sunglasses', 'top hat', 'crown', 'necklace', 'ring', 'watch',
      'belt', 'shoe', 'sock', 'scarf', 'apron', 'pizza slice', 'hamburger', 'hot dog', 'taco', 'sushi',
      'noodles', 'pancakes', 'waffle', 'donut', 'cupcake', 'ice cream cone', 'popsicle', 'lollipop',
      'candy cane', 'chocolate bar', 'popcorn', 'pretzel', 'croissant', 'baguette', 'cheese wedge',
      'milk carton', 'coffee mug', 'teapot', 'juice box', 'soda can', 'water bottle', 'frying pan',
      'spatula', 'whisk', 'rolling pin', 'toaster', 'blender', 'microwave', 'refrigerator',
      'washing machine', 'vacuum cleaner', 'sewing machine', 'rocking chair', 'hammock', 'bunk bed',
      'pillow', 'blanket', 'teddy bear', 'kite', 'yo yo', 'rubiks cube', 'domino', 'chess board',
      'playing cards', 'dice', 'jigsaw puzzle', 'xylophone', 'harmonica', 'trumpet', 'saxophone',
      'violin', 'drum kit', 'megaphone', 'microphone', 'karaoke', 'circus tent', 'juggling', 'unicycle',
      'trampoline', 'skateboard', 'roller skates', 'snowboard', 'surfboard', 'scuba mask', 'fishing rod',
      'rowboat', 'sailboat', 'ferry', 'submarine', 'hot air balloon', 'blimp', 'glider', 'parachute',
      'rocket ship', 'T rex', 'dragon', 'unicorn', 'mermaid', 'wizard', 'pirate ship', 'treasure map',
      'vampire', 'zombie', 'mummy', 'ghost', 'witch hat', 'broomstick', 'crystal ball', 'magic wand',
      'genie lamp', 'hourglass', 'cuckoo clock', 'grandfather clock', 'pocket watch', 'sundial',
      'compass rose', 'treasure chest', 'cannon', 'catapult', 'shield', 'sword', 'bow and arrow',
      'helmet', 'armor', 'flag', 'banner', 'throne', 'drawbridge', 'fire truck', 'ambulance',
      'police car', 'life raft', 'periscope', 'telescope', 'binoculars', 'magnifying glass', 'syringe',
      'stethoscope', 'wheelchair', 'crutches', 'bandage', 'pill bottle', 'thermometer', 'toothbrush',
      'toothpaste', 'hairbrush', 'comb', 'razor', 'perfume bottle', 'nail polish', 'hand fan', 'quilt',
      'wind chime', 'bird cage', 'dog house', 'fish bowl', 'hammock chair', 'lantern', 'campfire',
      'sleeping bag', 'canoe', 'paddle', 'life jacket', 'snowman', 'sled', 'igloo dome', 'totem pole',
      'banana', 'pineapple', 'watermelon', 'strawberry', 'mango', 'coconut', 'grapes', 'carrot',
      'tomato', 'onion', 'pumpkin', 'bread loaf', 'sandwich', 'honey jar',
      'singara', 'samosa', 'fuchka', 'chotpoti', 'biriyani', 'roshogolla', 'mishti doi',
      'hilsa fish', 'paratha', 'luchi', 'pitha', 'jhal muri', 'chanachur', 'milk tea',
      'sugarcane juice', 'lungi', 'panjabi', 'saree', 'salwar kameez', 'sandal', 'slipper',
      'school bag', 'tiffin box', 'cycle rickshaw', 'auto rickshaw', 'helicopter', 'bullock cart',
      'container ship', 'fishing boat', 'water lily', 'lotus pond', 'bamboo tree', 'banana tree',
      'rice field', 'paddy field', 'crow', 'vulture', 'kingfisher', 'sparrow', 'pigeon',
      'squirrel', 'mongoose', 'bengal tiger'
    ]
  },
  friends: {
    medium: CLASSMATES
  }
};

const CAT_LABEL = { cse: 'CSE', engg: 'Engineering', general: 'General', friends: 'Classmate' };

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[.,'’`-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Flatten + dedupe once at load
const WORDS = [];
{
  const seen = new Set();
  for (const [cat, diffs] of Object.entries(BANK)) {
    for (const [diff, list] of Object.entries(diffs)) {
      for (const raw of list) {
        const word = norm(raw);
        if (!word || seen.has(word)) continue;
        seen.add(word);
        WORDS.push({ word, cat, diff });
      }
    }
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build a shuffled draw-bag excluding already-used words.
// If nearly everything is used, refill with the full bank (rare — needs 500+ turns).
function buildBag(used) {
  let pool = WORDS.filter(w => !used.has(w.word));
  if (pool.length < 30) pool = WORDS.slice();
  return shuffle(pool.slice());
}

// Pop `count` choices at random positions (never from the same end — keeps
// draws unpredictable) and guarantee a few easy picks for beginners.
function choicesFrom(bag, count = 5, easyCount = 2) {
  const taken = [];
  const takeAt = (i) => taken.push(bag.splice(i, 1)[0]);

  // start with up to easyCount easy words so beginners always have options
  let easyLeft = bag.reduce((n, w) => n + (w.diff === 'easy' ? 1 : 0), 0);
  while (taken.length < easyCount && easyLeft > 0) {
    let i = Math.floor(Math.random() * bag.length);
    while (bag[i].diff !== 'easy') i = (i + 1) % bag.length;
    takeAt(i);
    easyLeft--;
  }

  while (taken.length < count) {
    if (!bag.length) bag.push(...shuffle(WORDS.slice()));
    takeAt(Math.floor(Math.random() * bag.length));
  }
  return taken;
}

// Mask: letters -> '_'; keep spaces. Revealed indices show their letter.
function masked(word, revealed) {
  return word.split('').map((c, i) => (c === ' ' ? ' ' : (revealed.has(i) ? c : '_'))).join('');
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// "You're close!" detector — small edit distance, same-ish length.
function isClose(guess, word) {
  if (guess === word) return false;
  if (Math.abs(guess.length - word.length) > 2) return false;
  return lev(guess, word) <= (word.length >= 8 ? 2 : 1);
}

module.exports = { WORDS, CAT_LABEL, norm, buildBag, choicesFrom, masked, lev, isClose };
