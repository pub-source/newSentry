/**
 * MSDS safety & awareness lexicon — Tagalog + English.
 *
 * A single, large collection of the words and sentences a household actually
 * shouts when something goes wrong. Transcripts from the CCTV are compared
 * against this list; only entries found here are treated as recognised
 * safety speech, everything else stays plain transcription.
 *
 * severity:
 *   critical -> life threatening, triggers the emergency screen
 *   high     -> urgent, needs attention now
 *   medium   -> awareness / early warning
 */

export type SafetySeverity = 'critical' | 'high' | 'medium';

export type SafetyCategory =
  | 'medical'
  | 'fire'
  | 'fall'
  | 'intruder'
  | 'violence'
  | 'child'
  | 'water'
  | 'gas'
  | 'electrical'
  | 'accident'
  | 'distress'
  | 'help'
  | 'awareness';

export interface SafetyPhrase {
  /** Lowercase phrase as it would appear in a transcript. */
  phrase: string;
  lang: 'en' | 'tl';
  category: SafetyCategory;
  severity: SafetySeverity;
  /** 0–1 confidence that this phrase alone means real trouble. */
  confidence: number;
}

const P = (
  phrase: string,
  lang: 'en' | 'tl',
  category: SafetyCategory,
  severity: SafetySeverity,
  confidence: number,
): SafetyPhrase => ({ phrase, lang, category, severity, confidence });

/* ------------------------------------------------------------------ */
/* ENGLISH                                                             */
/* ------------------------------------------------------------------ */

const EN_HELP: SafetyPhrase[] = [
  P('help', 'en', 'help', 'high', 0.9),
  P('help me', 'en', 'help', 'critical', 0.97),
  P('help us', 'en', 'help', 'critical', 0.96),
  P('help please', 'en', 'help', 'critical', 0.96),
  P('please help', 'en', 'help', 'critical', 0.96),
  P('please help me', 'en', 'help', 'critical', 0.98),
  P('somebody help', 'en', 'help', 'critical', 0.97),
  P('someone help', 'en', 'help', 'critical', 0.97),
  P('someone help me', 'en', 'help', 'critical', 0.98),
  P('i need help', 'en', 'help', 'critical', 0.96),
  P('we need help', 'en', 'help', 'critical', 0.96),
  P('i need help now', 'en', 'help', 'critical', 0.98),
  P('need assistance', 'en', 'help', 'high', 0.88),
  P('can anyone hear me', 'en', 'help', 'high', 0.9),
  P('is anyone there', 'en', 'help', 'medium', 0.7),
  P('sos', 'en', 'help', 'critical', 0.95),
  P('mayday', 'en', 'help', 'critical', 0.95),
  P('rescue me', 'en', 'help', 'critical', 0.97),
  P('save me', 'en', 'help', 'critical', 0.97),
  P('get help', 'en', 'help', 'critical', 0.95),
  P('go get help', 'en', 'help', 'critical', 0.95),
];

const EN_EMERGENCY: SafetyPhrase[] = [
  P('emergency', 'en', 'distress', 'critical', 0.95),
  P('this is an emergency', 'en', 'distress', 'critical', 0.98),
  P('call 911', 'en', 'distress', 'critical', 0.98),
  P('call 117', 'en', 'distress', 'critical', 0.98),
  P('call the police', 'en', 'intruder', 'critical', 0.97),
  P('call police', 'en', 'intruder', 'critical', 0.97),
  P('call the cops', 'en', 'intruder', 'critical', 0.95),
  P('someone call the police', 'en', 'intruder', 'critical', 0.98),
  P('get the police', 'en', 'intruder', 'critical', 0.95),
  P('call an ambulance', 'en', 'medical', 'critical', 0.98),
  P('call the ambulance', 'en', 'medical', 'critical', 0.98),
  P('call the fire department', 'en', 'fire', 'critical', 0.98),
  P('call the barangay', 'en', 'distress', 'high', 0.9),
  P('call my family', 'en', 'distress', 'high', 0.88),
  P('call the hospital', 'en', 'medical', 'critical', 0.95),
  P('police', 'en', 'intruder', 'high', 0.85),
  P('ambulance', 'en', 'medical', 'critical', 0.95),
  P('paramedic', 'en', 'medical', 'critical', 0.93),
  P('fire department', 'en', 'fire', 'critical', 0.94),
];

