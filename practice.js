async function generateQuestions() {
    const subject = document.getElementById("subject").value;
    const chapter = document.getElementById("chapter").value.trim();
    const outputDiv = document.getElementById("output");

    if (chapter === "") {
        alert("Please enter a chapter name.");
        return;
    }

    // Set loading indicator
    outputDiv.innerHTML = `
        <div class="welcome" style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
            <div style="font-size: 24px; animation: spin 2s linear infinite;">⏳</div>
            <div>Generating premium board-style questions for ${subject} - ${chapter}...</div>
        </div>
    `;

    // Ensure spin animation exists
    if (!document.getElementById("practice-spin-style")) {
        const style = document.createElement("style");
        style.id = "practice-spin-style";
        style.innerHTML = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Generate 5 Board Exam level questions for Class 10 ${subject}, Chapter: "${chapter}". Provide detailed standard model answers for each question.`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                questions: {
                                    type: "ARRAY",
                                    items: {
                                        type: "OBJECT",
                                        properties: {
                                            question: { type: "STRING" },
                                            answer: { type: "STRING" }
                                        },
                                        required: ["question", "answer"]
                                    }
                                }
                            ,
                            required: ["questions"]
                        }
                    }
                })
            }
        );

        const data = await response.json();
        console.log("Practice API response:", data);

        if (!response.ok) {
            if (response.status === 400 || response.status === 403) {
                outputDiv.innerHTML = `
                    <div class="welcome" style="color: #EF4444; text-align: left; padding: 25px;">
                        ⚠️ <strong>API Key Issue:</strong> The Gemini API Key in <code>config.js</code> appears to be invalid or deactivated.<br><br>
                        Please obtain your own free API key from <a href="https://aistudio.google.com/" target="_blank" style="color: var(--accent); text-decoration: underline;">Google AI Studio</a> and replace it in the <code>config.js</code> file.
                    </div>
                `;
            } else {
                outputDiv.innerHTML = `
                    <div class="welcome" style="color: #EF4444;">
                        ⚠️ Error generating questions: ${data.error?.message || "Unknown error"}
                    </div>
                `;
            }
            return;
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(rawText);

        if (!parsed.questions || parsed.questions.length === 0) {
            outputDiv.innerHTML = `
                <div class="welcome">No questions were generated. Try a different chapter name.</div>
            `;
            return;
        }

        // Build questions HTML
        let html = `
            <div class="question-card" style="margin-top: 20px;">
                <h3 style="border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <span>📚 Class 10 ${subject} - ${chapter}</span>
                    <span style="font-size: 14px; background: var(--primary); padding: 5px 12px; border-radius: 20px; font-weight: normal;">Board Practice Set</span>
                </h3>
                <div style="display: flex; flex-direction: column; gap: 20px;">
        `;

        parsed.questions.forEach((q, idx) => {
            html += `
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: var(--accent); display: flex; gap: 10px;">
                        <span>Q${idx + 1}.</span>
                        <span>${q.question}</span>
                    </div>
                    
                    <button onclick="toggleAnswer(${idx})" id="btn-${idx}" style="margin-top: 10px; background: transparent; border: 1px solid var(--primary); padding: 8px 16px; border-radius: 8px; color: var(--text); font-size: 14px; cursor: pointer; transition: 0.2s;">
                        👁️ Show Model Answer
                    </button>
                    
                    <div id="ans-${idx}" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px dashed rgba(255, 255, 255, 0.1); color: #CBD5E1; line-height: 1.6; font-size: 15px;">
                        <strong>Model Answer:</strong>
                        <p style="margin-top: 5px;">${q.answer.replace(/\n/g, "<br>")}</p>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;

        outputDiv.innerHTML = html;

    } catch (error) {
        console.error("Practice Zone generation error:", error);
        outputDiv.innerHTML = `
            <div class="welcome" style="color: #EF4444;">
                ❌ Failed to parse or load practice questions. Check console or make sure your GEMINI_API_KEY in config.js is correct.
            </div>
        `;
    }
}

// Global toggle function
function toggleAnswer(index) {
    const ansDiv = document.getElementById(`ans-${index}`);
    const btn = document.getElementById(`btn-${index}`);
    if (ansDiv.style.display === "none") {
        ansDiv.style.display = "block";
        btn.innerText = "🙈 Hide Model Answer";
        btn.style.background = "var(--primary)";
    } else {
        ansDiv.style.display = "none";
        btn.innerText = "👁️ Show Model Answer";
        btn.style.background = "transparent";
    }
}