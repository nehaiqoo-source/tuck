package com.tuck.app.model

data class InferenceMeta(
    val source: String = "on-device",
    val model: String = "Gemini Nano (Android AICore)",
    val latencyMs: Long = 0L,
    val modeUsed: String = "prefer_on_device"
)

data class TuckItem(
    val id: String = "",
    val title: String = "",
    val rawContent: String = "",
    val url: String? = null,
    val source: String = "android",
    val summary: String = "",
    val nextAction: String = "",
    val tags: List<String> = emptyList(),
    val isPrivate: Boolean = false,
    val status: String = "tucked",
    val inferenceMeta: InferenceMeta = InferenceMeta(),
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
