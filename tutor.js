console.log("Tutor JS Loaded — Powered by Groq ⚡ + Gemini 🤖");

// State variables
let activeMode = "teacher"; // default mode
let uploadedImage = null;   // stores { base64, mimeType }

// Initialize page events
document.addEventListener("DOMContentLoaded", () => {
    setupModeSelectors();
    setupSuggestionChips();
    setupEnterKeySubmit();
    setupImageUpload();
});

// Setup click handlers for modes
function setupModeSelectors() {
    const modes = document.querySelectorAll(".sidebar .mode");
    modes.forEach(modeEl => {
        modeEl.addEventListener("click", () => {
            modes.forEach(m => m.classList.remove("active"));
            modeEl.classList.add("active");
            activeMode = modeEl.getAttribute("data-mode");
            console.log("Mode switched to:", activeMode);
        });
    });
}

// Setup suggestion chips
function setupSuggestionChips() {
    const suggestions = document.querySelectorAll(".suggestion");
    const input = document.getElementById("userInput");
    suggestions.forEach(chip => {
        chip.addEventListener("click", () => {
            input.value = chip.innerText.trim();
            sendMessage();
        });
    });
}

// Setup Enter key submission
function setupEnterKeySubmit() {
    const input = document.getElementById("userInput");
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Setup Image Upload and Preview
function setupImageUpload() {
    const fileUpload = document.getElementById("fileUpload");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImage = document.getElementById("imagePreview");
    const imageNameSpan = document.getElementById("imageName");
    const clearImageBtn = document.getElementById("clearImageBtn");

    fileUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            const dataUrl = evt.target.result;
            const base64Data = dataUrl.split(",")[1];

            uploadedImage = {
                base64: base64Data,
                mimeType: file.type
            };

            previewImage.src = dataUrl;
            imageNameSpan.innerText = file.name;
            previewContainer.style.display = "flex";
        };
        reader.readAsDataURL(file);
    });

    clearImageBtn.addEventListener("click", () => {
        fileUpload.value = "";
        uploadedImage = null;
        previewContainer.style.display = "none";
        previewImage.src = "";
        imageNameSpan.innerText = "";
    });
}

// Simple Markdown to HTML parser
function formatResponse(text) {
    if (!text) return "";

    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");
    html = html.replace(/^\s*[-*]\s+(.*?)$/gm, "<li>$1</li>");

    let lines = html.split("\n");
    let formatted = "";
    let inList = false;

    for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed.startsWith("<li>") || trimmed.endsWith("</li>")) {
            if (!inList) {
                formatted += "<ul>";
                inList = true;
            }
            formatted += line;
        } else {
            if (inList) {
                formatted += "</ul>";
                inList = false;
            }
            if (trimmed !== "") {
                if (!trimmed.startsWith("<h") && !trimmed.startsWith("<ul") && !trimmed.startsWith("<li")) {
                    formatted += `<p>${line}</p>`;
                } else {
                    formatted += line;
                }
            }
        }
    }

    if (inList) formatted += "</ul>";
    return formatted;
}

// Build system instruction based on active mode and board
function buildSystemInstruction(selectedBoard) {
    switch (activeMode) {
        case "exam":
            return `You are LockIN Tutor, a strict but helpful Class 10 Examiner testing for the ${selectedBoard} syllabus.
Ask the user one relevant practice question about their topic.
If they attempt to answer it, grade their answer out of 5 marks, show where they lost marks, and provide the ideal model answer.`;
        case "revision":
            return `You are LockIN Tutor, an efficient revision summarizer for the ${selectedBoard} syllabus.
For the requested topic, generate a structured revision cheat sheet with bullet points of key definitions, crucial formulas (if any), and 3 summary flashcard style points.`;
        case "language":
            return `You are LockIN Tutor, a friendly multilingual Class 10 teacher for the ${selectedBoard} syllabus.
Explain the requested topic by blending English and the user's local language (e.g. Hinglish, Tanglish). Keep it conversational.`;
        case "teacher":
        default:
            return `You are LockIN Tutor, a warm, supportive, and engaging Class 10 teacher for the ${selectedBoard} syllabus.
Explain the topic using simple language, analogies, real-world examples, and break down complex ideas step-by-step.`;
    }
}