const EN_MEDICAL: SafetyPhrase[] = [
  P('i cannot breathe', 'en', 'medical', 'critical', 0.98),
  P("i can't breathe", 'en', 'medical', 'critical', 0.98),
  P('hard to breathe', 'en', 'medical', 'critical', 0.95),
  P('i am choking', 'en', 'medical', 'critical', 0.98),
  P('choking', 'en', 'medical', 'critical', 0.95),
  P('chest pain', 'en', 'medical', 'critical', 0.97),
  P('my chest hurts', 'en', 'medical', 'critical', 0.97),
  P('heart attack', 'en', 'medical', 'critical', 0.98),
  P('stroke', 'en', 'medical', 'critical', 0.96),
  P('i feel dizzy', 'en', 'medical', 'high', 0.88),
  P('i am dizzy', 'en', 'medical', 'high', 0.88),
  P('i feel faint', 'en', 'medical', 'high', 0.9),
  P('i am going to faint', 'en', 'medical', 'critical', 0.94),
  P('she fainted', 'en', 'medical', 'critical', 0.96),
  P('he fainted', 'en', 'medical', 'critical', 0.96),
  P('she is unconscious', 'en', 'medical', 'critical', 0.98),
  P('he is unconscious', 'en', 'medical', 'critical', 0.98),
  P('not breathing', 'en', 'medical', 'critical', 0.98),
  P('no pulse', 'en', 'medical', 'critical', 0.98),
  P('i am bleeding', 'en', 'medical', 'critical', 0.96),
  P('bleeding a lot', 'en', 'medical', 'critical', 0.97),
  P('so much blood', 'en', 'medical', 'critical', 0.96),
  P('seizure', 'en', 'medical', 'critical', 0.96),
  P('he is seizing', 'en', 'medical', 'critical', 0.96),
  P('allergic reaction', 'en', 'medical', 'critical', 0.94),
  P('my medicine', 'en', 'medical', 'high', 0.8),
  P('i need my medicine', 'en', 'medical', 'high', 0.9),
  P('i need my inhaler', 'en', 'medical', 'critical', 0.95),
  P('asthma attack', 'en', 'medical', 'critical', 0.96),
  P('sugar is low', 'en', 'medical', 'high', 0.88),
  P('high blood', 'en', 'medical', 'high', 0.85),
  P('i am in pain', 'en', 'medical', 'high', 0.9),
  P('it hurts so much', 'en', 'medical', 'high', 0.9),
  P('i think i broke my', 'en', 'medical', 'high', 0.9),
  P('i feel sick', 'en', 'medical', 'medium', 0.75),
  P('i am not okay', 'en', 'distress', 'high', 0.85),
];

const EN_FALL: SafetyPhrase[] = [
  P('i fell', 'en', 'fall', 'critical', 0.95),
  P('i have fallen', 'en', 'fall', 'critical', 0.95),
  P('i fell down', 'en', 'fall', 'critical', 0.96),
  P('i fell and i cannot get up', 'en', 'fall', 'critical', 0.99),
  P("i can't get up", 'en', 'fall', 'critical', 0.97),
  P('i cannot get up', 'en', 'fall', 'critical', 0.97),
  P('i cannot move', 'en', 'fall', 'critical', 0.97),
  P("i can't move", 'en', 'fall', 'critical', 0.97),
  P('i slipped', 'en', 'fall', 'high', 0.9),
  P('she fell', 'en', 'fall', 'critical', 0.95),
  P('he fell', 'en', 'fall', 'critical', 0.95),
  P('grandma fell', 'en', 'fall', 'critical', 0.97),
  P('grandpa fell', 'en', 'fall', 'critical', 0.97),
  P('i am stuck', 'en', 'fall', 'high', 0.9),
  P('i am trapped', 'en', 'fall', 'critical', 0.96),
];

