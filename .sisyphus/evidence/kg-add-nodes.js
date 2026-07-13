const fs = require('fs');
const path = require('path');

const KG_PATH = 'C:/Users/64887/ocr-kb-matcher/backend/data/knowledge-graph.json';
const graph = JSON.parse(fs.readFileSync(KG_PATH, 'utf-8'));

const before = Object.keys(graph.nodes).length;
console.log('Before:', before, 'nodes');

const NEW_NODES = {
  'EA-JP-029': {
    id: 'EA-JP-029',
    name: 'Meiji Restoration (1868 CE)',
    domain: 'East Asia - Unit 7',
    description: 'The Meiji Restoration (1868) was a political and social revolution that ended the Tokugawa shogunate and restored imperial rule under Emperor Meiji. It launched a rapid modernization program: the new government abolished feudal domains, established a conscript army, sent scholars abroad to study Western industry, and adopted Western legal and educational systems. The Meiji Constitution (1889) centralized power in the Emperor. The period transformed Japan from a feudal society into a modern industrial power and an emerging imperial competitor in East Asia.',
    prerequisites: ['EA-JP-026'],
    nextSteps: ['EA-JP-030'],
    x: 5000,
    y: 5000,
    sources: ['study-material'],
    unit: 'U7',
    timePeriod: 'Modern'
  },
  'EA-JP-031': {
    id: 'EA-JP-031',
    name: 'Japanese Imperial Expansion (1895-1945 CE)',
    domain: 'East Asia - Unit 7',
    description: "Following the Meiji Restoration, Japan pursued imperial expansion: victory in the First Sino-Japanese War (1895) gained Taiwan; the Russo-Japanese War (1905) established Japan as a major power; annexation of Korea (1910) began formal empire. Militarist ideology, economic pressure, and the need for resources drove further expansion into Manchuria (1931) and full-scale war in China (1937). Defeat in WWII (1945) ended the empire.",
    prerequisites: ['EA-JP-029'],
    nextSteps: [],
    x: 5200,
    y: 5000,
    sources: ['study-material'],
    unit: 'U7',
    timePeriod: 'Modern'
  },
  'EA-JP-032': {
    id: 'EA-JP-032',
    name: 'Shinto - Indigenous Japanese Religion',
    domain: 'East Asia - Unit 1',
    description: "Shinto is the indigenous religion of Japan, meaning 'way of the kami.' It has no founder, single prophet, or formal scripture. Key concepts include purity and harmony (wa). Kami are spirits believed to inhabit natural features such as mountains, rivers, and trees. Shrines (jinja) marked by torii gates are central places of worship. The oldest written sources for Shinto mythology are the Kojiki (712 CE) and Nihon Shoki (720 CE). Shinto coexists with Buddhism in modern Japan.",
    prerequisites: ['EA-JP-001'],
    nextSteps: ['EA-JP-003'],
    x: 4750,
    y: 4000,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  },
  'EA-JP-033': {
    id: 'EA-JP-033',
    name: 'Jomon Period (14,000-300 BCE)',
    domain: 'East Asia - Unit 1',
    description: 'The Jomon Period (14,000-300 BCE) was the era of the first inhabitants of Japan. They were hunter-gatherers who produced distinctive cord-marked pottery (the name means "cord-marked"). Jomon society was semi-sedentary with a matriarchal social structure. The period ended as the Yayoi people migrated from the Asian mainland bringing wet-rice agriculture and metal tools.',
    prerequisites: [],
    nextSteps: ['EA-JP-001'],
    x: 5100,
    y: 4400,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Ancient'
  },
  'EA-CH-051': {
    id: 'EA-CH-051',
    name: 'Daoism (Taoism)',
    domain: 'East Asia - Unit 1',
    description: 'Daoism is attributed to Laozi (possibly mythical, traditionally 6th century BCE) and the Daodejing. The central concept is the Dao (the Way), an indescribable force underlying all of nature. The goal is to live in harmony with the Dao through wu-wei (non-action / effortless action). The Yin-Yang symbol represents complementary opposites. Daoism influenced Chinese medicine, alchemy, and the martial arts.',
    prerequisites: ['EA-CH-003'],
    nextSteps: ['EA-CH-008'],
    x: 2400,
    y: 5200,
    sources: ['study-material'],
    unit: 'U1',
    timePeriod: 'Classical'
  },
  'EA-KR-001': {
    id: 'EA-KR-001',
    name: 'Gojoseon - Old Joseon (2333-108 BCE)',
    domain: 'East Asia - Unit 2',
    description: 'Gojoseon was the first Korean kingdom, traditionally founded by Dangun in 2333 BCE. It was conquered by the Han Dynasty in 108 BCE, leading to the establishment of the Four Commanderies of Han which introduced Chinese culture, writing, and Buddhism to the peninsula.',
    prerequisites: [],
    nextSteps: ['EA-KR-002'],
    x: 1500,
    y: 100,
    sources: ['study-material'],
    unit: 'U2',
    timePeriod: 'Ancient'
  },
  'EA-KR-002': {
    id: 'EA-KR-002',
    name: 'Three Kingdoms of Korea (57 BCE - 668 CE)',
    domain: 'East Asia - Unit 2',
    description: 'After the fall of Gojoseon, three kingdoms emerged on the Korean peninsula: Goguryeo (north), Baekje (southwest), and Silla (southeast). All three were heavily influenced by Chinese culture but maintained distinct identities. The period produced strong metallurgy, advanced astronomy, and the earliest known printed book (Baekje\'s Pure Light Dharani Sutra).',
    prerequisites: ['EA-KR-001'],
    nextSteps: ['EA-KR-003'],
    x: 1600,
    y: 300,
    sources: ['study-material'],
    unit: 'U2',
    timePeriod: 'Classical'
  },
  'EA-KR-003': {
    id: 'EA-KR-003',
    name: 'Unified Silla and Balhae (668-935 CE)',
    domain: 'East Asia - Unit 2',
    description: "Silla allied with Tang China to defeat Goguryeo and Baekje in 660-668 CE, unifying the peninsula for the first time. The Tang established the Protectorate General to Pacify the East but was expelled in 676 CE. Balhae, founded by former Goguryeo refugees, controlled the north. The period saw Buddhism flourish as the state religion.",
    prerequisites: ['EA-KR-002'],
    nextSteps: ['EA-KR-004', 'EA-KR-005'],
    x: 1700,
    y: 500,
    sources: ['study-material'],
    unit: 'U2',
    timePeriod: 'Classical'
  },
  'EA-KR-004': {
    id: 'EA-KR-004',
    name: 'Goryeo Dynasty (918-1392 CE)',
    domain: 'East Asia - Unit 3',
    description: 'Goryeo was founded by Wang Geon, a Silla general. It gave its name to the Western word "Korea." Goryeo resisted the Khitan Liao and later the Jurchen Jin, and was eventually conquered by the Mongols in 1238. Despite Mongol pressure, Goryeo retained its royal house. The dynasty developed the first movable metal type (1234 CE), predating Gutenberg by two centuries.',
    prerequisites: ['EA-KR-003'],
    nextSteps: ['EA-KR-006'],
    x: 1800,
    y: 700,
    sources: ['study-material'],
    unit: 'U3',
    timePeriod: 'Medieval'
  },
  'EA-KR-006': {
    id: 'EA-KR-006',
    name: 'Joseon Dynasty and Confucianism (1392-1897 CE)',
    domain: 'East Asia - Unit 3',
    description: 'Joseon was founded by General Yi Seong-gye. It adopted Neo-Confucianism as state ideology, replacing Buddhism in official life. The dynasty created Hangul (the Korean alphabet) in 1443 under King Sejong. Joseon lasted over 500 years, the longest ruling dynasty in Korean history, ending with Japanese annexation in 1910.',
    prerequisites: ['EA-KR-004'],
    nextSteps: ['EA-KR-008'],
    x: 1900,
    y: 900,
    sources: ['study-material'],
    unit: 'U3',
    timePeriod: 'Medieval'
  },
  'EA-KR-008': {
    id: 'EA-KR-008',
    name: 'Japanese Colonial Period in Korea (1910-1945)',
    domain: 'East Asia - Unit 7',
    description: 'After the Russo-Japanese War (1905), Japan established a protectorate over Korea and formally annexed it in 1910. Japan suppressed Korean language and culture, conscripted labor, and forced name changes. The March 1st Movement (1919) was a major peaceful protest. Korea was liberated at the end of WWII in 1945 but divided into US and Soviet occupation zones, setting the stage for the Korean War.',
    prerequisites: ['EA-KR-006'],
    nextSteps: ['EA-KR-013'],
    x: 2100,
    y: 1100,
    sources: ['study-material'],
    unit: 'U7',
    timePeriod: 'Modern'
  },
  'EA-KR-013': {
    id: 'EA-KR-013',
    name: 'Korean War and Division (1950-1953)',
    domain: 'East Asia - Unit 8',
    description: 'The Korean War began on June 25, 1950 when North Korean forces crossed the 38th parallel. The United Nations, led by the United States, intervened to support South Korea, while China sent the Peoples Volunteer Army to support North Korea. The war ended in an armistice on July 27, 1953, leaving the peninsula divided at the Demilitarized Zone (DMZ) near the original 38th parallel. The conflict killed an estimated 2.5 million people.',
    prerequisites: ['EA-KR-012'],
    nextSteps: ['EA-KR-014'],
    x: 2300,
    y: 1300,
    sources: ['study-material'],
    unit: 'U8',
    timePeriod: 'Modern'
  }
};

