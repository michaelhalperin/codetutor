import vm from 'node:vm'

function safeJsonParse(value) {
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function runJavaScriptTests(code, tests) {
  const script = new vm.Script(`
    "use strict";
    let __solution;
    ${code}
    if (typeof solve === "function") __solution = solve;
    else if (typeof solution === "function") __solution = solution;
    else if (typeof main === "function") __solution = main;
    __solution;
  `)
  const context = vm.createContext({})
  const solution = script.runInContext(context, { timeout: 800 })
  if (typeof solution !== 'function') {
    return {
      passed: false,
      score: 0,
      feedback: 'Coding answer must export solve(), solution(), or main().',
    }
  }

  let passed = 0
  for (const test of tests) {
    const input = Array.isArray(test.input) ? test.input : [test.input]
    const expected = test.expected
    const actual = solution(...input)
    if (JSON.stringify(actual) === JSON.stringify(expected)) passed += 1
  }

  const score = tests.length > 0 ? Math.round((passed / tests.length) * 100) : 0
  return {
    passed: score === 100,
    score,
    feedback: score === 100
      ? null
      : `Passed ${passed}/${tests.length} hidden tests.`,
  }
}

export function evaluateCodingAnswer({ userAnswer, correctAnswer, language }) {
  const normalizedLang = String(language || '').toLowerCase()
  const rubric = safeJsonParse(correctAnswer)
  if (!rubric || !Array.isArray(rubric.tests) || rubric.tests.length === 0) {
    return null
  }
  if (normalizedLang !== 'javascript' && normalizedLang !== 'js') {
    return {
      isCorrect: false,
      score: 0,
      feedback: 'Hidden test execution currently supports JavaScript only.',
    }
  }

  try {
    const result = runJavaScriptTests(String(userAnswer || ''), rubric.tests)
    return {
      isCorrect: result.passed,
      score: result.score,
      feedback: result.feedback,
    }
  } catch (error) {
    return {
      isCorrect: false,
      score: 0,
      feedback: `Execution failed: ${error.message}`,
    }
  }
}