const EN_FIRE: SafetyPhrase[] = [
  P('fire', 'en', 'fire', 'critical', 0.95),
  P('there is a fire', 'en', 'fire', 'critical', 0.98),
  P('the house is on fire', 'en', 'fire', 'critical', 0.99),
  P('it is burning', 'en', 'fire', 'critical', 0.96),
  P('something is burning', 'en', 'fire', 'high', 0.92),
  P('i smell smoke', 'en', 'fire', 'high', 0.93),
  P('smoke', 'en', 'fire', 'high', 0.85),
  P('too much smoke', 'en', 'fire', 'critical', 0.95),
  P('get the extinguisher', 'en', 'fire', 'critical', 0.95),
  P('fire extinguisher', 'en', 'fire', 'high', 0.9),
  P('evacuate', 'en', 'fire', 'critical', 0.96),
  P('get out of the house', 'en', 'fire', 'critical', 0.96),
  P('everybody out', 'en', 'fire', 'critical', 0.95),
];

const EN_GAS_ELEC_WATER: SafetyPhrase[] = [
  P('gas leak', 'en', 'gas', 'critical', 0.97),
  P('i smell gas', 'en', 'gas', 'critical', 0.96),
  P('the lpg is leaking', 'en', 'gas', 'critical', 0.97),
  P('turn off the gas', 'en', 'gas', 'high', 0.92),
  P('turn off the stove', 'en', 'gas', 'high', 0.9),
  P('the stove is still on', 'en', 'gas', 'high', 0.9),
  P('short circuit', 'en', 'electrical', 'critical', 0.95),
  P('sparks', 'en', 'electrical', 'high', 0.9),
  P('electric shock', 'en', 'electrical', 'critical', 0.97),
  P('i got shocked', 'en', 'electrical', 'critical', 0.96),
  P('turn off the power', 'en', 'electrical', 'high', 0.9),
  P('the wire is burning', 'en', 'electrical', 'critical', 0.96),
  P('flood', 'en', 'water', 'high', 0.9),
  P('the water is rising', 'en', 'water', 'critical', 0.95),
  P('water is everywhere', 'en', 'water', 'high', 0.88),
  P('leaking water', 'en', 'water', 'medium', 0.75),
  P('drowning', 'en', 'water', 'critical', 0.98),
  P('he is drowning', 'en', 'water', 'critical', 0.99),
];

const EN_INTRUDER: SafetyPhrase[] = [
  P('thief', 'en', 'intruder', 'critical', 0.95),
  P('there is a thief', 'en', 'intruder', 'critical', 0.97),
  P('robber', 'en', 'intruder', 'critical', 0.96),
  P('robbery', 'en', 'intruder', 'critical', 0.97),
  P('burglar', 'en', 'intruder', 'critical', 0.96),
  P('someone is inside', 'en', 'intruder', 'critical', 0.95),
  P('someone is in the house', 'en', 'intruder', 'critical', 0.97),
  P('stranger outside', 'en', 'intruder', 'high', 0.88),
  P('someone is at the door', 'en', 'awareness', 'medium', 0.7),
  P('they are breaking in', 'en', 'intruder', 'critical', 0.98),
  P('he has a knife', 'en', 'violence', 'critical', 0.99),
  P('he has a gun', 'en', 'violence', 'critical', 0.99),
  P('lock the door', 'en', 'intruder', 'high', 0.85),
  P('call security', 'en', 'intruder', 'high', 0.9),
  P('intruder', 'en', 'intruder', 'critical', 0.96),
];

