export const levels: Array<[number, string, string, string]> = [
  [1, 'absolute-beginner', 'Absolute Beginner', 'Greetings, basic words, simple "am/is/are" sentences.'],
  [2, 'basic', 'Basic English', 'Everyday sentences, simple questions, basic grammar.'],
  [3, 'elementary', 'Elementary Communication', 'Short conversations, daily routines, simple tenses.'],
  [4, 'pre-intermediate', 'Pre-Intermediate', 'Workplace messages, past and future, short paragraphs.'],
  [5, 'intermediate', 'Intermediate', 'Meetings, emails, opinions, all major tenses.'],
  [6, 'upper-intermediate', 'Upper-Intermediate', 'Technical discussions, reports, complex sentences.'],
  [7, 'advanced', 'Advanced', 'Presentations, architecture discussions, nuance.'],
  [8, 'professional', 'Professional Communication', 'Leadership, negotiation, client and executive communication.'],
];

export const achievements: Array<[string, string, string, string]> = [
  ['first-day', 'First step', 'Completed your first learning day.', 'flag'],
  ['streak-3', '3-day streak', 'Learned three days in a row.', 'flame'],
  ['streak-7', 'One week strong', 'Learned seven days in a row.', 'flame'],
  ['words-50', '50 words', 'Learned 50 words.', 'book'],
  ['first-exam', 'Exam taker', 'Completed your first exam.', 'award'],
  ['exam-75', 'Passed with 75%+', 'Scored 75% or more in an exam.', 'star'],
  ['writer', 'First writing', 'Submitted your first writing exercise.', 'pen'],
  ['speaker', 'First conversation', 'Completed a speaking conversation.', 'mic'],
];

export interface ReadingSeed { level: number; title: string; body: string; words: [string, string, string][]; questions: { prompt: string; options: string[]; answer: string; explanation: string }[]; meanings_ta: string[] }

