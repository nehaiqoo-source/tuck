package com.tuck.app

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.tuck.app.ai.HybridTuckEngine
import com.tuck.app.model.InferenceMeta
import com.tuck.app.model.TuckItem
import kotlinx.coroutines.launch

private val WarmPaper = Color(0xFFFAF8F4)
private val CardWhite = Color(0xFFFFFFFF)
private val InkBlack = Color(0xFF1C1917)
private val MutedStone = Color(0xFF645E56)
private val Terracotta = Color(0xFFC25934)
private val SageGreen = Color(0xFF1F5C41)
private val SageSoft = Color(0xFFE8F3ED)

class MainActivity : ComponentActivity() {

    private val engine by lazy { HybridTuckEngine() }
    private val sharedDraft = mutableStateOf("")
    private val sharedBitmap = mutableStateOf<Bitmap?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIncomingShare(intent)

        setContent {
            MaterialTheme {
                TuckAndroidScreen(
                    engine = engine,
                    initialDraft = sharedDraft.value,
                    sharedScreenshot = sharedBitmap.value,
                    onConsumeShare = {
                        sharedDraft.value = ""
                        sharedBitmap.value = null
                    }
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIncomingShare(intent)
    }

    private fun handleIncomingShare(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return
        when {
            intent.type == "text/plain" -> {
                sharedDraft.value = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            }
            intent.type?.startsWith("image/") == true -> {
                val uri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_STREAM)
                }
                if (uri != null) {
                    val source = ImageDecoder.createSource(contentResolver, uri)
                    sharedBitmap.value = ImageDecoder.decodeBitmap(source)
                    if (sharedDraft.value.isBlank()) {
                        sharedDraft.value = "Shared screenshot from Android"
                    }
                }
            }
        }
    }
}