const EN_VIOLENCE: SafetyPhrase[] = [
  P('stop', 'en', 'violence', 'high', 0.8),
  P('please stop', 'en', 'violence', 'high', 0.92),
  P('stop it', 'en', 'violence', 'high', 0.9),
  P('leave me alone', 'en', 'violence', 'high', 0.92),
  P('get away from me', 'en', 'violence', 'critical', 0.95),
  P('do not touch me', 'en', 'violence', 'critical', 0.95),
  P("don't touch me", 'en', 'violence', 'critical', 0.95),
  P('do not hurt me', 'en', 'violence', 'critical', 0.97),
  P("don't hurt me", 'en', 'violence', 'critical', 0.97),
  P('he is hurting me', 'en', 'violence', 'critical', 0.98),
  P('she is hurting me', 'en', 'violence', 'critical', 0.98),
  P('stop hitting me', 'en', 'violence', 'critical', 0.98),
  P('let me go', 'en', 'violence', 'critical', 0.95),
  P('i am scared', 'en', 'distress', 'high', 0.88),
  P('i am afraid', 'en', 'distress', 'high', 0.85),
];

const EN_CHILD_AWARENESS: SafetyPhrase[] = [
  P('the baby is crying', 'en', 'child', 'medium', 0.75),
  P('where is the baby', 'en', 'child', 'high', 0.88),
  P('the child is missing', 'en', 'child', 'critical', 0.97),
  P('the baby fell', 'en', 'child', 'critical', 0.98),
  P('watch the child', 'en', 'child', 'medium', 0.72),
  P('be careful', 'en', 'awareness', 'medium', 0.7),
  P('watch out', 'en', 'awareness', 'high', 0.82),
  P('look out', 'en', 'awareness', 'high', 0.82),
  P('danger', 'en', 'awareness', 'high', 0.9),
  P('it is dangerous', 'en', 'awareness', 'high', 0.88),
  P('earthquake', 'en', 'accident', 'critical', 0.96),
  P('take cover', 'en', 'accident', 'critical', 0.94),
  P('accident', 'en', 'accident', 'high', 0.9),
  P('there was an accident', 'en', 'accident', 'critical', 0.95),
  P('broken glass', 'en', 'awareness', 'medium', 0.75),
  P('the floor is wet', 'en', 'awareness', 'medium', 0.7),
  P('i am locked out', 'en', 'awareness', 'medium', 0.72),
  P('i am alone', 'en', 'awareness', 'medium', 0.7),
];

/* ------------------------------------------------------------------ */
/* TAGALOG / FILIPINO                                                  */
/* ------------------------------------------------------------------ */

const TL_HELP: SafetyPhrase[] = [
  P('tulong', 'tl', 'help', 'high', 0.92),
  P('tulong po', 'tl', 'help', 'critical', 0.96),
  P('tulungan mo ako', 'tl', 'help', 'critical', 0.98),
  P('tulungan niyo ako', 'tl', 'help', 'critical', 0.98),
  P('tulungan nyo po ako', 'tl', 'help', 'critical', 0.98),
  P('saklolo', 'tl', 'help', 'critical', 0.98),
  P('saklolo po', 'tl', 'help', 'critical', 0.98),
  P('iligtas mo ako', 'tl', 'help', 'critical', 0.97),
  P('iligtas niyo ako', 'tl', 'help', 'critical', 0.97),
  P('kailangan ko ng tulong', 'tl', 'help', 'critical', 0.97),
  P('may tao ba diyan', 'tl', 'help', 'medium', 0.72),
  P('may naririnig ba kayo', 'tl', 'help', 'medium', 0.72),
  P('pakitulungan ako', 'tl', 'help', 'critical', 0.97),
  P('tawag kayo ng tulong', 'tl', 'help', 'critical', 0.96),
  P('hingi ako ng tulong', 'tl', 'help', 'critical', 0.95),
];