export const reading: ReadingSeed[] = [
  {
    level: 1, title: 'Meet Ravi',
    body: 'Hello! My name is Ravi. I am from Madurai. I am a software developer. I work in Chennai. I have a small family. My wife is a teacher. We have one son. His name is Arun. He is six years old. I like cricket and music.',
    words: [['developer', 'a person who builds software', 'உருவாக்குபவர் (மென்பொருள்)'], ['small', 'not big', 'சிறிய'], ['teacher', 'a person who teaches', 'ஆசிரியர்'], ['years old', 'used to say age', 'வயது']],
    meanings_ta: ['வணக்கம்!', 'என் பெயர் ரவி.', 'நான் மதுரையைச் சேர்ந்தவன்.', 'நான் ஒரு மென்பொருள் உருவாக்குநர்.', 'நான் சென்னையில் வேலை செய்கிறேன்.', 'எனக்கு ஒரு சிறிய குடும்பம் உள்ளது.', 'என் மனைவி ஒரு ஆசிரியர்.', 'எங்களுக்கு ஒரு மகன் இருக்கிறான்.', 'அவன் பெயர் அருண்.', 'அவனுக்கு ஆறு வயது.', 'எனக்கு கிரிக்கெட்டும் இசையும் பிடிக்கும்.'],
    questions: [
      { prompt: 'Where is Ravi from?', options: ['Chennai', 'Madurai', 'Salem'], answer: 'Madurai', explanation: '"I am from Madurai."' },
      { prompt: 'What is Ravi’s job?', options: ['Teacher', 'Doctor', 'Software developer'], answer: 'Software developer', explanation: '"I am a software developer."' },
      { prompt: 'What does his wife do?', options: ['She is a teacher.', 'She is a developer.', 'She is a doctor.'], answer: 'She is a teacher.', explanation: '"My wife is a teacher."' },
      { prompt: 'How old is Arun?', options: ['Five', 'Six', 'Seven'], answer: 'Six', explanation: '"He is six years old."' },
      { prompt: 'What does Ravi like?', options: ['Cricket and music', 'Cooking', 'Swimming'], answer: 'Cricket and music', explanation: '"I like cricket and music."' },
    ],
  },
  {
    level: 1, title: 'My Morning',
    body: 'I wake up at six o’clock. I brush my teeth and take a bath. My mother makes coffee. I drink coffee and read the newspaper. I eat idli for breakfast. At half past eight, I go to office by bus.',
    words: [['wake up', 'stop sleeping', 'எழுந்திரு'], ['newspaper', 'printed daily news', 'செய்தித்தாள்'], ['breakfast', 'morning meal', 'காலை உணவு'], ['half past eight', '8:30', 'எட்டரை மணி']],
    meanings_ta: ['நான் ஆறு மணிக்கு எழுந்திருக்கிறேன்.', 'நான் பல் துலக்கி குளிக்கிறேன்.', 'என் அம்மா காபி தயாரிக்கிறார்.', 'நான் காபி குடித்து செய்தித்தாள் படிக்கிறேன்.', 'நான் காலை உணவுக்கு இட்லி சாப்பிடுகிறேன்.', 'எட்டரை மணிக்கு நான் பேருந்தில் அலுவலகம் செல்கிறேன்.'],
    questions: [
      { prompt: 'What time does the writer wake up?', options: ['5:00', '6:00', '8:30'], answer: '6:00', explanation: '"I wake up at six o’clock."' },
      { prompt: 'Who makes coffee?', options: ['The writer', 'The mother', 'The father'], answer: 'The mother', explanation: '"My mother makes coffee."' },
      { prompt: 'What does the writer read?', options: ['A book', 'The newspaper', 'Emails'], answer: 'The newspaper', explanation: '"…read the newspaper."' },
      { prompt: 'What is for breakfast?', options: ['Dosa', 'Idli', 'Bread'], answer: 'Idli', explanation: '"I eat idli for breakfast."' },
      { prompt: 'How does the writer go to office?', options: ['By bus', 'By train', 'By bike'], answer: 'By bus', explanation: '"I go to office by bus."' },
    ],
  },
  {
    level: 2, title: 'A Day at the Office',
    body: 'Meena is a tester at an IT company. Every morning, her team has a stand-up meeting at ten. Each person says what they did yesterday and what they will do today. Today, Meena found a bug in the payment page. She wrote a clear bug report and shared it with the developer. The developer fixed the bug in the afternoon. Meena tested it again and closed the ticket.',
    words: [['tester', 'a person who checks software for problems', 'சோதனையாளர்'], ['stand-up meeting', 'a short daily team meeting', 'தினசரி குறுகிய குழுக் கூட்டம்'], ['bug report', 'a document that describes a software problem', 'பிழை அறிக்கை'], ['ticket', 'a task item in a tracking tool', 'பணிச் சீட்டு (Jira போன்றவை)']],
    meanings_ta: ['மீனா ஒரு ஐடி நிறுவனத்தில் சோதனையாளர்.', 'ஒவ்வொரு காலையும் பத்து மணிக்கு அவர் குழுவுக்கு ஸ்டாண்ட்-அப் கூட்டம் உண்டு.', 'ஒவ்வொருவரும் நேற்று என்ன செய்தார்கள், இன்று என்ன செய்வார்கள் என்று சொல்கிறார்கள்.', 'இன்று மீனா கட்டணப் பக்கத்தில் ஒரு பிழையைக் கண்டார்.', 'அவர் தெளிவான பிழை அறிக்கை எழுதி டெவலப்பருடன் பகிர்ந்தார்.', 'டெவலப்பர் மதியம் பிழையைச் சரிசெய்தார்.', 'மீனா மீண்டும் சோதித்து டிக்கெட்டை மூடினார்.'],
    questions: [
      { prompt: 'What is Meena’s job?', options: ['Developer', 'Tester', 'Manager'], answer: 'Tester', explanation: '"Meena is a tester."' },
      { prompt: 'When is the stand-up meeting?', options: ['At nine', 'At ten', 'In the afternoon'], answer: 'At ten', explanation: '"…a stand-up meeting at ten."' },
      { prompt: 'Where was the bug?', options: ['Login page', 'Payment page', 'Home page'], answer: 'Payment page', explanation: '"…a bug in the payment page."' },
      { prompt: 'Who fixed the bug?', options: ['Meena', 'The manager', 'The developer'], answer: 'The developer', explanation: '"The developer fixed the bug…"' },
      { prompt: 'What did Meena do at the end?', options: ['Closed the ticket', 'Wrote code', 'Went home'], answer: 'Closed the ticket', explanation: '"…and closed the ticket."' },
    ],
  },
];

