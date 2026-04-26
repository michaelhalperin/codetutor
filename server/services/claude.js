// ============================================================
// Batch-evaluate answers locally (AI disabled).
// Returns an array of { questionId, is_correct, score, feedback, hint }
// ============================================================
export async function batchEvaluateAnswers(answers) {
  const results = []

  for (const a of answers) {
    const { questionId, questionType, userAnswer, correctAnswer } = a
    const normalizedUser = normalize(userAnswer)
    const normalizedCorrect = normalize(correctAnswer)

    const isDeterministic = (
      questionType === 'multiple_choice' ||
      questionType === 'true_false' ||
      questionType === 'fill_blank'
    )

    const isCorrect = isDeterministic
      ? normalizedUser === normalizedCorrect ||
        normalizedUser === normalize(String(correctAnswer || '').replace(/^[a-d]\.\s*/i, ''))
      : normalizedUser === normalizedCorrect

    const conciseExpected = formatExpectedAnswer(correctAnswer)

    results.push({
      questionId,
      is_correct: isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: isCorrect
        ? null
        : `Not correct. Expected: ${conciseExpected}`,
      hint: null,
    })
  }

  return results
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function formatExpectedAnswer(value) {
  const raw = String(value || 'N/A').trim()
  return raw
}
