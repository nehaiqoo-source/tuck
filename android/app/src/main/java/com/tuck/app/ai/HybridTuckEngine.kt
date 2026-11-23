package com.tuck.app.ai

import android.graphics.Bitmap
import android.os.SystemClock
import com.google.firebase.Firebase
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
import com.google.firebase.ai.type.content
import com.tuck.app.model.InferenceMeta
import com.tuck.app.model.TuckItem
import org.json.JSONObject
import java.util.UUID

@OptIn(PublicPreviewAPI::class)
class HybridTuckEngine {

    private val hybridModel = Firebase.ai(backend = GenerativeBackend.googleAI())
        .generativeModel(
            modelName = "gemini-3.5-flash-lite",
            onDeviceConfig = OnDeviceConfig(
                mode = InferenceMode.PREFER_ON_DEVICE
            )
        )

    private val cloudSynthesisModel = Firebase.ai(backend = GenerativeBackend.googleAI())
        .generativeModel(
            modelName = "gemini-3.5-flash-lite",
            onDeviceConfig = OnDeviceConfig(
                mode = InferenceMode.ONLY_IN_CLOUD
            )
        )

    suspend fun summarizeSharedItem(
        rawText: String,
        url: String?,
        screenshot: Bitmap?,
        isPrivate: Boolean
    ): TuckItem {
        val started = SystemClock.elapsedRealtime()
        val prompt = """
            You are Tuck, a quiet personal triage assistant.
            Return ONLY valid JSON:
            {
              "title": "short human title (max 60 chars)",
              "summary": "1-2 plain sentences explaining why the user saved this",
              "nextAction": "one concrete next step (max 90 chars)",
              "tags": ["1 to 3 lowercase single-word tags"],
              "isPrivate": true or false
            }
            URL: ${url ?: "none"}
            Content: $rawText
        """.trimIndent()

        return try {
            val response = if (screenshot != null) {
                hybridModel.generateContent(
                    content {
                        image(screenshot)
                        text(prompt)
                    }
                )
            } else {
                hybridModel.generateContent(prompt)
            }

            val latency = SystemClock.elapsedRealtime() - started
            val rawJson = (response.text ?: "")
                .removePrefix("```json")
                .removePrefix("```")
                .removeSuffix("```")
                .trim()
            val json = JSONObject(rawJson)
            val tagsArray = json.optJSONArray("tags")
            val tags = buildList {
                if (tagsArray != null) {
                    for (i in 0 until minOf(tagsArray.length(), 3)) {
                        add(tagsArray.optString(i).lowercase().trim())
                    }
                }
            }.ifEmpty { listOf("android") }

            val now = System.currentTimeMillis()
            val id = "and-$now-${UUID.randomUUID().toString().take(4)}"
            TuckItem(
                id = id,
                title = json.optString("title").ifBlank { rawText.take(56).ifBlank { "Saved screenshot" } },
                rawContent = rawText,
                url = url,
                source = if (screenshot != null) "screenshot" else "android",
                summary = json.optString("summary").ifBlank { rawText.take(140) },
                nextAction = json.optString("nextAction").ifBlank { "Review in your daily 3-card deck." },
                tags = tags,
                isPrivate = isPrivate || json.optBoolean("isPrivate", false),
                status = "tucked",
                inferenceMeta = InferenceMeta(
                    source = "on-device",
                    model = "Firebase AI Logic (PREFER_ON_DEVICE)",
                    latencyMs = latency,
                    modeUsed = "prefer_on_device"
                ),
                createdAt = now,
                updatedAt = now
            )
        } catch (_: Exception) {
            val latency = SystemClock.elapsedRealtime() - started
            val now = System.currentTimeMillis()
            TuckItem(
                id = "and-$now-${UUID.randomUUID().toString().take(4)}",
                title = rawText.take(56).ifBlank { "Saved from Android" },
                rawContent = rawText,
                url = url,
                source = if (screenshot != null) "screenshot" else "android",
                summary = rawText.take(140).ifBlank { "Saved screenshot ready for triage." },
                nextAction = "Review in your daily 3-card deck.",
                tags = listOf(if (screenshot != null) "screenshot" else "android"),
                isPrivate = isPrivate,
                status = "tucked",
                inferenceMeta = InferenceMeta(
                    source = "on-device",
                    model = "Offline local fallback",
                    latencyMs = latency,
                    modeUsed = "prefer_on_device"
                ),
                createdAt = now,
                updatedAt = now
            )
        }
    }

    data class ShieldedAnswer(
        val text: String,
        val redactedCount: Int
    )

    suspend fun synthesizeInCloud(items: List<TuckItem>): ShieldedAnswer {
        val rawBlock = buildString {
            items.forEachIndexed { index, item ->
                appendLine("${index + 1}. ${item.title}: ${item.summary} (Next: ${item.nextAction})")
            }
        }
        val shield = PrivacyShield.redact(rawBlock)
        val prompt = """
            Combine these saved items into a concise 4-step action plan.
            Keep any bracketed placeholders like [AMOUNT_1] or [CLINIC_OR_PERSON_1] intact if referenced.
            ${shield.sanitizedText}
        """.trimIndent()
        val response = cloudSynthesisModel.generateContent(prompt)
        val restored = PrivacyShield.restore(
            response.text ?: "Could not synthesize items.",
            shield.replacements
        )
        return ShieldedAnswer(restored, shield.redactedCount)
    }

    suspend fun askYourShelf(question: String, items: List<TuckItem>): ShieldedAnswer {
        val active = items.filter { it.status != "let-go" }.take(6)
        val rawContext = active.joinToString("\n\n") { item ->
            "${item.title}: ${item.summary} (Details: ${item.rawContent}, Next: ${item.nextAction})"
        }
        val shield = PrivacyShield.redact(rawContext)
        val prompt = """
            Answer the user's question in 1-2 plain sentences using ONLY their saved items below.
            Keep any bracketed placeholders like [AMOUNT_1] intact if referenced.
            Question: $question
            Saved items:
            ${shield.sanitizedText}
        """.trimIndent()
        val response = hybridModel.generateContent(prompt)
        val restored = PrivacyShield.restore(
            response.text ?: "No matching saved item found.",
            shield.replacements
        )
        return ShieldedAnswer(restored, shield.redactedCount)
    }
}