export const writing: Array<{ level: number; topic: string; instructions: string; instructions_ta: string; min: number; keywords: string[]; reference: string }> = [
  { level: 1, topic: 'Introduce yourself', instructions: 'Write 3–5 simple sentences about yourself: your name, where you are from, and your job.', instructions_ta: 'உங்களைப் பற்றி 3–5 எளிய வாக்கியங்கள் எழுதுங்கள்: பெயர், ஊர், வேலை.', min: 3, keywords: ['name', 'am', 'from'], reference: 'My name is Selvam. I am from Trichy. I am a Technical Lead. I work in Chennai. I like learning new things.' },
  { level: 1, topic: 'My family', instructions: 'Write 3–5 sentences about your family members.', instructions_ta: 'உங்கள் குடும்ப உறுப்பினர்களைப் பற்றி 3–5 வாக்கியங்கள் எழுதுங்கள்.', min: 3, keywords: ['family', 'my'], reference: 'I have a small family. My father is a farmer. My mother is a homemaker. I have one sister. We live in Salem.' },
  { level: 1, topic: 'My daily routine', instructions: 'Write 3–5 sentences about what you do every morning.', instructions_ta: 'நீங்கள் தினமும் காலையில் என்ன செய்கிறீர்கள் என்று 3–5 வாக்கியங்கள் எழுதுங்கள்.', min: 3, keywords: ['I', 'at'], reference: 'I wake up at six. I drink coffee. I take a bath at seven. I eat breakfast. I go to office at nine.' },
  { level: 2, topic: 'A message to your manager', instructions: 'Write a short message to tell your manager that you will be late today and why.', instructions_ta: 'இன்று தாமதமாக வருவீர்கள் என்றும் காரணத்தையும் உங்கள் மேலாளருக்கு ஒரு சிறிய செய்தியாக எழுதுங்கள்.', min: 3, keywords: ['late', 'sorry'], reference: 'Hi Ramesh, I will be about 30 minutes late today because of heavy traffic. I will join the stand-up from my phone. Sorry for the inconvenience.' },
  { level: 2, topic: 'Your work today', instructions: 'Write a stand-up update: what you did yesterday, what you will do today, and any blockers.', instructions_ta: 'ஸ்டாண்ட்-அப் புதுப்பிப்பு எழுதுங்கள்: நேற்று செய்தது, இன்று செய்வது, தடைகள்.', min: 3, keywords: ['yesterday', 'today'], reference: 'Yesterday, I completed the login API. Today, I will write unit tests for it. I have no blockers.' },
];

