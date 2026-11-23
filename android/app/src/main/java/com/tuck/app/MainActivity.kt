package com.tuck.app

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
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
private val CloudBlue = Color(0xFF284F7E)
private val CloudSoft = Color(0xFFEAF0F8)

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
    val auth = remember { FirebaseAuth.getInstance() }
    val db = remember { FirebaseFirestore.getInstance() }

    var currentUser by remember { mutableStateOf<FirebaseUser?>(auth.currentUser) }
    var showAuthDialog by remember { mutableStateOf(false) }
    var authEmail by remember { mutableStateOf("") }
    var authPassword by remember { mutableStateOf("") }
    var authError by remember { mutableStateOf<String?>(null) }
    var authBusy by remember { mutableStateOf(false) }

    var noteText by remember(initialDraft) { mutableStateOf(initialDraft) }
    var isPrivate by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var synthesizing by remember { mutableStateOf(false) }
    var synthesisPlan by remember { mutableStateOf<String?>(null) }
    var selectedIds by remember { mutableStateOf<Set<String>>(emptySet()) }

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

    // Listen to Firebase Auth state
    DisposableEffect(Unit) {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            currentUser = firebaseAuth.currentUser
        }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }

    // Real-time Firestore sync for the signed-in user
    DisposableEffect(currentUser?.uid) {
        val uid = currentUser?.uid
        val listener = if (uid != null) {
            db.collection("users")
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

    fun updateStatus(itemId: String, newStatus: String) {
        val now = System.currentTimeMillis()
        items = items.map {
            if (it.id == itemId) it.copy(status = newStatus, updatedAt = now) else it
        }
        val uid = currentUser?.uid ?: return
        db.collection("users").document(uid).collection("items").document(itemId)
            .update(mapOf("status" to newStatus, "updatedAt" to now))
    }

    val currentCard = items.firstOrNull { it.status == "tucked" }
    val shelfItems = items.filter { it.status != "let-go" }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = WarmPaper
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header with Brand + Sync / Sign-In button
            item {
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

                    if (currentUser != null) {
                        OutlinedButton(
                            onClick = { auth.signOut() },
                            shape = RoundedCornerShape(999.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "Synced · Sign out",
                                fontSize = 12.sp,
                                color = SageGreen
                            )
                        }
                    } else {
                        OutlinedButton(
                            onClick = { showAuthDialog = true },
                            shape = RoundedCornerShape(999.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "Sign in to sync",
                                fontSize = 12.sp,
                                color = InkBlack
                            )
                        }
                    }
                }
            }

            // Hybrid AI Status Pill
            item {
                Surface(
                    color = SageSoft,
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Text(
                        text = if (currentUser != null)
                            "Hybrid AI · Prefer On-Device · Cloud Sync Active"
                        else
                            "Hybrid AI · Prefer On-Device · Local Only",
                        color = SageGreen,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }

            // Quick Tuck Composer
            item {
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
                                        currentUser?.uid?.let { uid ->
                                            db.collection("users")
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
            }

            // Daily 3-Card Triage Deck
            item {
                Text(
                    text = "Today's forgotten saves",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = InkBlack
                )
            }

            item {
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
                                    Text(
                                        "NEXT STEP",
                                        fontSize = 10.sp,
                                        color = MutedStone,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        currentCard.nextAction,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = { updateStatus(currentCard.id, "done") },
                                    colors = ButtonDefaults.buttonColors(containerColor = SageGreen),
                                    shape = RoundedCornerShape(999.dp)
                                ) {
                                    Text("Do it")
                                }
                                OutlinedButton(
                                    onClick = { updateStatus(currentCard.id, "kept") },
                                    shape = RoundedCornerShape(999.dp)
                                ) {
                                    Text("Keep")
                                }
                                TextButton(
                                    onClick = { updateStatus(currentCard.id, "let-go") }
                                ) {
                                    Text("Let go", color = MutedStone)
                                }
                            }
                        }
                    }
                }
            }

            // Quiet Shelf header + Cloud Synthesis CTA
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Your quiet shelf (${shelfItems.size})",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = InkBlack
                    )
                    if (selectedIds.size >= 2 || shelfItems.size >= 2) {
                        Surface(
                            color = CloudSoft,
                            shape = RoundedCornerShape(999.dp)
                        ) {
                            TextButton(
                                onClick = {
                                    scope.launch {
                                        synthesizing = true
                                        val chosen = if (selectedIds.size >= 2) {
                                            shelfItems.filter { it.id in selectedIds }
                                        } else {
                                            shelfItems.take(3)
                                        }
                                        synthesisPlan = try {
                                            engine.synthesizeInCloud(chosen)
                                        } catch (_: Exception) {
                                            "Could not reach Cloud Gemini right now. Check connection and try again."
                                        }
                                        synthesizing = false
                                    }
                                },
                                enabled = !synthesizing,
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = if (synthesizing) "Synthesizing..." else "Connect in Cloud",
                                    color = CloudBlue,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }

            // Shelf item cards with multi-select checkboxes
            items(shelfItems, key = { it.id }) { item ->
                val checked = item.id in selectedIds
                Surface(
                    color = CardWhite,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Checkbox(
                            checked = checked,
                            onCheckedChange = { isChecked ->
                                selectedIds = if (isChecked) {
                                    selectedIds + item.id
                                } else {
                                    selectedIds - item.id
                                }
                            }
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = item.title,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = InkBlack
                            )
                            Text(
                                text = item.summary,
                                fontSize = 13.sp,
                                color = MutedStone
                            )
                            Text(
                                text = item.tags.joinToString(" ") { "#$it" },
                                fontSize = 11.sp,
                                color = SageGreen
                            )
                        }
                    }
                }
            }
        }
    }

    // Cloud Synthesis Dialog
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

    // Sign-In / Cloud Sync Dialog
    if (showAuthDialog) {
        AlertDialog(
            onDismissRequest = { if (!authBusy) showAuthDialog = false },
            title = { Text("Sync across devices") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Sign in with email and password to sync your tucked items to your private Firestore shelf.",
                        fontSize = 13.sp,
                        color = MutedStone
                    )
                    OutlinedTextField(
                        value = authEmail,
                        onValueChange = { authEmail = it },
                        label = { Text("Email") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = authPassword,
                        onValueChange = { authPassword = it },
                        label = { Text("Password (6+ chars)") },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (authError != null) {
                        Text(authError.orEmpty(), color = Terracotta, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val email = authEmail.trim()
                        val pass = authPassword
                        if (email.isBlank() || pass.length < 6) {
                            authError = "Enter a valid email and 6+ character password."
                            return@Button
                        }
                        authBusy = true
                        authError = null
                        auth.signInWithEmailAndPassword(email, pass)
                            .addOnSuccessListener {
                                authBusy = false
                                showAuthDialog = false
                            }
                            .addOnFailureListener {
                                auth.createUserWithEmailAndPassword(email, pass)
                                    .addOnSuccessListener {
                                        authBusy = false
                                        showAuthDialog = false
                                    }
                                    .addOnFailureListener { err ->
                                        authBusy = false
                                        authError = err.localizedMessage ?: "Sign-in failed."
                                    }
                            }
                    },
                    enabled = !authBusy,
                    colors = ButtonDefaults.buttonColors(containerColor = Terracotta)
                ) {
                    Text(if (authBusy) "Signing in..." else "Continue")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAuthDialog = false }, enabled = !authBusy) {
                    Text("Cancel")
                }
            }
        )
    }
}
