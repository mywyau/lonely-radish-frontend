import { describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "createError",
  ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) => {
    const error = new Error(statusMessage) as Error & {
      statusCode: number;
      statusMessage: string;
    };
    error.statusCode = statusCode;
    error.statusMessage = statusMessage;
    return error;
  },
);

const levelFinalize = {
  normalizeAndValidateAnswers: (
    await import(
      "../server/services/sentence-quiz/finalize/normalizeAndValidateAnswers"
    )
  ).normalizeAndValidateAnswers,
  aggregateSentenceAnswers: (
    await import("../server/services/sentence-quiz/finalize/aggregateSentenceAnswers")
  ).aggregateSentenceAnswers,
  buildWordOutcomeMap: (
    await import("../server/services/sentence-quiz/finalize/buildWordOutcomeMap")
  ).buildWordOutcomeMap,
  buildPayloadAnswers: (
    await import("../server/services/sentence-quiz/finalize/buildPayloadAnswers")
  ).buildPayloadAnswers,
  deltaFor: (await import("../server/services/sentence-quiz/finalize/deltaFor"))
    .deltaFor,
};

const topicFinalize = {
  normalizeAndValidateAnswers: (
    await import(
      "../server/services/topic/sentence-quiz/finalize/normalizeAndValidateAnswers"
    )
  ).normalizeAndValidateAnswers,
  aggregateSentenceAnswers: (
    await import(
      "../server/services/topic/sentence-quiz/finalize/aggregateSentenceAnswers"
    )
  ).aggregateSentenceAnswers,
  buildWordOutcomeMap: (
    await import(
      "../server/services/topic/sentence-quiz/finalize/buildWordOutcomeMap"
    )
  ).buildWordOutcomeMap,
  buildPayloadAnswers: (
    await import(
      "../server/services/topic/sentence-quiz/finalize/buildPayloadAnswers"
    )
  ).buildPayloadAnswers,
  deltaFor: (
    await import("../server/services/topic/sentence-quiz/finalize/deltaFor")
  ).deltaFor,
};

const suites = [
  {
    label: "level sentence quiz finalize helpers",
    helpers: levelFinalize,
    mode: "level-sentences" as const,
  },
  {
    label: "topic sentence quiz finalize helpers",
    helpers: topicFinalize,
    mode: "topic-sentences" as const,
  },
];

for (const { label, helpers, mode } of suites) {
  describe(label, () => {
    it("normalizes answers, trims ids, and keeps the first answer per allowed pair", () => {
      const allowedPairs = new Set(["word-1:sentence-1", "word-2:sentence-2"]);

      expect(
        helpers.normalizeAndValidateAnswers(
          [
            { wordId: " word-1 ", sentenceId: " sentence-1 ", correct: true },
            { wordId: "word-1", sentenceId: "sentence-1", correct: false },
            { wordId: "word-2", sentenceId: "sentence-2", correct: false },
          ],
          allowedPairs,
        ),
      ).toEqual([
        { wordId: "word-1", sentenceId: "sentence-1", correct: true },
        { wordId: "word-2", sentenceId: "sentence-2", correct: false },
      ]);
    });

    it("rejects non-array, malformed, and out-of-session answers", () => {
      const allowedPairs = new Set(["word-1:sentence-1"]);

      expect(() =>
        helpers.normalizeAndValidateAnswers(null, allowedPairs),
      ).toThrow("Invalid answers payload");

      expect(() =>
        helpers.normalizeAndValidateAnswers(
          [{ wordId: "word-1", sentenceId: "sentence-1", correct: "true" }],
          allowedPairs,
        ),
      ).toThrow("Malformed answer payload");

      expect(() =>
        helpers.normalizeAndValidateAnswers(
          [{ wordId: "word-2", sentenceId: "sentence-2", correct: true }],
          allowedPairs,
        ),
      ).toThrow("Answer does not belong to this quiz session");
    });

    it("aggregates sentence attempts by sentence id", () => {
      expect(
        helpers.aggregateSentenceAnswers([
          { wordId: "word-1", sentenceId: "sentence-1", correct: true },
          { wordId: "word-1", sentenceId: "sentence-1", correct: false },
          { wordId: "word-2", sentenceId: "sentence-2", correct: false },
        ]),
      ).toEqual([
        {
          wordId: "word-1",
          sentenceId: "sentence-1",
          seenInc: 2,
          correctInc: 1,
          wrongInc: 1,
        },
        {
          wordId: "word-2",
          sentenceId: "sentence-2",
          seenInc: 1,
          correctInc: 0,
          wrongInc: 1,
        },
      ]);
    });

    it("uses the first word outcome when building XP payload answers", () => {
      const answers = [
        { wordId: "word-1", sentenceId: "sentence-1", correct: true },
        { wordId: "word-1", sentenceId: "sentence-2", correct: false },
        { wordId: "word-2", sentenceId: "sentence-3", correct: false },
      ];

      expect([...helpers.buildWordOutcomeMap(answers).entries()]).toEqual([
        ["word-1", true],
        ["word-2", false],
      ]);

      expect(
        helpers.buildPayloadAnswers(
          mode,
          answers,
          new Map([
            ["word-1", 2],
            ["word-2", 9],
          ]),
        ),
      ).toEqual([
        { wordId: "word-1", correct: true, delta: 16 },
        { wordId: "word-2", correct: false, delta: -12 },
      ]);
    });

    it("caps positive streak bonus and applies the wrong-answer penalty", () => {
      expect(helpers.deltaFor(mode, true, 0)).toBe(10);
      expect(helpers.deltaFor(mode, true, 5)).toBe(25);
      expect(helpers.deltaFor(mode, true, 50)).toBe(25);
      expect(helpers.deltaFor(mode, false, 50)).toBe(-12);
    });
  });
}