export const speaking: Array<{ level: number; topic: string; intro: string; questions: { prompt: string; prompt_ta: string; pattern: string; sample: string }[] }> = [
  { level: 1, topic: 'Greetings and introduction', intro: 'Let’s practise greeting someone and introducing yourself. Answer one question at a time.', questions: [
    { prompt: 'Hello! How are you today?', prompt_ta: 'வணக்கம்! இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?', pattern: 'I am ___, thank you.', sample: 'I am fine, thank you. How are you?' },
    { prompt: 'What is your name?', prompt_ta: 'உங்கள் பெயர் என்ன?', pattern: 'My name is ___.', sample: 'My name is Selvam.' },
    { prompt: 'Where are you from?', prompt_ta: 'நீங்கள் எந்த ஊரைச் சேர்ந்தவர்?', pattern: 'I am from ___.', sample: 'I am from Coimbatore.' },
    { prompt: 'What do you do?', prompt_ta: 'நீங்கள் என்ன வேலை செய்கிறீர்கள்?', pattern: 'I am a ___. / I work as a ___.', sample: 'I am a software developer.' },
    { prompt: 'Nice to meet you!', prompt_ta: 'உங்களைச் சந்தித்ததில் மகிழ்ச்சி!', pattern: 'Nice to meet you too.', sample: 'Nice to meet you too.' },
  ]},
  { level: 1, topic: 'Family and friends', intro: 'Tell me about the people in your life.', questions: [
    { prompt: 'Do you have a big family or a small family?', prompt_ta: 'உங்களுக்குப் பெரிய குடும்பமா சிறிய குடும்பமா?', pattern: 'I have a ___ family.', sample: 'I have a small family.' },
    { prompt: 'Who lives with you?', prompt_ta: 'உங்களுடன் யார் வசிக்கிறார்கள்?', pattern: 'My ___ and my ___ live with me.', sample: 'My wife and my son live with me.' },
    { prompt: 'Who is your best friend?', prompt_ta: 'உங்கள் சிறந்த நண்பர் யார்?', pattern: 'My best friend is ___.', sample: 'My best friend is Karthik.' },
  ]},
  { level: 2, topic: 'Daily activities', intro: 'Let’s talk about your day.', questions: [
    { prompt: 'What time do you wake up?', prompt_ta: 'நீங்கள் எத்தனை மணிக்கு எழுந்திருக்கிறீர்கள்?', pattern: 'I wake up at ___.', sample: 'I wake up at six o’clock.' },
    { prompt: 'How do you go to work?', prompt_ta: 'நீங்கள் வேலைக்கு எப்படிச் செல்கிறீர்கள்?', pattern: 'I go to work by ___.', sample: 'I go to work by bike.' },
    { prompt: 'What do you do in the evening?', prompt_ta: 'மாலையில் என்ன செய்கிறீர்கள்?', pattern: 'In the evening, I ___.', sample: 'In the evening, I play with my son.' },
  ]},
  { level: 2, topic: 'Office conversation', intro: 'Practise a short chat with a colleague.', questions: [
    { prompt: 'Good morning! What are you working on today?', prompt_ta: 'காலை வணக்கம்! இன்று நீங்கள் எதில் வேலை செய்கிறீர்கள்?', pattern: 'Today I am working on ___.', sample: 'Good morning! Today I am working on the login page.' },
    { prompt: 'Do you need any help?', prompt_ta: 'உங்களுக்கு ஏதேனும் உதவி வேண்டுமா?', pattern: 'Yes, could you ___? / No, thank you.', sample: 'Yes, could you review my code after lunch?' },
    { prompt: 'When will it be ready?', prompt_ta: 'அது எப்போது தயாராகும்?', pattern: 'It will be ready by ___.', sample: 'It will be ready by tomorrow evening.' },
  ]},
];

export const technical: Array<{ level: number; topic: string; title: string; situation: string; questions: { prompt: string; pattern: string; sample: string }[]; terms: [string, string, string][] }> = [
  { level: 2, topic: 'Daily stand-up', title: 'Give your stand-up update', situation: 'It is 10 AM. Your Scrum Master asks you for your daily update.', terms: [['blocker', 'something stopping your work', 'தடை'], ['in progress', 'not finished yet', 'நடந்துகொண்டிருக்கிறது']], questions: [
    { prompt: 'What did you do yesterday?', pattern: 'Yesterday, I ___.', sample: 'Yesterday, I completed the user profile API.' },
    { prompt: 'What will you do today?', pattern: 'Today, I will ___.', sample: 'Today, I will write unit tests for it.' },
    { prompt: 'Do you have any blockers?', pattern: 'I have no blockers. / I am blocked by ___.', sample: 'I am blocked because I don’t have database access.' },
  ]},
  { level: 3, topic: 'Production issues', title: 'Explain a production issue to your manager', situation: 'Users cannot log in since 9 AM. You found the cause. Explain it to your manager.', terms: [['root cause', 'the main reason for a problem', 'அடிப்படைக் காரணம்'], ['impact', 'the effect on users or business', 'தாக்கம்'], ['hotfix', 'a quick fix released urgently', 'அவசரத் திருத்தம்']], questions: [
    { prompt: 'What happened?', pattern: 'Since ___, users ___.', sample: 'Since 9 AM, users have not been able to log in.' },
    { prompt: 'What caused the issue?', pattern: 'The root cause is ___.', sample: 'The root cause is an expired SSL certificate on the auth server.' },
    { prompt: 'What is the impact?', pattern: 'About ___ users are affected.', sample: 'About 2,000 users are affected, and new orders have stopped.' },
    { prompt: 'What is the solution?', pattern: 'We will ___.', sample: 'We will renew the certificate and restart the service.' },
    { prompt: 'When will it be resolved?', pattern: 'It will be resolved by ___.', sample: 'It will be resolved within 30 minutes.' },
  ]},
  { level: 3, topic: 'Code reviews', title: 'Give polite code review feedback', situation: 'You are reviewing a teammate’s pull request. The function is too long and has no tests.', terms: [['pull request', 'a request to merge code changes', 'குறியீடு இணைப்புக் கோரிக்கை'], ['refactor', 'improve code structure without changing behaviour', 'மறுசீரமை']], questions: [
    { prompt: 'Start with something positive about the code.', pattern: 'Nice work on ___.', sample: 'Nice work on the validation logic.' },
    { prompt: 'Suggest splitting the long function.', pattern: 'Could we split ___ into ___?', sample: 'Could we split this function into two smaller functions?' },
    { prompt: 'Ask for tests.', pattern: 'Could you please add ___?', sample: 'Could you please add unit tests for the error cases?' },
  ]},
];