const TL_EMERGENCY: SafetyPhrase[] = [
  P('emergency po', 'tl', 'distress', 'critical', 0.96),
  P('tumawag ka ng pulis', 'tl', 'intruder', 'critical', 0.97),
  P('tumawag kayo ng pulis', 'tl', 'intruder', 'critical', 0.97),
  P('tawagan mo ang pulis', 'tl', 'intruder', 'critical', 0.97),
  P('tumawag ng ambulansya', 'tl', 'medical', 'critical', 0.98),
  P('tawag ng ambulansya', 'tl', 'medical', 'critical', 0.98),
  P('tumawag ng bumbero', 'tl', 'fire', 'critical', 0.98),
  P('tawagan mo ang barangay', 'tl', 'distress', 'high', 0.9),
  P('dalhin mo ako sa ospital', 'tl', 'medical', 'critical', 0.96),
  P('pulis', 'tl', 'intruder', 'high', 0.85),
  P('ambulansya', 'tl', 'medical', 'critical', 0.95),
  P('bumbero', 'tl', 'fire', 'critical', 0.95),
  P('ospital', 'tl', 'medical', 'high', 0.85),
];

const TL_MEDICAL: SafetyPhrase[] = [
  P('hindi ako makahinga', 'tl', 'medical', 'critical', 0.98),
  P('hirap akong huminga', 'tl', 'medical', 'critical', 0.97),
  P('nasasakal ako', 'tl', 'medical', 'critical', 0.98),
  P('masakit ang dibdib ko', 'tl', 'medical', 'critical', 0.97),
  P('atake sa puso', 'tl', 'medical', 'critical', 0.98),
  P('inaatake ako', 'tl', 'medical', 'critical', 0.97),
  P('nahihilo ako', 'tl', 'medical', 'high', 0.88),
  P('hinihimatay ako', 'tl', 'medical', 'critical', 0.95),
  P('nawalan ng malay', 'tl', 'medical', 'critical', 0.98),
  P('hindi humihinga', 'tl', 'medical', 'critical', 0.98),
  P('dumudugo ako', 'tl', 'medical', 'critical', 0.96),
  P('maraming dugo', 'tl', 'medical', 'critical', 0.96),
  P('sumasakit ang ulo ko', 'tl', 'medical', 'high', 0.85),
  P('masakit', 'tl', 'medical', 'high', 0.85),
  P('ang sakit', 'tl', 'medical', 'high', 0.9),
  P('ang sakit po', 'tl', 'medical', 'high', 0.92),
  P('aray', 'tl', 'medical', 'high', 0.85),
  P('aray ko', 'tl', 'medical', 'high', 0.88),
  P('kailangan ko ng gamot', 'tl', 'medical', 'high', 0.9),
  P('inuubo ako ng dugo', 'tl', 'medical', 'critical', 0.97),
  P('sumusuka ako', 'tl', 'medical', 'high', 0.85),
  P('nilalagnat ako', 'tl', 'medical', 'medium', 0.75),
  P('hindi ako okay', 'tl', 'distress', 'high', 0.85),
  P('may sakit ako', 'tl', 'medical', 'medium', 0.75),
];

const TL_FALL: SafetyPhrase[] = [
  P('nahulog ako', 'tl', 'fall', 'critical', 0.96),
  P('natumba ako', 'tl', 'fall', 'critical', 0.95),
  P('nadulas ako', 'tl', 'fall', 'high', 0.92),
  P('hindi ako makatayo', 'tl', 'fall', 'critical', 0.97),
  P('hindi ako makagalaw', 'tl', 'fall', 'critical', 0.97),
  P('natumba si lola', 'tl', 'fall', 'critical', 0.98),
  P('natumba si lolo', 'tl', 'fall', 'critical', 0.98),
  P('nahulog si lola', 'tl', 'fall', 'critical', 0.98),
  P('naipit ako', 'tl', 'fall', 'critical', 0.96),
  P('hindi ako makalabas', 'tl', 'fall', 'critical', 0.95),
];

