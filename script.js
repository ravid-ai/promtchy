// promt/script.js
document.addEventListener('DOMContentLoaded', () => {
    // ##################################################################################
    // # هشدار امنیتی بسیار مهم!                                                        #
    // # به هیچ وجه کلید API جمنای رو به صورت مستقیم در کد جاوااسکریپت سمت کاربر       #
    // # (فرانت‌اند) قرار نده، مخصوصاً اگر قراره این پروژه رو جایی آپلود کنی.           #
    // # این کار باعث می‌شه کلیدت لو بره و هر کسی بتونه ازش سوءاستفاده کنه.             #
    // #                                                                                #
    // # راه‌حل‌های بهتر:                                                               #
    // # 1. یه بک‌اند کوچیک بساز (مثلاً با Node.js, Python/Flask, etc.) که کلید رو     #
    // #    اونجا نگهداری کنه و درخواست‌ها به جمنای از طریق اون بک‌اند انجام بشه.        #
    // # 2. از سرویس‌هایی مثل Google Cloud Functions یا Firebase Functions استفاده کن.   #
    // # 3. برای تست‌های خیلی اولیه و لوکال شاید اشکالی نداشته باشه، ولی هرگز با      #
    // #    کلید هاردکد شده پروژه رو دیپلوی نکن.                                        #
    // ##################################################################################
    const API_KEY = "AIzaSyB1lIgRFSNVTw6b58b9A4WyQcFDBbg31W8"; // <--- این کلید باید امن نگهداری بشه! به هشدار بالا توجه کن!
    let genAI;

    // DOM Elements
    const userInput = document.getElementById('userInput');
    const aiTypeSelector = document.getElementById('aiTypeSelector');
    const styleSelector = document.getElementById('styleSelector');
    const moodSelector = document.getElementById('moodSelector');
    const outputFormatSelector = document.getElementById('outputFormatSelector');
    const visualOptionsDiv = document.getElementById('visualOptions');
    const researchOptionsDiv = document.getElementById('researchOptions');

    const enhanceButton = document.getElementById('enhanceButton');
    const geminiOutput = document.getElementById('geminiOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');
    const copyButton = document.getElementById('copyButton');
    const historyContainer = document.getElementById('historyContainer');
    const clearHistoryButton = document.getElementById('clearHistoryButton');
    const emptyHistoryMessage = document.querySelector('.empty-history-message');


    // --- Local Storage History Key ---
    const HISTORY_KEY = 'geminiSpecializedPromptHistory_v2'; // Added v2 for potentially new structure

    try {
        if (window.GoogleGenerativeAI) {
            genAI = new window.GoogleGenerativeAI(API_KEY);
        } else {
            console.warn("GoogleGenerativeAI SDK در window پیدا نشد!");
            if(errorDisplay) showError("خطا: کتابخانه هوش مصنوعی گوگل بارگذاری نشده است. صفحه رو رفرش کن یا اتصالت رو چک کن."); else console.error("errorDisplay هم null است!");
        }
    } catch (e) {
        console.error("خطا هنگام ساخت نمونه genAI:", e);
        if(errorDisplay) showError("خطا در بارگذاری یا مقداردهی اولیه کتابخانه هوش مصنوعی گوگل. جزئیات در کنسول."); else console.error("errorDisplay هم null است!");
    }

    // --- Event Listeners ---
    if (!aiTypeSelector || !enhanceButton || !copyButton || !clearHistoryButton || !errorDisplay || !userInput || !geminiOutput || !loadingIndicator || !historyContainer || !emptyHistoryMessage) {
        const errorMessage = "خطای داخلی بحرانی: یک یا چند جزء اصلی صفحه پیدا نشدند. لطفاً مطمئن شوید از آخرین نسخه کد HTML استفاده می‌کنید.";
        console.error(errorMessage);
        if (errorDisplay) {
            showError(errorMessage);
        } else {
            // Fallback if errorDisplay itself is missing
            alert(errorMessage + " errorDisplay هم null است!");
        }
    } else {
        aiTypeSelector.addEventListener('change', toggleOptionsVisibility);
        enhanceButton.addEventListener('click', handleEnhanceClick);
        copyButton.addEventListener('click', handleCopyClick);
        clearHistoryButton.addEventListener('click', handleClearHistory);
    }

    // --- Initial UI Setup ---
    toggleOptionsVisibility();
    loadHistory();


    // --- Core Functions ---
    function toggleOptionsVisibility() {
        if (!aiTypeSelector || !visualOptionsDiv || !researchOptionsDiv) {
            console.error("یکی از المنت‌های لازم برای toggleOptionsVisibility پیدا نشد.");
            return;
        }
        const selectedAiType = aiTypeSelector.value;
        if (selectedAiType === 'image' || selectedAiType === 'video') {
            visualOptionsDiv.style.display = 'flex';
            researchOptionsDiv.style.display = 'none';
        } else if (selectedAiType === 'research') {
            visualOptionsDiv.style.display = 'none';
            researchOptionsDiv.style.display = 'flex';
        }
    }

    async function handleEnhanceClick() {
        if (!userInput || !aiTypeSelector || !errorDisplay || !geminiOutput || !copyButton || !loadingIndicator) {
             console.error("یکی از المنت‌های لازم برای handleEnhanceClick پیدا نشد.");
             if(errorDisplay) showError("خطای داخلی: اجزای لازم برای اجرای عملیات موجود نیستند.");
             return;
        }

        const originalPrompt = userInput.value.trim();
        const aiType = aiTypeSelector.value;

        if (!originalPrompt) {
            showError('اول یه ایده بده، بعد دکمه رو بزن!');
            userInput.focus();
            return;
        }
        if (!genAI) {
            showError('ارتباط با جمنای برقرار نیست (SDK مشکل داره یا genAI ساخته نشده). لطفاً صفحه را رفرش کنید یا از تنظیمات API Key مطمئن شوید.');
            return;
        }

        showLoading(true);
        hideError();
        geminiOutput.textContent = '';
        copyButton.style.display = 'none';

        const style = styleSelector ? styleSelector.value : "";
        const mood = moodSelector ? moodSelector.value : "";
        const outputFormat = outputFormatSelector ? outputFormatSelector.value : "";

        const metaPrompt = constructMetaPrompt(originalPrompt, aiType, style, mood, outputFormat);
        // console.log("متا پرامپت ارسالی به جمنای:", metaPrompt);

        try {
            // Ensure you're using a model that supports the desired output capabilities and is available.
            // "gemini-1.5-flash-latest" or "gemini-pro" are common choices.
            // Using the specific model from the original code:
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" }); // "gemini-2.5-flash-preview-05-20" was used before. "gemini-1.5-flash-latest" is more general.
            const result = await model.generateContent(metaPrompt);
            const response = await result.response;
            const enhancedPrompt = response.text();

            geminiOutput.textContent = enhancedPrompt;
            copyButton.style.display = 'inline-block';
            copyButton.innerHTML = '<i class="fas fa-copy"></i>'; // Reset icon
            copyButton.classList.remove('copied');
            saveToHistory(originalPrompt, enhancedPrompt, aiType);
            loadHistory();

        } catch (error) {
            console.error('خطا در ارتباط با API جمنای یا پردازش نتیجه:', error);
            handleApiError(error);
        } finally {
            if(loadingIndicator) showLoading(false); else console.error("loadingIndicator در finally پیدا نشد.");
        }
    }

    // ############### تغییر اصلی اینجاست (قلب تپنده پروژه) ###############
    function constructMetaPrompt(basePrompt, aiType, style, mood, outputFormat) {
        let systemInstruction = `You are an expert prompt engineer. Your primary goal is to elevate a user's raw idea into a highly effective, concise, and ready-to-use prompt (2-5 lines maximum) for a specified AI type. Be creative, specific, and focus on impact. The output should ONLY be the engineered prompt itself, with no conversational fluff, introductions, or explanations.`;
        let userFocus = `User's core idea: "${basePrompt}"\n`;
        let specificInstructions = "";
        const lengthConstraint = "The final engineered prompt MUST be extremely concise, ideally 2-3 powerful lines, and absolutely no more than 5 lines. It must be directly usable by the target AI.";

        switch (aiType) {
            case 'image':
                systemInstruction += `\nTarget AI: Image Generation (e.g., DALL-E, Midjourney). Focus on creating a vivid, micro visual narrative.`;
                userFocus += `Desired artistic style: "${style || 'Suggest a powerfully fitting and distinct style'}".\n`;
                userFocus += `Desired mood/atmosphere: "${mood || 'Suggest a clear, evocative mood'}".\n`;
                specificInstructions = `
Key elements for an impactful image prompt (integrate these seamlessly):
1.  **Primary Focus & Action:** What's the absolute center of attention and what is it doing? Be dynamic.
2.  **Evocative Environment:** Briefly paint the scene. Key details that establish context and mood.
3.  **Key Visual Elements:** Mention 1-2 critical details regarding color palette, lighting interaction, or texture that define the image.
4.  **Cinematic Shot Type/Angle:** (e.g., "Extreme close-up," "Wide establishing shot," "Low-angle shot emphasizing...")
5.  **Artistic Style Integration:** If a style is given, weave it into the description. If not, suggest one that *dramatically* enhances the idea and mood.
${lengthConstraint}
Your output must be a single, short, descriptive paragraph or a few key descriptive phrases forming a coherent whole.`;
                break;

            case 'video':
                systemInstruction += `\nTarget AI: Video Generation. Aim for a compelling micro-scene description.`;
                userFocus += `Desired visual style: "${style || 'Suggest a fitting style (e.g., Cinematic, Documentary, Animated)'}".\n`;
                userFocus += `Desired mood/atmosphere: "${mood || 'Suggest a fitting mood (e.g., Suspenseful, Epic, Whimsical)'}".\n`;
                specificInstructions = `
Key elements for a dynamic video scene prompt (combine into a flowing description):
1.  **Central Action/Event:** The core of what's happening in the scene.
2.  **Main Subject(s) & Defining Trait:** Who/what is central, and their key characteristic, emotion, or appearance.
3.  **Dynamic Camera Work:** A specific, impactful camera instruction (e.g., "Dynamic tracking shot following [subject]," "Slow zoom revealing [detail]," "Sweeping aerial over [location]").
4.  **Core Atmospheric Details:** Essential cues for sound, light, or weather that define the scene's feel.
5.  **Pace/Energy Hint:** (e.g., "fast-paced," "serene and slow," "energetic burst").
${lengthConstraint}
Your output should be a short, continuous paragraph that reads like a concise shot description from a screenplay.`;
                break;

            case 'research':
                systemInstruction += `\nTarget AI: Advanced Language Model for Research. Forge a precise, targeted research query.`;
                userFocus += `Desired output format for the research AI: "${outputFormat || 'A clear, concise summary or answer'}".\n`;
                userFocus += `Desired tone for the research AI's response: "${mood || 'Neutral and objective'}".\n`; // Mood selector might be less relevant here, but can hint at tone.
                specificInstructions = `
Deconstruct the user's idea into the following for the research prompt:
1.  **Core Research Question/Objective:** What single, clear question must the AI answer, or what is the primary objective of the research? Be direct.
2.  **Critical Sub-Points/Angles (1-2 max):** What are the one or two most essential aspects, sub-topics, or perspectives that the AI *must* address to provide a comprehensive yet concise response to the core question?
3.  **Specify Output Expectations:** Reiterate the nature of the desired output from the AI (e.g., "Provide a step-by-step explanation of X, focusing on Y and Z.", "Generate a comparative analysis of A and B, emphasizing their differences in C.").
${lengthConstraint}
The final prompt you generate should be a direct, unambiguous instruction set for the research AI.`;
                break;
        }
        return `${systemInstruction}\n\n${userFocus}\n${specificInstructions}\n\n---\nNow, based *only* on the user's idea and the specific instructions for the chosen AI type, generate the enhanced prompt. The prompt must be ready to be directly used with the target AI. It MUST be concise (2-5 lines) and highly effective. Do not add any conversational fluff, introductions, or explanations; only output the engineered prompt itself.`;
    }
    // ############### پایان تغییر اصلی ###############


    // --- UI Helper Functions ---
    function showLoading(isLoading) {
        if (!loadingIndicator) { console.error("loadingIndicator is null in showLoading"); return; }
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    function showError(message) {
        if (!errorDisplay) {
             console.error("errorDisplay is null in showError. Message:", message);
             alert("خطای داخلی: نمایشگر خطا پیدا نشد. پیام خطا: " + message);
             return;
        }
        errorDisplay.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorDisplay.style.display = 'block';
    }
    function hideError() {
        if (!errorDisplay) { console.error("errorDisplay is null in hideError"); return; }
        errorDisplay.style.display = 'none';
    }
    
    function handleApiError(error) {
        console.error("جزئیات کامل خطای API یا سایر خطاها:", error);
        let friendlyError = 'وای! یه مشکلی با جمنای پیش اومد یا خطایی در کد رخ داد. دوباره سعی کن یا جزئیات رو تو کنسول ببین.';
        
        if (error && error.message) {
            const errorMessageLower = error.message.toLowerCase();
            if (errorMessageLower.includes("api key not valid") || errorMessageLower.includes("permission denied") || (errorMessageLower.includes("api_key") && (errorMessageLower.includes("invalid") || errorMessageLower.includes("denied")))) {
                friendlyError = "کلید API جمنای که وارد کردی، معتبر نیست، منقضی شده، یا دسترسی لازم رو نداره! لطفاً یه کلید API معتبر از Google AI Studio بگیر و در فایل script.js (با رعایت نکات امنیتی شدید!) جایگزین کن. مطمئن شو Gemini API برای پروژه‌ات فعاله. **هرگز کلید API رو در کد عمومی منتشر نکن!**";
            } else if (errorMessageLower.includes("quota") || errorMessageLower.includes("rate limit") || errorMessageLower.includes("resource has been exhausted")) {
                friendlyError = "ظرفیت استفاده شما از API جمنای تموم شده یا درخواست‌هات بیش از حد سریع بودن. یه کم صبر کن (چند دقیقه تا چند ساعت) و دوباره امتحان کن.";
            } else if (errorMessageLower.includes("candidate.safetyratings") || (errorMessageLower.includes("block_reason:") && errorMessageLower.includes("safety")) || errorMessageLower.includes("blocked for safety reasons") ) {
                 friendlyError = "جمنای محتوای تولید شده (یا حتی پرامپت شما) رو به دلایل ایمنی مناسب تشخیص نداده. سعی کن پرامپتت رو تغییر بدی، از کلمات خنثی‌تری استفاده کنی یا موضوع رو عوض کنی.";
            } else if (errorMessageLower.includes("model not found") || (errorMessageLower.includes("model_name") && errorMessageLower.includes("not found")) ) {
                friendlyError = "مدل انتخاب شده برای جمنای (مثلاً gemini-1.5-flash-latest) پیدا نشد یا نامعتبره. لطفاً اسم مدل رو در کد چک کن یا از یک مدل معتبر دیگه استفاده کن.";
            } else if (errorMessageLower.includes("failed to fetch") || errorMessageLower.includes("networkerror") || errorMessageLower.includes("cors")) {
                friendlyError = "مشکل در برقراری ارتباط با سرورهای جمنای. لطفاً از اتصال اینترنت خودت مطمئن شو، اگه از VPN استفاده می‌کنی تنظیماتش رو چک کن و دوباره تلاش کن. ممکنه مشکل از CORS هم باشه اگه از محیط لوکال اجرا می‌کنی.";
            } else if (errorMessageLower.includes("cannot access") && errorMessageLower.includes("before initialization")) {
                 friendlyError = `یه مشکل فنی در کد پیش اومده: ${error.message}. احتمالاً یک متغیر قبل از تعریف استفاده شده. (ویژه دولوپرها)`;
            } else if (errorMessageLower.includes("cannot read properties of null") && errorMessageLower.includes("addeventlistener")) {
                 friendlyError = `خطای کدنویسی: تلاش برای اضافه کردن شنونده رویداد به المنتی که وجود ندارد (null). ${error.message.substring(0,100)} (ویژه دولوپرها)`;
            }
             else {
                friendlyError = `یه مشکل فنی ناشناخته پیش اومد: ${error.message.substring(0,150)}. جزئیات بیشتر در کنسول مرورگر موجوده.`;
            }
        } else if (typeof error === 'string' && error.toLowerCase().includes("failed to fetch")) { // Fallback for string errors
            friendlyError = "مشکل در برقراری ارتباط با سرورهای جمنای. لطفاً از اتصال اینترنت خود مطمئن شوید و دوباره تلاش کنید.";
        }
        
        showError(friendlyError);
        if(geminiOutput) geminiOutput.textContent = 'نتیجه‌ای دریافت نشد...'; else console.error("geminiOutput در handleApiError پیدا نشد.")
    }

    // --- Copy to Clipboard ---
     function handleCopyClick() {
        if (!geminiOutput || !copyButton || !errorDisplay) {
            console.error("المنت‌های لازم برای کپی پیدا نشدند.");
            if(errorDisplay) showError("خطای داخلی: امکان کپی وجود ندارد.");
            return;
        }
        const textToCopy = geminiOutput.textContent;
        if (navigator.clipboard && textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    copyButton.innerHTML = '<i class="fas fa-check"></i> کپی شد!';
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        copyButton.classList.remove('copied');
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showError("کپی نشد! مرورگرت پشتیبانی نمی‌کنه، دسترسی ندادی، یا روی HTTPS نیستی.");
                    // Fallback for older browsers or http
                    try {
                        const textArea = document.createElement("textarea");
                        textArea.value = textToCopy;
                        textArea.style.position = "fixed"; // Avoid scrolling to bottom
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        copyButton.innerHTML = '<i class="fas fa-check"></i> کپی شد (روش قدیمی)!';
                        copyButton.classList.add('copied');
                         setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                            copyButton.classList.remove('copied');
                        }, 2000);

                    } catch (e) {
                        showError("کپی با روش قدیمی هم ناموفق بود. لطفاً دستی کپی کن.");
                    }
                });
        } else if (!textToCopy) {
            showError("چیزی برای کپی کردن وجود نداره!");
        }
    }

    // --- Local Storage & History Functions ---
    function getHistory() {
        try {
            const historyJson = localStorage.getItem(HISTORY_KEY);
            return historyJson ? JSON.parse(historyJson) : [];
        } catch (e) {
            console.error("خطا در خواندن تاریخچه از LocalStorage:", e);
            localStorage.removeItem(HISTORY_KEY); // Clear corrupted history
            return [];
        }
    }

    function saveToHistory(originalPrompt, enhancedPrompt, aiType) {
        if (!localStorage) { console.warn("LocalStorage پشتیبانی نمی‌شود. تاریخچه ذخیره نخواهد شد."); return; }
        try {
            const history = getHistory();
            const newEntry = {
                id: Date.now(),
                original: originalPrompt,
                enhanced: enhancedPrompt,
                type: aiType,
                timestamp: new Date().toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
            };
            history.unshift(newEntry); // Add to the beginning
            if (history.length > 30) { // Keep last 30 items
                history.pop();
            }
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("خطا در ذخیره تاریخچه در LocalStorage:", e);
            showError("مشکلی در ذخیره تاریخچه پیش آمد. ممکنه فضای LocalStorage پر شده باشه.");
        }
    }

    function loadHistory() {
        if (!localStorage || !historyContainer || !emptyHistoryMessage || !clearHistoryButton) {
            console.warn("یکی از المنت‌های لازم برای نمایش تاریخچه یا LocalStorage پشتیبانی نمی‌شود.");
            if(emptyHistoryMessage) emptyHistoryMessage.style.display = 'block';
            if(clearHistoryButton) clearHistoryButton.style.display = 'none';
            return;
        }

        const history = getHistory();
        historyContainer.innerHTML = ''; // Clear previous items

        if (history.length === 0) {
            emptyHistoryMessage.style.display = 'block';
            clearHistoryButton.style.display = 'none';
            return;
        }

        emptyHistoryMessage.style.display = 'none';
        clearHistoryButton.style.display = 'inline-block';

        history.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item';
            itemDiv.setAttribute('tabindex', '0'); // Make it focusable
            itemDiv.setAttribute('aria-label', `تاریخچه: ${item.original.substring(0,30)}... نوع: ${item.type}, زمان: ${item.timestamp}`);

            let typeIcon = 'fas fa-question-circle';
            let typeText = 'نامشخص';
            if (item.type === 'image') { typeIcon = 'fas fa-image'; typeText = 'عکس'; }
            if (item.type === 'video') { typeIcon = 'fas fa-video'; typeText = 'ویدیو'; }
            if (item.type === 'research') { typeIcon = 'fas fa-book-open'; typeText = 'تحقیق'; }

            itemDiv.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-type" title="نوع: ${typeText}"><i class="${typeIcon}"></i></span>
                    <span class="history-item-timestamp">${item.timestamp}</span>
                </div>
                <div class="history-item-content">
                    <p class="original-prompt" title="ایده اولیه: ${item.original}"><strong>ایده اولیه:</strong> ${item.original}</p>
                    <p class="enhanced-prompt-preview" title="پرامپت مهندسی‌شده: ${item.enhanced}"><strong>پرامپت نهایی:</strong> ${item.enhanced.substring(0, 100)}${item.enhanced.length > 100 ? '...' : ''}</p>
                </div>
                <button class="delete-hist-item" data-id="${item.id}" title="حذف این مورد از تاریخچه" aria-label="حذف این آیتم از تاریخچه">
                    <i class="fas fa-times-circle"></i>
                </button>
            `;
            
            // Event listener for clicking on the history item (excluding delete button)
            itemDiv.addEventListener('click', (e) => {
                if (e.target.closest('.delete-hist-item')) return; // Don't trigger if delete button is clicked

                if (!userInput || !geminiOutput || !aiTypeSelector || !copyButton) return;
                userInput.value = item.original;
                geminiOutput.textContent = item.enhanced;
                aiTypeSelector.value = item.type;
                toggleOptionsVisibility(); // Update options visibility based on type
                
                // Reset style and mood selectors if they exist and are relevant
                if (styleSelector && (item.type === 'image' || item.type === 'video')) {
                    // Ideally, you would store and restore the exact style/mood.
                    // For simplicity, we reset or you can try to find a match.
                    styleSelector.value = ''; 
                }
                if (moodSelector && (item.type === 'image' || item.type === 'video')) {
                    moodSelector.value = '';
                }
                if (outputFormatSelector && item.type === 'research') {
                    outputFormatSelector.value = '';
                }


                copyButton.style.display = 'inline-block';
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.classList.remove('copied');
                
                userInput.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
             itemDiv.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); // Prevent default space scroll or enter submit
                    itemDiv.click(); // Trigger the click behavior
                }
            });


            const deleteButton = itemDiv.querySelector('.delete-hist-item');
            if (deleteButton) {
                deleteButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling to itemDiv
                    deleteHistoryItem(item.id);
                });
            }
            historyContainer.appendChild(itemDiv);
        });
    }

    function deleteHistoryItem(id) {
        if (!localStorage) { console.warn("LocalStorage پشتیبانی نمی‌شود."); return; }
        let history = getHistory();
        history = history.filter(item => item.id !== id);
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("خطا در حذف آیتم از تاریخچه LocalStorage:", e);
            showError("مشکلی در حذف آیتم از تاریخچه پیش آمد.");
        }
        loadHistory(); // Refresh the displayed list
    }

    function handleClearHistory() {
        if (!localStorage) { console.warn("LocalStorage پشتیبانی نمی‌شود."); return; }
        // Using a more user-friendly confirmation
        if (confirm('داداش مطمئنی می‌خوای کل تاریخچه پرامپت‌هات رو پاک کنی؟ این کار دیگه قابل برگشت نیست‌ها!')) {
            try {
                localStorage.removeItem(HISTORY_KEY);
            } catch (e) {
                 console.error("خطا در پاک کردن تاریخچه از LocalStorage:", e);
                 showError("مشکلی در پاک کردن تاریخچه پیش آمد.");
            }
            loadHistory(); // Refresh the displayed list
        }
    }
});