// ============================================================
//  GROQ API: Fast text-only chat (Llama 3.1 via Groq LPU)
// ============================================================
async function callGroq(systemInstruction, question) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: question }
            ],
            max_tokens: 2048,
            temperature: 0.7
        })
    });

    const data = await response.json();
    console.log("Groq API response:", data);

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("⚠️ <strong>Groq API Key Issue:</strong> The key in <code>config.js</code> is invalid.<br>Get a free key at <a href='https://console.groq.com' target='_blank' style='color:var(--accent);text-decoration:underline;'>console.groq.com</a>.");
        }
        throw new Error(`⚠️ Groq Error: ${data.error?.message || "Unknown error"}`);
    }

    return data.choices[0].message.content;
}

// ============================================================
//  GEMINI API: Multimodal (image + text) fallback via Gemini
// ============================================================
async function callGemini(systemInstruction, question, imageData) {
    const parts = [];

    if (imageData) {
        parts.push({
            inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.base64
            }
        });
    }

    parts.push({
        text: `System Directive: ${systemInstruction}\n\nUser Question/Input: ${question || "Analyze the uploaded image."}`
    });

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts }]
            })
        }
    );

    const data = await response.json();
    console.log("Gemini API response:", data);

    if (!response.ok) {
        if (response.status === 400 || response.status === 403) {
            throw new Error("⚠️ <strong>Gemini API Key Issue:</strong> The key in <code>config.js</code> is invalid.<br>Get a free key at <a href='https://aistudio.google.com' target='_blank' style='color:var(--accent);text-decoration:underline;'>aistudio.google.com</a>.");
        }
        throw new Error(`⚠️ Gemini Error: ${data.error?.message || "Unknown error"}`);
    }

    return data.candidates[0].content.parts[0].text;
}

// ============================================================
//  MAIN: sendMessage — routes to Groq (text) or Gemini (image)
// ============================================================
async function sendMessage() {
    console.log("sendMessage triggered");

    const input = document.getElementById("userInput");
    const chat = document.getElementById("chat-box");
    const boardSelect = document.getElementById("boardSelect");

    const question = input.value.trim();
    if (!question && !uploadedImage) return;

    // Build user message bubble
    let userMsgHtml = `<div class="user-message">`;
    if (uploadedImage) {
        userMsgHtml += `<img src="${document.getElementById("imagePreview").src}" style="max-width: 150px; display: block; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.2);">`;
    }
    if (question) {
        userMsgHtml += `<div>${question}</div>`;
    }
    userMsgHtml += `</div>`;

    chat.innerHTML += userMsgHtml;
    input.value = "";

    const currentUploadedImage = uploadedImage;
    document.getElementById("clearImageBtn").click();

    // Create AI thinking placeholder
    const thinkingDiv = document.createElement("div");
    thinkingDiv.className = "ai-message";

    // Show which engine is powering this response
    const engineLabel = currentUploadedImage
        ? "🤖 Gemini thinking (image mode)..."
        : "⚡ Groq thinking (ultra-fast)...";
    thinkingDiv.innerHTML = engineLabel;
    chat.appendChild(thinkingDiv);
    chat.scrollTop = chat.scrollHeight;

    const selectedBoard = boardSelect ? boardSelect.value : "CBSE Class 10";
    const systemInstruction = buildSystemInstruction(selectedBoard);

    try {
        let aiText;

        if (currentUploadedImage) {
            // Image present → use Gemini (multimodal)
            aiText = await callGemini(systemInstruction, question, currentUploadedImage);
        } else {
            // Text only → use Groq (ultra-fast Llama 3.3)
            aiText = await callGroq(systemInstruction, question);
        }

        thinkingDiv.innerHTML = formatResponse(aiText);

    } catch (error) {
        console.error(error);
        thinkingDiv.innerHTML = error.message || "❌ Something went wrong. Check the console.";
    }

    chat.scrollTop = chat.scrollHeight;
}