// Exam bank — 4 exam types. answer = accepted answers (objective) or keywords (free).
export interface Q { type: 'read' | 'write' | 'speak' | 'lesson'; skill: string; level: number; difficulty: number; kind: 'mcq' | 'fill' | 'correct' | 'free'; prompt: string; context?: string; options?: string[]; answer: string[]; explanation: string; marks: number }
const P1 = 'Kavya is a developer. She works at a bank in Chennai. Every day she takes the metro to office. She starts work at nine. In the evening, she goes for a walk with her friend Divya.';
const P2 = 'Dear team, the server will be down for maintenance on Saturday from 10 PM to 2 AM. Please save your work before 9:30 PM. Contact Raj if you have any questions. Thanks, IT Support';

export const examBank: Q[] = [
  // READ (each 10)
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 1, kind: 'mcq', context: P1, prompt: 'Where does Kavya work?', options: ['At a school', 'At a bank', 'At a hospital'], answer: ['At a bank'], explanation: '"She works at a bank in Chennai."', marks: 10 },
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 1, kind: 'mcq', context: P1, prompt: 'How does Kavya go to office?', options: ['By bus', 'By metro', 'By car'], answer: ['By metro'], explanation: '"she takes the metro to office."', marks: 10 },
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 1, kind: 'mcq', context: P1, prompt: 'What time does she start work?', options: ['At eight', 'At nine', 'At ten'], answer: ['At nine'], explanation: '"She starts work at nine."', marks: 10 },
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 2, kind: 'mcq', context: P1, prompt: 'Who is Divya?', options: ['Her sister', 'Her manager', 'Her friend'], answer: ['Her friend'], explanation: '"…with her friend Divya."', marks: 10 },
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 2, kind: 'mcq', context: P2, prompt: 'Why will the server be down?', options: ['For maintenance', 'Because of a bug', 'For a holiday'], answer: ['For maintenance'], explanation: '"…down for maintenance…"', marks: 10 },
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 2, kind: 'mcq', context: P2, prompt: 'By what time should you save your work?', options: ['9:30 PM', '10 PM', '2 AM'], answer: ['9:30 PM'], explanation: '"Please save your work before 9:30 PM."', marks: 10 },
  { type: 'read', skill: 'comprehension', level: 1, difficulty: 2, kind: 'mcq', context: P2, prompt: 'Who should you contact with questions?', options: ['IT Support', 'Raj', 'The team'], answer: ['Raj'], explanation: '"Contact Raj if you have any questions."', marks: 10 },
  { type: 'read', skill: 'vocabulary', level: 1, difficulty: 1, kind: 'mcq', prompt: 'What does "maintenance" mean?', options: ['Work to keep something in good condition', 'A party', 'A new product'], answer: ['Work to keep something in good condition'], explanation: 'Maintenance = பராமரிப்பு.', marks: 10 },
  { type: 'read', skill: 'vocabulary', level: 1, difficulty: 1, kind: 'mcq', prompt: 'The opposite of "start" is…', options: ['begin', 'finish', 'open'], answer: ['finish'], explanation: 'start ↔ finish.', marks: 10 },
  { type: 'read', skill: 'sentence-meaning', level: 1, difficulty: 2, kind: 'mcq', prompt: '"Let me check and get back to you." means…', options: ['I will find out and reply later.', 'Please go back.', 'I don’t want to answer.'], answer: ['I will find out and reply later.'], explanation: 'It is a polite promise to reply later.', marks: 10 },
  { type: 'read', skill: 'sentence-meaning', level: 1, difficulty: 1, kind: 'mcq', prompt: '"I am tired." means…', options: ['I need rest.', 'I am hungry.', 'I am happy.'], answer: ['I need rest.'], explanation: 'tired = சோர்வு.', marks: 10 },
  // WRITE
  { type: 'write', skill: 'sentence-formation', level: 1, difficulty: 1, kind: 'fill', prompt: 'Put the words in order: (am / a / I / developer)', answer: ['I am a developer', 'I am a developer.'], explanation: 'Subject + verb + complement: I am a developer.', marks: 10 },
  { type: 'write', skill: 'sentence-formation', level: 1, difficulty: 1, kind: 'fill', prompt: 'Put the words in order: (coffee / drinks / she)', answer: ['She drinks coffee', 'She drinks coffee.'], explanation: 'Subject + Verb + Object.', marks: 10 },
  { type: 'write', skill: 'grammar', level: 1, difficulty: 1, kind: 'correct', prompt: 'Correct the sentence: "He are my friend."', answer: ['He is my friend', 'He is my friend.'], explanation: '"He" takes "is".', marks: 10 },
  { type: 'write', skill: 'grammar', level: 1, difficulty: 1, kind: 'correct', prompt: 'Correct the sentence: "I has a laptop."', answer: ['I have a laptop', 'I have a laptop.'], explanation: '"I" takes "have".', marks: 10 },
  { type: 'write', skill: 'grammar', level: 1, difficulty: 2, kind: 'correct', prompt: 'Correct the sentence: "She work in Chennai."', answer: ['She works in Chennai', 'She works in Chennai.'], explanation: 'He/She/It + verb + s.', marks: 10 },
  { type: 'write', skill: 'grammar', level: 1, difficulty: 2, kind: 'correct', prompt: 'Correct the sentence: "I am engineer."', answer: ['I am an engineer', 'I am an engineer.'], explanation: 'Use "an" before a vowel sound.', marks: 10 },
  { type: 'write', skill: 'paragraph', level: 1, difficulty: 2, kind: 'free', prompt: 'Write 3 sentences about your favourite food.', answer: ['like', 'food'], explanation: 'Example: I like dosa. My mother makes it on Sundays. I eat it with chutney.', marks: 20 },
  { type: 'write', skill: 'email', level: 1, difficulty: 3, kind: 'free', prompt: 'Write a 3-sentence message to your manager asking for leave tomorrow.', answer: ['leave', 'tomorrow'], explanation: 'Example: Hi Sir, could I take leave tomorrow? I have a family function. I will finish my tasks today.', marks: 20 },
  // SPEAK (typed/voice transcript — fluency & grammar; pronunciation only when audio is assessed)
  { type: 'speak', skill: 'introduction', level: 1, difficulty: 1, kind: 'free', prompt: 'Introduce yourself in 2–3 sentences.', answer: ['name', 'am'], explanation: 'Example: Hello, my name is Selvam. I am from Trichy. I am a Technical Lead.', marks: 20 },
  { type: 'speak', skill: 'greetings', level: 1, difficulty: 1, kind: 'free', prompt: 'Your colleague says "Good morning! How are you?" Reply.', answer: ['morning', 'fine'], explanation: 'Example: Good morning! I am fine, thank you. How are you?', marks: 20 },
  { type: 'speak', skill: 'daily-activities', level: 1, difficulty: 2, kind: 'free', prompt: 'Describe what you do every morning.', answer: ['I', 'morning'], explanation: 'Example: I wake up at six. I drink coffee and go for a walk.', marks: 20 },
  { type: 'speak', skill: 'family', level: 1, difficulty: 1, kind: 'free', prompt: 'Talk about your family.', answer: ['family', 'my'], explanation: 'Example: I have a small family. My wife is a teacher.', marks: 20 },
  { type: 'speak', skill: 'requests', level: 1, difficulty: 2, kind: 'free', prompt: 'Politely ask a colleague to help you with a problem.', answer: ['could', 'help'], explanation: 'Example: Could you please help me with this error?', marks: 20 },
  { type: 'speak', skill: 'opinions', level: 1, difficulty: 3, kind: 'free', prompt: 'Why do you want to improve your English?', answer: ['want', 'English'], explanation: 'Example: I want to speak confidently in meetings and lead my team.', marks: 20 },
  // LESSON
  { type: 'lesson', skill: 'grammar', level: 1, difficulty: 1, kind: 'mcq', prompt: 'They ___ my colleagues.', options: ['is', 'am', 'are'], answer: ['are'], explanation: 'They → are.', marks: 10 },
  { type: 'lesson', skill: 'grammar', level: 1, difficulty: 1, kind: 'mcq', prompt: 'She ___ two brothers.', options: ['have', 'has'], answer: ['has'], explanation: 'She → has.', marks: 10 },
  { type: 'lesson', skill: 'grammar', level: 1, difficulty: 1, kind: 'mcq', prompt: 'I have ___ idea.', options: ['a', 'an'], answer: ['an'], explanation: '"idea" starts with a vowel sound.', marks: 10 },
  { type: 'lesson', skill: 'tenses', level: 1, difficulty: 2, kind: 'mcq', prompt: 'He ___ to office every day.', options: ['go', 'goes', 'going'], answer: ['goes'], explanation: 'Simple present with he → goes.', marks: 10 },
  { type: 'lesson', skill: 'tenses', level: 1, difficulty: 2, kind: 'mcq', prompt: 'Look! It ___ raining.', options: ['is', 'are', 'am'], answer: ['is'], explanation: 'Present continuous: it is + -ing.', marks: 10 },
  { type: 'lesson', skill: 'vocabulary', level: 1, difficulty: 1, kind: 'mcq', prompt: 'What is "வணக்கம்" in English?', options: ['Goodbye', 'Hello', 'Sorry'], answer: ['Hello'], explanation: 'வணக்கம் = Hello.', marks: 10 },
  { type: 'lesson', skill: 'vocabulary', level: 1, difficulty: 1, kind: 'mcq', prompt: 'What is "நன்றி" in English?', options: ['Please', 'Thank you', 'Welcome'], answer: ['Thank you'], explanation: 'நன்றி = Thank you.', marks: 10 },
  { type: 'lesson', skill: 'phrases', level: 1, difficulty: 2, kind: 'mcq', prompt: 'You did not understand. What do you say?', options: ['Could you explain that again?', 'I completely agree with you.', 'Thank you for your time.'], answer: ['Could you explain that again?'], explanation: 'Use this to ask for clarification.', marks: 10 },
  { type: 'lesson', skill: 'phrasal-verbs', level: 1, difficulty: 2, kind: 'mcq', prompt: 'I will ___ the problem and tell you. (investigate)', options: ['look into', 'turn off', 'get up'], answer: ['look into'], explanation: '"look into" = investigate.', marks: 10 },
  { type: 'lesson', skill: 'sentence-correction', level: 1, difficulty: 2, kind: 'correct', prompt: 'Correct: "Where you are from?"', answer: ['Where are you from?', 'Where are you from'], explanation: 'Questions: question word + be + subject.', marks: 10 },
  { type: 'lesson', skill: 'sentence-correction', level: 1, difficulty: 2, kind: 'correct', prompt: 'Correct: "She can speaks English."', answer: ['She can speak English.', 'She can speak English'], explanation: 'After "can", use the base verb.', marks: 10 },
  { type: 'lesson', skill: 'grammar', level: 1, difficulty: 3, kind: 'fill', prompt: 'Plural of "child": ___', answer: ['children'], explanation: 'Irregular plural.', marks: 10 },
];

// Day blueprints for Level 1 (seed). Days beyond these are assembled from the content pool.
export const plans: Array<{ day: number; title: string; grammar: string; reading: string; writing: string; speaking: string; vocab: string[] }> = [
  { day: 1, title: 'Hello, English! Greetings & introductions', grammar: 'is-am-are', reading: 'Meet Ravi', writing: 'Introduce yourself', speaking: 'Greetings and introduction', vocab: ['greetings'] },
  { day: 2, title: 'My family', grammar: 'pronouns', reading: 'Meet Ravi', writing: 'My family', speaking: 'Family and friends', vocab: ['family'] },
  { day: 3, title: 'My morning', grammar: 'subject-verb-object', reading: 'My Morning', writing: 'My daily routine', speaking: 'Daily activities', vocab: ['routines', 'daily-actions'] },
  { day: 4, title: 'Things around me', grammar: 'articles', reading: 'My Morning', writing: 'My daily routine', speaking: 'Family and friends', vocab: ['household', 'kitchen'] },
  { day: 5, title: 'Food and shopping', grammar: 'singular-plural', reading: 'My Morning', writing: 'My family', speaking: 'Daily activities', vocab: ['fruits', 'food-groceries'] },
];