for (const [id, node] of Object.entries(NEW_NODES)) {
  if (!graph.nodes[id]) {
    graph.nodes[id] = node;
    console.log('  ADDED:', id, '|', node.name);
  } else {
    console.log('  EXISTS:', id);
  }
}

const newEdges = {
  'EA-JP-029-EA-JP-026': { id: 'EA-JP-029-EA-JP-026', source: 'EA-JP-029', target: 'EA-JP-026', label: 'preceded' },
  'EA-JP-029-EA-JP-027': { id: 'EA-JP-029-EA-JP-027', source: 'EA-JP-029', target: 'EA-JP-027', label: 'influenced' }
};
for (const [id, edge] of Object.entries(newEdges)) {
  if (!graph.edges[id]) {
    graph.edges[id] = edge;
    console.log('  ADDED edge:', id);
  }
}

graph.statistics.totalNodes = Object.keys(graph.nodes).length;
graph.statistics.totalEdges = Object.keys(graph.edges).length;
graph.lastUpdated = new Date().toISOString();

const after = Object.keys(graph.nodes).length;
console.log('After:', after, 'nodes (+', after - before, ')');
console.log('Total edges:', graph.statistics.totalEdges);

const json = JSON.stringify(graph, null, 2);
fs.writeFileSync(KG_PATH, json, 'utf-8');
console.log('Wrote', json.length, 'bytes to', KG_PATH);