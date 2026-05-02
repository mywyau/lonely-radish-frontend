// import { createError, readMultipartFormData } from "h3";
// import OpenAI from "openai";
// // import { whisperRequestLimit, whisperRequestLimitFree } from "~/utils/whisper";
// import { whisperRequestLimit, whisperRequestLimitFree } from "~/config/audio_config"
// import { consumeWhisperAttemptMonthly } from "../repositories/whisper/consumeWhisperAttemptMonthly";
// import { consumeWhisperAttemptSubscriptionMonthV2 } from "../repositories/whisper/consumeWhisperAttemptSubscriptionMonthV2";
// import { getUserEntitlement } from "../utils/getEntitlement";
// import { enforceRateLimit } from "../utils/rate-limiting/rateLimit";
// import { requireUser } from "../utils/requireUser";
// import { getCurrentAllowanceWindow } from "../utils/whisper/getCurrentAllowanceWindow";
// import {
//   averageLogprob,
//   buildResult,
//   normalizeChinese,
//   similarity,
// } from "../utils/whisper/helpers";

// import { redis } from "~/server/repositories/redis";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export default defineEventHandler(async (event) => {
//   const auth = await requireUser(event);
//   const userId = auth.sub;

//   const entitlement = await getUserEntitlement(userId);

//   const isPaid =
//     entitlement &&
//     entitlement.subscription_status === "active" &&
//     ["monthly", "yearly"].includes(entitlement.plan);

//   await enforceRateLimit(`rl:pronunciation:${userId}`, isPaid ? 20 : 5, 60);

//   const lockKey = `lock:pronunciation:${userId}`;
//   const acquired = await redis.set(lockKey, "1", { nx: true, ex: 30 });

//   if (!acquired) {
//     throw createError({
//       statusCode: 429,
//       statusMessage: "Pronunciation check already in progress",
//     });
//   }

//   const limit = isPaid ? whisperRequestLimit : whisperRequestLimitFree;
//   const MAX_AUDIO_SIZE = 1_000_000;

//   const form = await readMultipartFormData(event);

//   const audioFile = form?.find((f) => f.name === "audio");

//   const expectedJyutpingField = form?.find(
//     (f) => f.name === "expectedJyutping",
//   );
//   const expectedChineseField = form?.find((f) => f.name === "expectedChinese");

//   const expectedJyutping = expectedJyutpingField?.data?.toString() ?? "";
//   const expectedChinese = expectedChineseField?.data?.toString() ?? "";

//   if (!expectedChinese || !expectedJyutping) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing pronunciation/chinese word metadata",
//     });
//   }

//   if (!audioFile?.data) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Missing audio file",
//     });
//   }

//   if (audioFile.data.length > MAX_AUDIO_SIZE) {
//     throw createError({
//       statusCode: 400,
//       statusMessage: "Audio file too large",
//     });
//   }

//   let remaining: number;

//   if (isPaid) {
//     if (!entitlement.current_period_start) {
//       throw createError({
//         statusCode: 500,
//         statusMessage: "Missing current subscription period start",
//       });
//     }

//     const { windowStart, windowEnd } = getCurrentAllowanceWindow(
//       entitlement.current_period_start,
//     );

//     ({ remaining } = await consumeWhisperAttemptSubscriptionMonthV2(
//       userId,
//       limit,
//       windowStart,
//       windowEnd,
//     ));
//   } else {
//     ({ remaining } = await consumeWhisperAttemptMonthly(userId, limit));
//   }

//   try {
//     const transcription = await openai.audio.transcriptions.create({
//       file: new File([audioFile.data], "recording.webm", {
//         type: "audio/webm",
//       }),
//       model: "gpt-4o-mini-transcribe",
//       language: "zh",
//       temperature: 0,
//       response_format: "json",
//       include: ["logprobs"],
//       prompt: `
//         Do not normalize toward any expected answer.
//         Transcribe exactly what was spoken.
//         If the speech is Mandarin, return pinyin with tone numbers.
//         If the speech is Cantonese, return Chinese characters only.
//         If the speech is English, return English.`,
//     });

//     const transcript = transcription.text ?? "";
//     const avgLogprob = averageLogprob(transcription.logprobs);

//     console.log("[pronunciation-check]", {
//       expectedChinese,
//       transcript,
//       normalizedExpected: normalizeChinese(expectedChinese),
//       normalizedHeard: normalizeChinese(transcript),
//       similarity: similarity(
//         normalizeChinese(expectedChinese),
//         normalizeChinese(transcript),
//       ),
//       avgLogprob,
//     });

//     const result = buildResult({
//       expectedChinese,
//       expectedJyutping,
//       transcript,
//       avgLogprob,
//     });

//     return {
//       transcript,
//       heardText: transcript,
//       expectedChinese,
//       expectedJyutping,
//       score: result.score,
//       matchType: result.matchType,
//       confidence: result.confidence,
//       feedback: result.feedback,
//       remainingAttempts: remaining,
//       limit,
//     };
//   } catch (err) {
//     console.error(err);

//     throw createError({
//       statusCode: 500,
//       statusMessage: "Failed to process pronunciation",
//     });
//   }
// });
