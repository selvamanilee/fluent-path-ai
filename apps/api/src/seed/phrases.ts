// [text, meaning, meaning_ta, pronunciation, example, situation, practice_question, level]
type P = [string, string, string, string, string, string, string, number];

export const phrases: P[] = [
  // Day 1 — greetings & polite basics
  ['How are you?', 'a friendly way to ask about someone’s health or mood', 'நீங்கள் எப்படி இருக்கிறீர்கள்?', 'how ar yoo', 'Hi Priya, how are you?', 'Meeting a friend or colleague', 'Your friend asks "How are you?". Write your reply.', 1],
  ['Nice to meet you.', 'said when you meet someone for the first time', 'உங்களைச் சந்தித்ததில் மகிழ்ச்சி.', 'nys tuh meet yoo', 'Hello, I am Kumar. Nice to meet you.', 'First meeting with a new person', 'You meet your new manager. What do you say after your name?', 1],
  ['My name is ___.', 'used to tell someone your name', 'என் பெயர் ___.', 'my naym iz', 'My name is Selvam.', 'Introducing yourself', 'Write one sentence to tell your name.', 1],
  ['Could you please help me?', 'a polite way to ask for help', 'தயவுசெய்து எனக்கு உதவ முடியுமா?', 'kud yoo pleez help mee', 'Could you please help me with this form?', 'Asking a stranger or colleague for help', 'You cannot find the meeting room. Ask the receptionist for help.', 1],
  ['Could you explain that again?', 'a polite way to ask someone to repeat or clarify', 'அதை மீண்டும் விளக்க முடியுமா?', 'kud yoo ik-SPLAYN that uh-GEN', 'Sorry, could you explain that again?', 'When you did not understand in a meeting', 'You did not understand your trainer. What do you say?', 1],
  // Day 2+
  ['Let me check and get back to you.', 'I will find the answer and reply later', 'நான் சரிபார்த்து உங்களுக்குப் பிறகு சொல்கிறேன்.', 'let mee chek and get bak tuh yoo', 'Good question. Let me check and get back to you.', 'When you don’t know an answer right now', 'Your manager asks a question you cannot answer now. Reply politely.', 1],
  ['I will complete it by tomorrow.', 'I will finish the work before tomorrow ends', 'நான் அதை நாளைக்குள் முடித்துவிடுவேன்.', 'eye wil kum-PLEET it by tuh-MOR-oh', 'The report? I will complete it by tomorrow.', 'Giving a deadline commitment', 'Your lead asks when the task will be done. Answer with a time.', 1],
  ['I completely agree with you.', 'I fully have the same opinion', 'நான் உங்களுடன் முழுமையாக ஒப்புக்கொள்கிறேன்.', 'eye kum-PLEET-lee uh-GREE with yoo', 'I completely agree with you. Testing is important.', 'Supporting someone’s idea in a discussion', 'Your colleague says "We need more testing." Show strong agreement.', 1],
  ['Thank you for your time.', 'polite thanks at the end of a meeting or call', 'உங்கள் நேரத்துக்கு நன்றி.', 'thangk yoo for yor tym', 'Thank you for your time, Mr. Rao.', 'Ending a meeting or interview', 'Your interview is over. What do you say?', 1],
  ['Sorry for the delay.', 'an apology for being late', 'தாமதத்துக்கு மன்னிக்கவும்.', 'SOR-ee for thuh di-LAY', 'Sorry for the delay in replying.', 'Replying late to an email or joining late', 'You replied to an email two days late. Start your reply.', 1],
  ['Can we discuss this later?', 'a polite way to postpone a topic', 'இதைப் பிறகு பேசலாமா?', 'kan wee dis-KUS this LAY-ter', 'I am in a call now. Can we discuss this later?', 'When you are busy', 'A colleague wants to talk but you are busy. What do you say?', 2],
  ['Please let me know if you have any questions.', 'invites people to ask questions', 'ஏதேனும் கேள்விகள் இருந்தால் தயவுசெய்து சொல்லுங்கள்.', 'pleez let mee noh if yoo hav EN-ee KWES-chunz', 'That is the plan. Please let me know if you have any questions.', 'End of a presentation or email', 'Write the last line of an email to your team.', 2],
  ['I am working on it.', 'the task is in progress', 'நான் அதைச் செய்துகொண்டிருக்கிறேன்.', 'eye am WUR-king on it', 'The bug fix? I am working on it.', 'Stand-up meeting status', 'In stand-up, say that the login task is in progress.', 2],
  ['What do you think?', 'asks for someone’s opinion', 'நீங்கள் என்ன நினைக்கிறீர்கள்?', 'wot doo yoo thingk', 'We can use Angular. What do you think?', 'Inviting opinions', 'Ask your teammate for their opinion on a design.', 2],
  ['That makes sense.', 'I understand and it sounds logical', 'அது சரியாகப் புரிகிறது.', 'that mayks sens', 'Okay, that makes sense. Let’s do it.', 'Accepting an explanation', 'Your lead explains a decision and you understand. Reply.', 2],
];