const TL_FIRE: SafetyPhrase[] = [
  P('sunog', 'tl', 'fire', 'critical', 0.96),
  P('may sunog', 'tl', 'fire', 'critical', 0.98),
  P('may sunog po', 'tl', 'fire', 'critical', 0.98),
  P('nasusunog', 'tl', 'fire', 'critical', 0.97),
  P('nasusunog ang bahay', 'tl', 'fire', 'critical', 0.99),
  P('may usok', 'tl', 'fire', 'high', 0.92),
  P('maraming usok', 'tl', 'fire', 'critical', 0.95),
  P('amoy sunog', 'tl', 'fire', 'high', 0.93),
  P('patayin ang apoy', 'tl', 'fire', 'critical', 0.95),
  P('may apoy', 'tl', 'fire', 'critical', 0.95),
  P('lumabas na kayo', 'tl', 'fire', 'critical', 0.94),
  P('lumikas na', 'tl', 'fire', 'critical', 0.95),
];

const TL_GAS_ELEC_WATER: SafetyPhrase[] = [
  P('may tumatagas na gas', 'tl', 'gas', 'critical', 0.97),
  P('amoy gas', 'tl', 'gas', 'critical', 0.96),
  P('tumatagas ang lpg', 'tl', 'gas', 'critical', 0.97),
  P('patayin mo ang gas', 'tl', 'gas', 'high', 0.92),
  P('nakabukas pa ang kalan', 'tl', 'gas', 'high', 0.9),
  P('patayin ang kalan', 'tl', 'gas', 'high', 0.9),
  P('nag short circuit', 'tl', 'electrical', 'critical', 0.95),
  P('may kuryente', 'tl', 'electrical', 'high', 0.85),
  P('nakuryente ako', 'tl', 'electrical', 'critical', 0.97),
  P('may umaapoy na kable', 'tl', 'electrical', 'critical', 0.96),
  P('patayin mo ang kuryente', 'tl', 'electrical', 'high', 0.9),
  P('baha', 'tl', 'water', 'high', 0.9),
  P('tumataas ang tubig', 'tl', 'water', 'critical', 0.95),
  P('may tumatagas na tubig', 'tl', 'water', 'medium', 0.75),
  P('nalulunod', 'tl', 'water', 'critical', 0.98),
  P('nalulunod siya', 'tl', 'water', 'critical', 0.99),
];

const TL_INTRUDER: SafetyPhrase[] = [
  P('magnanakaw', 'tl', 'intruder', 'critical', 0.95),
  P('may magnanakaw', 'tl', 'intruder', 'critical', 0.97),
  P('may pumasok sa bahay', 'tl', 'intruder', 'critical', 0.97),
  P('may tao sa loob', 'tl', 'intruder', 'critical', 0.95),
  P('may estranghero', 'tl', 'intruder', 'high', 0.9),
  P('may kumakatok', 'tl', 'awareness', 'medium', 0.7),
  P('binubuksan nila ang pinto', 'tl', 'intruder', 'critical', 0.96),
  P('may hawak siyang kutsilyo', 'tl', 'violence', 'critical', 0.99),
  P('may baril siya', 'tl', 'violence', 'critical', 0.99),
  P('holdap', 'tl', 'intruder', 'critical', 0.97),
  P('nanakawan kami', 'tl', 'intruder', 'critical', 0.96),
  P('isara mo ang pinto', 'tl', 'intruder', 'high', 0.85),
];

