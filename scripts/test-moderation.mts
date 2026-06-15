import { dictionaryScreen } from '../lib/moderation.ts'

// Messages qui DOIVENT être bloqués (toxiques / haineux / vulgaires)
const TOXIC = [
  'sale gay', 'sale pd', 'espèce de connard', 'connard', 'connard va',
  'je te baise passe', 'tu es un gros con', 'ferme ta gueule', 'ta gueule',
  'fils de pute', 'nique ta mère', 'va te faire enculer', 'sale juif',
  'sale arabe', 'sale noir', 'grosse pute', 'salope', 'enculé',
  'c o n n a r d', 'enc u l e', 'c0nnard', 'pd va', 'sale gouine',
  'tu es debile', 'gros débile', 'fdp', 'ntm', 'tg sale merde',
  'espece de mongol', 'sale race', 'fuck you', 'you bitch', 'kys',
  'pute', 'grosse merde', 'sombre con', 'putain de bouffon',
]

// Messages BÉNINS qui ne doivent PAS être bloqués (faux positifs)
const BENIGN = [
  'super soirée !', 'on adore ce son', 'mets du daft punk stp',
  'un baiser pour toi', 'bonne ambiance ce soir', 'concert de folie',
  'contre toute attente c\'est génial', 'gay pride parade', 'salut à tous',
  'sale temps dehors mais ambiance au top', 'la grosse soirée du vendredi',
  'conseil : monte le son', 'je suis content', 'tu gères !',
  'mets une musique de ouf', 'trop bien la salopette de DJ', 'merci !',
  'on veut du rap', 'c\'est la fête', 'belle prestation',
  'je crève de rire', 'ça crève l\'écran', 'sans dispute ce soir',
  'quelle réputation', 'tu m\'as ébranlé', 'concours de danse',
  'grosse fiesta', 'sale journée mais on se rattrape', 'un bisou',
]

let blocked = 0
const missedToxic: string[] = []
for (const m of TOXIC) { if (!dictionaryScreen(m).ok) blocked++; else missedToxic.push(m) }

let falsePos: string[] = []
for (const m of BENIGN) { if (!dictionaryScreen(m).ok) falsePos.push(m) }

const recall = (blocked / TOXIC.length) * 100
console.log(`\n=== MODÉRATION (dictionnaire seul, sans Perspective) ===`)
console.log(`Toxiques bloqués : ${blocked}/${TOXIC.length}  (${recall.toFixed(1)}%)`)
console.log(`Bénins bloqués à tort : ${falsePos.length}/${BENIGN.length}`)
if (missedToxic.length) console.log(`\n❌ NON bloqués (à corriger) :\n  - ${missedToxic.join('\n  - ')}`)
if (falsePos.length)   console.log(`\n⚠️  Faux positifs :\n  - ${falsePos.join('\n  - ')}`)
console.log('')
