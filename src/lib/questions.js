export const QUESTIONS = [
  'What’s the most embarrassing thing you’ve done in public?',
  'What’s a lie you’ve told that you still stand by?',
  'Who in this room would you least want to be stuck in an elevator with?',
  'What’s the worst text you’ve ever sent to the wrong person?',
  'What’s your most irrational fear?',
  'What’s the pettiest reason you’ve stopped talking to someone?',
  'What’s something you pretend to like but secretly hate?',
  'What’s the longest you’ve gone without showering?',
  'Who in this room would survive longest in a horror movie?',
  'What’s the most money you’ve wasted on something dumb?',
  'What’s a secret you’ve kept from your parents?',
  'What’s your guilty pleasure show or song?',
  'What’s the cringiest thing you’ve done for a crush?',
  'What’s the most trouble you’ve ever been in at school?',
  'What’s one thing you’d change about yourself?',
]

// Picks a question that hasn't been used yet. If the room wrote its own,
// they get a 50% chance of coming up so they actually get played.
export function pickQuestion(customQuestions, used) {
  const fresh = (list) => list.filter((q) => !used.includes(q))
  const customLeft = fresh(customQuestions)
  const builtInLeft = fresh(QUESTIONS)

  let pool
  if (customLeft.length && (builtInLeft.length === 0 || Math.random() < 0.5)) {
    pool = customLeft
  } else if (builtInLeft.length) {
    pool = builtInLeft
  } else {
    pool = [...QUESTIONS, ...customQuestions] // everything used, start over
  }
  return pool[Math.floor(Math.random() * pool.length)]
}