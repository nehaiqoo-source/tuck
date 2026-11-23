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

    suspend fun synthesizeInCloud(items: List<TuckItem>): String {
        val prompt = buildString {
            appendLine("Combine these saved items into a concise 4-step action plan:")
            items.forEachIndexed { index, item ->
                appendLine("${index + 1}. ${item.title}: ${item.summary} (Next: ${item.nextAction})")
            }
        }
        val response = cloudSynthesisModel.generateContent(prompt)
        return response.text ?: "Could not synthesize items."
    }
}