const TL_VIOLENCE: SafetyPhrase[] = [
  P('tama na', 'tl', 'violence', 'high', 0.9),
  P('tama na po', 'tl', 'violence', 'high', 0.92),
  P('huwag', 'tl', 'violence', 'high', 0.85),
  P('huwag po', 'tl', 'violence', 'high', 0.9),
  P('wag mo akong saktan', 'tl', 'violence', 'critical', 0.97),
  P('huwag mo akong saktan', 'tl', 'violence', 'critical', 0.97),
  P('sinasaktan niya ako', 'tl', 'violence', 'critical', 0.98),
  P('binubugbog niya ako', 'tl', 'violence', 'critical', 0.98),
  P('layuan mo ako', 'tl', 'violence', 'critical', 0.95),
  P('lumayo ka sa akin', 'tl', 'violence', 'critical', 0.95),
  P('bitawan mo ako', 'tl', 'violence', 'critical', 0.96),
  P('takot ako', 'tl', 'distress', 'high', 0.88),
  P('natatakot ako', 'tl', 'distress', 'high', 0.9),
  P('huwag mo akong hawakan', 'tl', 'violence', 'critical', 0.96),
];

const TL_CHILD_AWARENESS: SafetyPhrase[] = [
  P('umiiyak ang bata', 'tl', 'child', 'medium', 0.75),
  P('nasaan ang bata', 'tl', 'child', 'high', 0.88),
  P('nawawala ang bata', 'tl', 'child', 'critical', 0.97),
  P('nahulog ang bata', 'tl', 'child', 'critical', 0.98),
  P('bantayan mo ang bata', 'tl', 'child', 'medium', 0.72),
  P('mag-ingat', 'tl', 'awareness', 'medium', 0.72),
  P('mag ingat ka', 'tl', 'awareness', 'medium', 0.75),
  P('delikado', 'tl', 'awareness', 'high', 0.88),
  P('delikado dito', 'tl', 'awareness', 'high', 0.9),
  P('may lindol', 'tl', 'accident', 'critical', 0.96),
  P('lindol', 'tl', 'accident', 'critical', 0.95),
  P('may aksidente', 'tl', 'accident', 'critical', 0.95),
  P('may basag na salamin', 'tl', 'awareness', 'medium', 0.75),
  P('madulas ang sahig', 'tl', 'awareness', 'medium', 0.72),
  P('mag-isa lang ako', 'tl', 'awareness', 'medium', 0.7),
  P('nakakulong ako sa labas', 'tl', 'awareness', 'medium', 0.72),
];

export const SAFETY_LEXICON: SafetyPhrase[] = [
  ...EN_HELP, ...EN_EMERGENCY, ...EN_MEDICAL, ...EN_FALL, ...EN_FIRE,
  ...EN_GAS_ELEC_WATER, ...EN_INTRUDER, ...EN_VIOLENCE, ...EN_CHILD_AWARENESS,
  ...TL_HELP, ...TL_EMERGENCY, ...TL_MEDICAL, ...TL_FALL, ...TL_FIRE,
  ...TL_GAS_ELEC_WATER, ...TL_INTRUDER, ...TL_VIOLENCE, ...TL_CHILD_AWARENESS,
];

/**
 * Common Whisper spellings / regional variants that should resolve to the
 * same entry. Keys are written exactly as they may appear in a transcript.
 */
const VARIANTS: Record<string, string> = {
  'tulong po ako': 'tulong po',
  'tulungan po ninyo ako': 'tulungan niyo ako',
  'tulungan nyo ako': 'tulungan niyo ako',
  'sakloloo': 'saklolo',
  'saklolo ako': 'saklolo',
  'may sonog': 'may sunog',
  'sonog': 'sunog',
  'wag po': 'huwag po',
  'wag': 'huwag',
  'aray ko po': 'aray ko',
  'help po': 'help me',
  'help help': 'help me',
  'nakakuryente ako': 'nakuryente ako',
  'hold up': 'holdap',
  'nine one one': 'call 911',
};

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .replace(/\bwag\b/g, 'huwag')
    .trim()
    .replace(/\s+/g, ' ');

