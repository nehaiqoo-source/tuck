package com.tuck.app.ai

data class RedactionEntry(
    val token: String,
    val original: String,
    val category: String
)

data class RedactionResult(
    val sanitizedText: String,
    val replacements: List<RedactionEntry>
) {
    val redactedCount: Int get() = replacements.size
}

object PrivacyShield {
    private val rules = listOf(
        Triple("email", "EMAIL", Regex("\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b")),
        Triple("phone", "PHONE", Regex("(?:\\+?\\d{1,3}[\\s-]?)?(?:\\(?\\d{3,5}\\)?[\\s-]?)?\\d{3,5}[\\s-]?\\d{4}\\b")),
        Triple("amount", "AMOUNT", Regex("(?:₹|\\$|€|£|INR|USD)\\s?\\d[\\d,]*(?:\\.\\d{1,2})?", RegexOption.IGNORE_CASE)),
        Triple("id", "ID", Regex("\\b(?:policy|acct|account|order|ref|claim)\\s*#?\\s*[A-Z0-9-]{4,}\\b", RegexOption.IGNORE_CASE)),
        Triple("person", "CLINIC_OR_PERSON", Regex("\\b(?:Dr\\.|Mr\\.|Ms\\.|Mrs\\.)\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?\\b"))
    )

    fun redact(text: String): RedactionResult {
        var sanitized = text
        val replacements = mutableListOf<RedactionEntry>()
        val counters = mutableMapOf<String, Int>()

        for ((category, label, regex) in rules) {
            sanitized = regex.replace(sanitized) { match ->
                val value = match.value
                if (category == "phone" && value.count { it.isDigit() } < 8) {
                    return@replace value
                }
                val existing = replacements.find { it.original == value }
                if (existing != null) return@replace existing.token

                val count = (counters[label] ?: 0) + 1
                counters[label] = count
                val token = "[${label}_$count]"
                replacements.add(RedactionEntry(token, value, category))
                token
            }
        }

        return RedactionResult(sanitized, replacements)
    }

    fun restore(text: String, replacements: List<RedactionEntry>): String {
        var restored = text
        for (entry in replacements) {
            restored = restored.replace(entry.token, entry.original)
        }
        return restored
    }
}