export const phrasalVerbs: P[] = [
  ['find out', 'to discover information', 'கண்டுபிடி / தெரிந்துகொள்', 'fynd owt', 'I will find out the meeting time.', 'Getting information you don’t have', 'Use "find out" in a sentence about a train time.', 1],
  ['look into', 'to investigate or examine', 'ஆராய் / கவனி', 'luk IN-too', 'I will look into the problem.', 'Promising to investigate an issue', 'Your manager reports a slow page. Reply using "look into".', 1],
  ['follow up', 'to check again later or take the next action', 'தொடர்ந்து கவனி / மீண்டும் தொடர்பு கொள்', 'FOL-oh up', 'I will follow up with the client tomorrow.', 'After a meeting or email', 'Write a sentence promising to follow up with HR.', 1],
  ['turn on', 'to start a machine or light', 'இயக்கு / போடு', 'turn on', 'Please turn on the light.', 'At home or office', 'Use "turn on" with "fan".', 1],
  ['turn off', 'to stop a machine or light', 'அணை', 'turn off', 'Turn off the computer before you leave.', 'Saving power', 'Use "turn off" with "AC".', 1],
  ['get up', 'to rise from bed', 'எழுந்திரு', 'get up', 'I get up at six every day.', 'Daily routine', 'What time do you get up? Answer in a sentence.', 1],
  ['set up', 'to arrange or prepare something', 'அமை / ஏற்பாடு செய்', 'set up', 'Can you set up a meeting for Monday?', 'Organising meetings or systems', 'Ask a colleague to set up a call.', 2],
  ['carry on', 'to continue', 'தொடர்ந்து செய்', 'KAR-ee on', 'Please carry on with your work.', 'Continuing after a pause', 'Tell your team to continue the demo.', 2],
  ['figure out', 'to understand or solve', 'புரிந்துகொள் / தீர்வு காண்', 'FIG-yer owt', 'We need to figure out the root cause.', 'Debugging, problem-solving', 'Use "figure out" with "bug".', 2],
  ['roll back', 'to return to a previous version', 'முந்தைய நிலைக்குத் திருப்பு', 'rohl bak', 'We rolled back the release.', 'Production issues', 'Write a sentence about rolling back a deployment.', 3],
  ['bring up', 'to mention a topic', 'ஒரு விஷயத்தைக் குறிப்பிடு', 'bring up', 'I will bring up this point in the meeting.', 'Meetings', 'Use "bring up" with "budget".', 2],
  ['go through', 'to read or check carefully', 'கவனமாகப் பார் / படி', 'goh throo', 'Let’s go through the document.', 'Reviewing documents', 'Ask your teammate to read your design carefully.', 2],
];
