import { createError, readMultipartFormData } from "h3";
import OpenAI from "openai";
import {
  whisperRequestLimit,
  whisperRequestLimitFree,
} from "~/config/audio_config";
import { redis } from "~/server/repositories/redis";
import { redactIdentifier } from "~/server/utils/logging/redact";
import { consumeWhisperAttemptMonthlyBySubject } from "../repositories/whisper/consumeWhisperAttemptMonthlyBySubject";
import { consumeWhisperAttemptSubscriptionMonthV2 } from "../repositories/whisper/consumeWhisperAttemptSubscriptionMonthV2";
import { getUserEntitlement } from "../utils/getEntitlement";
import { enforceRateLimit } from "../utils/rate-limiting/rateLimit";
import { requireUser } from "../utils/requireUser";
import { getCurrentAllowanceWindow } from "../utils/whisper/getCurrentAllowanceWindow";
import { getEchoLabAccess } from "../utils/whisper/getEchoLabAccess";
import { getPronunciationUsageSubject } from "../utils/whisper/getPronunciationUsageSubject";
import {
  averageLogprob,
  buildResult,
  normalizeChinese,
  similarity,
} from "../utils/whisper/helpers";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const form = await readMultipartFormData(event);

  const audioFile = form?.find((f) => f.name === "audio");
  const wordId = form?.find((f) => f.name === "wordId")?.data?.toString() ?? "";
  const exampleIndexRaw =
    form?.find((f) => f.name === "exampleIndex")?.data?.toString() ?? "";
  const scopeRaw =
    form?.find((f) => f.name === "scope")?.data?.toString() ?? "";
  const slugRaw = form?.find((f) => f.name === "slug")?.data?.toString() ?? "";
  const scope =
    scopeRaw === "level" || scopeRaw === "topic" ? scopeRaw : undefined;
  const slug = slugRaw || undefined;

  const exampleIndex = Number.parseInt(exampleIndexRaw, 10);

  if (!wordId || Number.isNaN(exampleIndex) || exampleIndex < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid pronunciation target",
    });
  }

  const access = await getEchoLabAccess(userId, { wordId, scope, slug });

  if (!access.allowed) {
    throw createError({
      statusCode: 403,
      statusMessage:
        access.reason === "needs_more_xp"
          ? `Earn ${Math.max(access.minXp - access.totalXp, 0)} more XP to unlock Echo Lab`
          : access.reason === "needs_more_unlocks"
            ? `Unlock ${Math.max(access.minUnlockedWords - access.unlockedWordCount, 0)} more words to use Echo Lab`
            : "Unlock this word before using Echo Lab",
    });
  }

  const entitlement = await getUserEntitlement(userId);

  const isPaid =
    !!entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan);

  const subject = getPronunciationUsageSubject(event, auth, isPaid);

  await enforceRateLimit(
    `rl:pronunciation:subject:${subject.key}`,
    isPaid ? 20 : 5,
    60,
  );

  if (!isPaid) {
    await enforceRateLimit(
      `rl:pronunciation:device:${subject.deviceId}`,
      15,
      60 * 60 * 24,
    );

    await enforceRateLimit(
      `rl:pronunciation:ip:${subject.ipHash}`,
      30,
      60 * 60 * 24,
    );
  }

  const lockKey = `lock:pronunciation:${subject.key}`;
  const acquired = await redis.set(lockKey, "1", { nx: true, ex: 30 });

  if (!acquired) {
    throw createError({
      statusCode: 429,
      statusMessage: "Pronunciation check already in progress",
    });
  }

  try {
    const limit = isPaid ? whisperRequestLimit : whisperRequestLimitFree;
    const MAX_AUDIO_SIZE = 1_000_000;

    if (!audioFile?.data) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing audio file",
      });
    }

    if (audioFile.data.length > MAX_AUDIO_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: "Audio file too large",
      });
    }

    const {
      public: { cdnBase },
    } = useRuntimeConfig();

    const word = await $fetch<any>(
      `${cdnBase}/words/${encodeURIComponent(wordId)}.json`,
    );

    const example = word?.examples?.[exampleIndex];

    if (!example?.sentence || !example?.jyutping) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid pronunciation target example",
      });
    }

    const expectedChinese = example.sentence;
    const expectedJyutping = example.jyutping;

    let remaining: number;

    if (isPaid) {
      if (!entitlement?.current_period_start) {
        throw createError({
          statusCode: 500,
          statusMessage: "Missing current subscription period start",
        });
      }

      const { windowStart, windowEnd } = getCurrentAllowanceWindow(
        entitlement.current_period_start,
      );

      ({ remaining } = await consumeWhisperAttemptSubscriptionMonthV2(
        userId,
        limit,
        windowStart,
        windowEnd,
      ));
    } else {
      ({ remaining } = await consumeWhisperAttemptMonthlyBySubject(
        subject.key,
        limit,
      ));
    }

    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioFile.data], "recording.webm", {
        type: audioFile.type || "audio/webm",
      }),
      model: "gpt-4o-mini-transcribe",
      language: "zh",
      temperature: 0,
      response_format: "json",
      include: ["logprobs"],
      prompt: `
        Do not normalize toward any expected answer.
        Transcribe exactly what was spoken.
        If the speech is Mandarin, return pinyin with tone numbers.
        If the speech is Cantonese, return Chinese characters only.
        If the speech is English, return English.`,
    });

    const transcript = transcription.text ?? "";
    const avgLogprob = averageLogprob(transcription.logprobs);

    console.log("[pronunciation-check]", {
      userHash: redactIdentifier(userId),
      subjectKind: subject.kind,
      subjectHash: redactIdentifier(subject.key),
      wordId,
      exampleIndex,
      expectedLength: expectedChinese.length,
      transcriptLength: transcript.length,
      similarity: similarity(
        normalizeChinese(expectedChinese),
        normalizeChinese(transcript),
      ),
      avgLogprob,
    });

    const result = buildResult({
      expectedChinese,
      expectedJyutping,
      transcript,
      avgLogprob,
    });

    return {
      transcript,
      heardText: transcript,
      expectedChinese,
      expectedJyutping,
      score: result.score,
      matchType: result.matchType,
      confidence: result.confidence,
      feedback: result.feedback,
      remainingAttempts: remaining,
      limit,
    };
  } catch (err: any) {
    console.error("[pronunciation-check-v3]", err);

    if (err?.statusCode) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to process pronunciation",
    });
  } finally {
    await redis.del(lockKey).catch((err) => {
      console.error("[pronunciation-check-v3] failed to release lock", err);
    });
  }
});