@Composable
private fun TuckAndroidScreen(
    engine: HybridTuckEngine,
    initialDraft: String,
    sharedScreenshot: Bitmap?,
    onConsumeShare: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var noteText by remember(initialDraft) { mutableStateOf(initialDraft) }
    var isPrivate by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var synthesizing by remember { mutableStateOf(false) }
    var synthesisPlan by remember { mutableStateOf<String?>(null) }
    var items by remember {
        mutableStateOf(
            listOf(
                TuckItem(
                    id = "and-seed-1",
                    title = "Dentist receipt: Dr. Mehta Clinic",
                    rawContent = "OPD reimbursement due Dec 15",
                    source = "screenshot",
                    summary = "Dental clinic receipt for ₹3,400 with Dec 15 reimbursement deadline.",
                    nextAction = "Upload receipt to HR portal before Dec 15.",
                    tags = listOf("receipt", "private"),
                    isPrivate = true,
                    inferenceMeta = InferenceMeta(
                        source = "on-device",
                        model = "Gemini Nano (Android AICore)",
                        latencyMs = 154L
                    )
                ),
                TuckItem(
                    id = "and-seed-2",
                    title = "Kyoto backstreet ramen spots",
                    rawContent = "Menya Inoichi Hanare opens at 11am, get a ticket at 10:15am.",
                    source = "chrome-tab",
                    summary = "Recommended Kyoto ramen spot with a 10:15am queue ticket tip.",
                    nextAction = "Pin Menya Inoichi Hanare on Kyoto map.",
                    tags = listOf("travel", "kyoto"),
                    isPrivate = false,
                    inferenceMeta = InferenceMeta(
                        source = "on-device",
                        model = "Gemini Nano (Chrome)",
                        latencyMs = 138L
                    )
                )
            )
        )
    }

    // Real-time Firestore sync when signed in
    DisposableEffect(Unit) {
        val uid = FirebaseAuth.getInstance().currentUser?.uid
        val listener = if (uid != null) {
            FirebaseFirestore.getInstance()
                .collection("users")
                .document(uid)
                .collection("items")
                .addSnapshotListener { snap, _ ->
                    val remote = snap?.documents?.mapNotNull { it.toObject(TuckItem::class.java) }
                    if (!remote.isNullOrEmpty()) {
                        items = remote.sortedByDescending { it.createdAt }
                    }
                }
        } else null
        onDispose { listener?.remove() }
    }

    val currentCard = items.firstOrNull { it.status == "tucked" }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = WarmPaper
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Tuck",
                        fontSize = 30.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = InkBlack
                    )
                    Text(
                        text = "Read it later, actually.",
                        fontSize = 12.sp,
                        color = MutedStone
                    )
                }
                Surface(
                    color = SageSoft,
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Text(
                        text = "Hybrid AI · Prefer On-Device",
                        color = SageGreen,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }

            // Quick Tuck Composer
            Surface(
                color = CardWhite,
                shape = RoundedCornerShape(18.dp),
                tonalElevation = 1.dp
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = noteText,
                        onValueChange = { noteText = it },
                        placeholder = { Text("Paste a link, note, or share a screenshot...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                    if (sharedScreenshot != null) {
                        Text(
                            text = "Screenshot attached from Android Share Sheet",
                            fontSize = 12.sp,
                            color = SageGreen,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = isPrivate,
                                onCheckedChange = { isPrivate = it }
                            )
                            Text("Private on-device", fontSize = 13.sp, color = MutedStone)
                        }
                        Button(
                            onClick = {
                                if (noteText.isBlank() && sharedScreenshot == null) return@Button
                                scope.launch {
                                    busy = true
                                    val url = Regex("https?://\\S+").find(noteText)?.value
                                    val created = engine.summarizeSharedItem(
                                        rawText = noteText.trim(),
                                        url = url,
                                        screenshot = sharedScreenshot,
                                        isPrivate = isPrivate
                                    )
                                    items = listOf(created) + items
                                    val uid = FirebaseAuth.getInstance().currentUser?.uid
                                    if (uid != null) {
                                        FirebaseFirestore.getInstance()
                                            .collection("users")
                                            .document(uid)
                                            .collection("items")
                                            .document(created.id)
                                            .set(created)
                                    }
                                    noteText = ""
                                    isPrivate = false
                                    onConsumeShare()
                                    busy = false
                                }
                            },
                            enabled = !busy,
                            colors = ButtonDefaults.buttonColors(containerColor = Terracotta),
                            shape = RoundedCornerShape(999.dp)
                        ) {
                            Text(if (busy) "Tucking..." else "Tuck it")
                        }
                    }
                }
            }

            // Daily 3-Card Triage Deck
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Today's forgotten saves",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = InkBlack
                )
                if (items.size >= 2) {
                    TextButton(
                        onClick = {
                            scope.launch {
                                synthesizing = true
                                synthesisPlan = try {
                                    engine.synthesizeInCloud(items.take(4))
                                } catch (e: Exception) {
                                    "Connect Firebase AI Logic to run Cloud Gemini synthesis."
                                }
                                synthesizing = false
                            }
                        },
                        enabled = !synthesizing
                    ) {
                        Text(
                            if (synthesizing) "Synthesizing..." else "Connect in Cloud",
                            color = Color(0xFF284F7E),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            if (synthesisPlan != null) {
                AlertDialog(
                    onDismissRequest = { synthesisPlan = null },
                    title = { Text("Cloud Gemini plan") },
                    text = { Text(synthesisPlan.orEmpty()) },
                    confirmButton = {
                        TextButton(onClick = { synthesisPlan = null }) {
                            Text("Done")
                        }
                    }
                )
            }

            if (currentCard == null) {
                Surface(
                    color = CardWhite,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Desk is clear for today. Share any link or screenshot to Tuck.",
                        color = MutedStone,
                        modifier = Modifier.padding(24.dp)
                    )
                }
            } else {
                Surface(
                    color = CardWhite,
                    shape = RoundedCornerShape(20.dp),
                    tonalElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "${currentCard.inferenceMeta.source.uppercase()} · ${currentCard.inferenceMeta.latencyMs}ms",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SageGreen
                        )
                        Text(
                            text = currentCard.title,
                            fontSize = 21.sp,
                            fontWeight = FontWeight.Bold,
                            color = InkBlack
                        )
                        Text(
                            text = currentCard.summary,
                            fontSize = 14.sp,
                            color = MutedStone
                        )
                        Surface(
                            color = WarmPaper,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("NEXT STEP", fontSize = 10.sp, color = MutedStone, fontWeight = FontWeight.Bold)
                                Text(currentCard.nextAction, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Button(
                                onClick = {
                                    items = items.map {
                                        if (it.id == currentCard.id) it.copy(status = "done") else it
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = SageGreen),
                                shape = RoundedCornerShape(999.dp)
                            ) {
                                Text("Do it")
                            }
                            OutlinedButton(
                                onClick = {
                                    items = items.map {
                                        if (it.id == currentCard.id) it.copy(status = "kept") else it
                                    }
                                },
                                shape = RoundedCornerShape(999.dp)
                            ) {
                                Text("Keep")
                            }
                            TextButton(
                                onClick = {
                                    items = items.map {
                                        if (it.id == currentCard.id) it.copy(status = "let-go") else it
                                    }
                                }
                            ) {
                                Text("Let go", color = MutedStone)
                            }
                        }
                    }
                }
            }
        }
    }
}