const INDEX: { key: string; entry: SafetyPhrase }[] = SAFETY_LEXICON
  .map(entry => ({ key: normalize(entry.phrase), entry }))
  .concat(
    Object.entries(VARIANTS).flatMap(([variant, target]) => {
      const entry = SAFETY_LEXICON.find(e => normalize(e.phrase) === normalize(target));
      return entry ? [{ key: normalize(variant), entry }] : [];
    }),
  )
  // Longest phrases first so "tulungan mo ako" beats bare "tulong".
  .sort((a, b) => b.key.length - a.key.length);

export interface SafetyMatch {
  matched: boolean;
  phrase: string;
  category: SafetyCategory | null;
  severity: SafetySeverity | null;
  lang: 'en' | 'tl' | null;
  confidence: number;
  /** Every distinct lexicon phrase found in the text. */
  all: SafetyPhrase[];
}

export const NO_MATCH: SafetyMatch = {
  matched: false, phrase: '', category: null, severity: null, lang: null, confidence: 0, all: [],
};

/** Find every safety phrase present in a transcript; strongest one wins. */
export function matchSafetyPhrase(transcript: string): SafetyMatch {
  const text = ` ${normalize(transcript)} `;
  if (text.trim().length === 0) return NO_MATCH;

  const found: SafetyPhrase[] = [];
  const seen = new Set<string>();
  for (const { key, entry } of INDEX) {
    if (!key || seen.has(entry.phrase)) continue;
    if (text.includes(` ${key} `)) {
      seen.add(entry.phrase);
      found.push(entry);
    }
  }
  if (found.length === 0) return NO_MATCH;

  const rank: Record<SafetySeverity, number> = { critical: 3, high: 2, medium: 1 };
  const best = found.reduce((a, b) =>
    rank[b.severity] > rank[a.severity] || (rank[b.severity] === rank[a.severity] && b.confidence > a.confidence)
      ? b : a);

  return {
    matched: true,
    phrase: best.phrase,
    category: best.category,
    severity: best.severity,
    lang: best.lang,
    confidence: best.confidence,
    all: found,
  };
}

/** True when the transcript contains speech that needs an emergency response. */
export const isEmergencySpeech = (transcript: string) =>
  matchSafetyPhrase(transcript).severity === 'critical';

/** Total number of phrases in the library — shown in the UI/diagnostics. */
export const SAFETY_LEXICON_SIZE = SAFETY_LEXICON.length;

/**
 * Wake words: the safety-only subset. Everyday awareness chatter ("be careful",
 * "someone is at the door") never wakes the system — only urgent, safety
 * phrases such as help, help me, police, call the police, tulong, pulis,
 * tumawag kayo ng pulis do.
 */
export const SAFETY_WAKE_WORDS: SafetyPhrase[] = SAFETY_LEXICON.filter(
  p => p.severity === 'critical' || p.severity === 'high',
);

export const SAFETY_WAKE_WORD_COUNT = SAFETY_WAKE_WORDS.length;

/** Match a transcript against the safety-only wake-word subset. */
export function matchWakeWord(transcript: string): SafetyMatch {
  const match = matchSafetyPhrase(transcript);
  if (!match.matched) return NO_MATCH;
  const urgent = match.all.filter(p => p.severity === 'critical' || p.severity === 'high');
  if (urgent.length === 0) return NO_MATCH;
  const rank: Record<SafetySeverity, number> = { critical: 3, high: 2, medium: 1 };
  const best = urgent.reduce((a, b) =>
    rank[b.severity] > rank[a.severity] || (rank[b.severity] === rank[a.severity] && b.confidence > a.confidence)
      ? b : a);
  return {
    matched: true,
    phrase: best.phrase,
    category: best.category,
    severity: best.severity,
    lang: best.lang,
    confidence: best.confidence,
    all: urgent,
  };
}
