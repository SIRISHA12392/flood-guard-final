# knowledge_base.py — Flattened FloodGuard AI Knowledge Base
# Topics are now single-responses so the bot replies only exactly what is asked.

KNOWLEDGE_BASE = {

    # ─────────────────────────────────────────────────────
    #  GENERAL / GREETING
    # ─────────────────────────────────────────────────────
    "greeting": {
        "keywords": [
            "hello", "hi", "hey", "help", "start", "begin",
            "what can you do", "features", "about", "who are you",
            "வணக்கம்", "நலம்", "உதவி", "தொடங்கு", "நீ யார்"
        ],
        "responses": {
            "english": """👋 *Hello! I'm FloodGuard AI Assistant*

I'm here to help you stay safe during floods and landslides.

*Ask me about:*
🌊 Flood information & types
📊 How flood prediction works
🛡️ Flood & landslide safety tips
🚨 Emergency contacts & helplines
🎒 Emergency kit preparation
💧 Safe water during floods
🚐 Evacuation planning
🏥 First aid during floods
👨‍👩‍👧 Safety for children & elderly
🌍 Climate change & Indian floods
📱 How to use FloodGuard app

*Example questions you can ask:*
• "What should I do during a flood?"
• "What are the signs of a landslide?"
• "Emergency contacts for Tamil Nadu"

Type your question or use the voice button 🎤""",

            "tamil": """👋 *வணக்கம்! நான் FloodGuard AI உதவியாளர்*

வெள்ளம் மற்றும் நிலச்சரிவுகளில் நீங்கள் பாதுகாப்பாக இருக்க உதவ இங்கே இருக்கிறேன்.

*என்னிடம் கேளுங்கள்:*
🌊 வெள்ள தகவல் மற்றும் வகைகள்
🛡️ வெள்ள மற்றும் நிலச்சரிவு பாதுகாப்பு குறிப்புகள்
🚨 அவசரகால தொடர்பு எண்கள்
🎒 அவசரகால கிட் தயாரிப்பு
💧 வெள்ளத்தின் போது பாதுகாப்பான நீர்
🏥 வெள்ளத்தின் போது முதலுதவி

*எடுத்துக்காட்டு கேள்விகள்:*
• "வெள்ளத்தின் போது என்ன செய்வது?"
• "நிலச்சரிவு அறிகுறிகள் என்ன?"
• "தமிழ்நாட்டிற்கான அவசரகால தொடர்புகள்"

உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள் அல்லது பேசுங்கள் 🎤"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  APP FEATURES — how to use FloodGuard
    # ─────────────────────────────────────────────────────
    "app_features": {
        "keywords": [
            "how to use", "app", "feature", "map", "search", "track",
            "dashboard", "log", "history", "install", "pwa",
            "எப்படி பயன்படுத்துவது", "அம்சம்", "நகைசுவை", "வரலாறு"
        ],
        "responses": {
            "english": """📱 *FloodGuard Features Guide*

*🏠 Dashboard:*
• Real-time flood/landslide risk for your location
• Current temperature, rainfall, humidity
• Interactive map — click any location to check risk

*🗺️ Maps Tab:*
• Live map with flood-risk markers
• Click any point for instant prediction

*🛡️ Safe Zones Tab:*
• Nearest emergency shelters

*📋 Logs Tab:*
• History of your location tracking
• Past risk assessments

*🆘 SOS Button (Red center button):*
• Instantly sends your GPS location via WhatsApp
• Alerts your registered emergency contact""",

            "tamil": """📱 *FloodGuard அம்சங்கள் வழிகாட்டி*

*🏠 Dashboard:*
• உங்கள் இருப்பிடத்திற்கான நிகழ்நேர வெள்ள/நிலச்சரிவு அபாயம்
• தற்போதைய வெப்பநிலை, மழை, ஈரப்பதம்
• ஊடாடும் வரைபடம்

*🆘 SOS பட்டன்:*
• உங்கள் GPS இருப்பிடத்தை WhatsApp மூலம் உடனடியாக அனுப்புகிறது

*💬 Chatbot:*
• வெள்ளம், நிலச்சரிவு, பாதுகாப்பு பற்றி என்னிடம் கேளுங்கள்!
• தமிழ் மற்றும் ஆங்கிலத்தில் கிடைக்கிறது"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  RISK ASSESSMENT — how to check risk
    # ─────────────────────────────────────────────────────
    "risk_check": {
        "keywords": [
            "risk", "danger", "safe", "assessment", "level", "check my risk", "status",
            "my location", "where i am", "current risk", "am i safe",
            "அபாயம்", "பாதுகாப்பு", "அபாய மதிப்பீடு", "ஆபத்து நிலை", "எனது நிலை"
        ],
        "responses": {
            "english": """📍 *How to Check Your Risk Level*

FloodGuard monitors your location in real-time and shows:

🟢 *LOW RISK* — You are in a safe zone
• Normal weather conditions
• Stay alert and monitor updates

🟡 *MEDIUM RISK* — Caution advised
• Moderate rainfall detected
• Prepare your emergency kit
• Identify nearest evacuation route

🔴 *HIGH RISK* — Danger zone
• Heavy rainfall or flood imminent
• Evacuate immediately if ordered
• Call 112 or 1078

🚨 *EXTREME* — Life-threatening
• Active flood or landslide in progress
• DO NOT wait — evacuate immediately""",

            "tamil": """📍 *உங்கள் அபாய நிலையை எவ்வாறு சரிபார்க்கலாம்*

FloodGuard உங்கள் இருப்பிடத்தை நிகழ்நேரத்தில் கண்காணித்து காட்டுகிறது:

🟢 *குறைந்த அபாயம்* — நீங்கள் பாதுகாப்பான மண்டலத்தில் இருக்கிறீர்கள்
🟡 *நடுத்தர அபாயம்* — எச்சரிக்கை தேவை
🔴 *அதிக அபாயம்* — ஆபத்து மண்டலம்
🚨 *தீவிர அபாயம்* — உயிர் அச்சுறுத்தல்

*தற்போதைய அபாயத்தை சரிபார்க்க:*
✅ Dashboard-ல் தேடல் பட்டியை பயன்படுத்தவும்
✅ நிகழ்நேர கண்காணிப்பிற்காக இருப்பிட அணுகலை அனுமதிக்கவும்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  CLIMATE CHANGE & FLOODS
    # ─────────────────────────────────────────────────────
    "climate_floods": {
        "keywords": [
            "climate", "climate change", "global warming", "weather pattern",
            "monsoon", "cyclone", "greenhouse", "carbon", "sea level",
            "காலநிலை", "காலநிலை மாற்றம்", "மழைக்காலம்", "சுழற்காற்று"
        ],
        "responses": {
            "english": """🌍 *Climate Change & Floods in India*

*Why Floods Are Getting Worse:*
🌡️ Global warming intensifies rainfall events
🌊 Sea level rise increases coastal flooding
🌀 More frequent and intense cyclones (Bay of Bengal)
🌧️ Erratic monsoons — both drought and extreme rain

*India's Most Vulnerable Regions:*
🔴 Coastal India — cyclones, storm surge
🔴 Himalayas — glacial lake outburst floods (GLOF)
🔴 Brahmaputra basin — annual mega-floods
🔴 Mumbai, Chennai — urban flash floods

*IMD Weather Alerts:*
📱 Download Mausam app by IMD
🌐 mausam.imd.gov.in""",

            "tamil": """🌍 *இந்தியாவில் காலநிலை மாற்றம் மற்றும் வெள்ளங்கள்*

*வெள்ளங்கள் ஏன் மோசமடைகின்றன:*
🌡️ புவி வெப்பமடைதல் மழை நிகழ்வுகளை தீவிரப்படுத்துகிறது
🌊 கடல் மட்ட உயர்வு கடலோர வெள்ளங்களை அதிகரிக்கிறது
🌀 வங்கக்கடலில் அடிக்கடி வரும் சுழற்காற்றுகள்

*பாதிக்கப்படக்கூடிய பகுதிகள்:*
🔴 கடலோர இந்தியா — சுழற்காற்று, புயல் அலை
🔴 இமயமலைகள் — பனிப்பிளவு ஏரி வெடிப்பு வெள்ளம்
🔴 மும்பை, சென்னை — நகர்ப்புற திடீர் வெள்ளம்

*IMD எச்சரிக்கைகள்:*
📱 Mausam app பதிவிறக்கம் செய்யுங்கள்
🌐 mausam.imd.gov.in"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  EVACUATION
    # ─────────────────────────────────────────────────────
    "evacuation_guide": {
        "keywords": [
            "evacuate", "evacuation", "escape", "leave", "route", "shelter",
            "safe place", "refuge", "go", "run", "flee",
            "வெளியேறு", "வெளியேற்றம்", "தப்பு", "தங்குமிடம்", "பாதுகாப்பான இடம்"
        ],
        "responses": {
            "english": """🚨 *Evacuation Guide*

*When to Evacuate:*
⚡ When authorities issue a mandatory evacuation order
⚡ Water is rising and approaching your building
⚡ You hear unusual sounds — cracking, rumbling

*How to Evacuate Safely:*
1️⃣ Take your emergency kit (documents, medicines, water, food)
2️⃣ Wear sturdy footwear
3️⃣ Move to higher ground — avoid low-lying roads
4️⃣ Never use underground roads, subways, or tunnels
5️⃣ Follow the official evacuation route shown by police
6️⃣ Do NOT use your car if roads are flooded

*Shelter Locations (India):*
🏫 Schools and community halls are designated flood shelters
🏥 Hospitals on high ground""",

            "tamil": """🚨 *வெளியேற்ற வழிகாட்டி*

*எப்போது வெளியேற வேண்டும்:*
⚡ அதிகாரிகள் கட்டாய வெளியேற்ற உத்தரவு பிறப்பிக்கும்போது
⚡ நீர் உயர்ந்து உங்கள் கட்டிடத்தை நெருங்கும்போது
⚡ அசாதாரண சத்தங்கள் கேட்கும்போது

*பாதுகாப்பாக வெளியேறுவது எப்படி:*
1️⃣ அவசரகால கிட் எடுக்கவும் (ஆவணங்கள், மருந்துகள், நீர், உணவு)
2️⃣ உறுதியான காலணி அணியுங்கள்
3️⃣ உயரமான இடங்களுக்கு செல்லுங்கள்
4️⃣ நிலத்தடி சாலைகள், சுரங்கங்களை தவிர்க்கவும்
5️⃣ காவல்துறை காட்டும் அதிகாரப்பூர்வ பாதையை பின்பற்றுங்கள்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  FIRST AID
    # ─────────────────────────────────────────────────────
    "first_aid_flood": {
        "keywords": [
            "first aid", "injured", "wound", "hurt", "sick", "medical",
            "drowning", "hypothermia", "infection", "contamination", "disease",
            "முதலுதவி", "காயம்", "நோய்", "மூழ்கு", "தொற்று"
        ],
        "responses": {
            "english": """🏥 *First Aid During Floods*

*Drowning — Immediate Steps:*
1️⃣ Call 112 immediately
2️⃣ Do NOT enter deep water unless trained
3️⃣ Throw a rope, life jacket, or floating object
4️⃣ Once out of water: check breathing
5️⃣ If not breathing: start CPR (30 compressions, 2 breaths)

*Hypothermia (Too Cold):*
✅ Move to warm shelter immediately
✅ Remove wet clothes, wrap in dry blankets
✅ Do NOT rub limbs — it worsens circulation

*Flood Water Diseases to Watch:*
⚠️ Cholera — vomiting, severe diarrhoea
⚠️ Leptospirosis — fever, muscle pain after flood contact
⚠️ Typhoid — sustained fever, abdominal pain
⚠️ Malaria — fever, chills after mosquito bite""",

            "tamil": """🏥 *வெள்ளத்தின் போது முதலுதவி*

*மூழ்குதல் — உடனடி நடவடிக்கைகள்:*
1️⃣ உடனே 112 அழைக்கவும்
2️⃣ பயிற்சி இல்லாமல் ஆழமான நீரில் நுழையாதீர்கள்
3️⃣ கயிறு, life jacket எறியுங்கள்
4️⃣ நீரிலிருந்து வெளியே வந்தவுடன்: சுவாசத்தை சரிபார்க்கவும்
5️⃣ சுவாசிக்கவில்லை என்றால்: CPR தொடங்கவும்

*வெள்ள நீர் நோய்கள்:*
⚠️ காலரா — வாந்தி, கடுமையான வயிற்றுப்போக்கு
⚠️ லெப்டோஸ்பைரோசிஸ் — காய்ச்சல், தசை வலி
⚠️ டைபாய்டு — நீடித்த காய்ச்சல்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  EMERGENCY KIT
    # ─────────────────────────────────────────────────────
    "emergency_kit": {
        "keywords": [
            "kit", "bag", "prepare", "preparation", "supplies", "pack",
            "emergency bag", "survival kit", "ready", "checklist",
            "கிட்", "பை", "தயார்", "சரக்கு", "தயாரிப்பு"
        ],
        "responses": {
            "english": """🎒 *Emergency Kit Checklist*

*Documents (in waterproof bag):*
📄 Aadhaar card / ID proof
📄 Insurance papers
📄 Medical prescriptions

*Food & Water:*
💧 3 litres of water per person per day (3-day supply)
🍱 Ready-to-eat food, biscuits, dry fruits
💊 Personal medicines (7-day supply)

*Tools & Equipment:*
🔦 Torch + extra batteries
📻 Battery-powered radio
🔋 Fully charged power bank
🪢 Rope (for emergency rescue)
🧰 First aid kit + antiseptic

*Clothing & Communication:*
👕 Extra clothing in waterproof bag
📱 Fully charged phone
💵 Cash (ATMs may be down)

✅ Keep this kit packed and ready at all times!""",

            "tamil": """🎒 *அவசரகால கிட் சரிபார்ப்பு பட்டியல்*

*ஆவணங்கள் (நீர்புகாத பையில்):*
📄 ஆதார் அட்டை / அடையாள சான்று
📄 காப்பீட்டு ஆவணங்கள்
📄 மருத்துவ மருந்துச் சீட்டுகள்

*உணவு மற்றும் நீர்:*
💧 ஒரு நாளுக்கு நபருக்கு 3 லிட்டர் நீர் (3 நாள் இருப்பு)
🍱 உடனடியாக சாப்பிட தயாரான உணவு
💊 தனிப்பட்ட மருந்துகள் (7 நாள் இருப்பு)

*கருவிகள்:*
🔦 டார்ச் + கூடுதல் பேட்டரிகள்
📻 பேட்டரி ரேடியோ
🔋 சார்ஜ் செய்யப்பட்ட பவர் பேங்க்
🧰 முதலுதவி பெட்டி

✅ எப்போதும் இந்த கிட்டை தயாராக வையுங்கள்!"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  WATER SAFETY
    # ─────────────────────────────────────────────────────
    "water_safety": {
        "keywords": [
            "water safe", "drink", "drinking", "clean water", "contaminated water",
            "water purify", "boil water", "well water", "tap water", "water safety",
            "நீர் பாதுகாப்பு", "குடிநீர்", "தண்ணீர் சுத்திகரிப்பு",
            "கொதிக்க", "மாசுபட்ட நீர்"
        ],
        "responses": {
            "english": """💧 *Flood Water Safety*

*NEVER drink:*
🚫 Flood water (even if clear — it is contaminated)
🚫 Well water that has been submerged in flood
🚫 Tap water until officially declared safe

*SAFE water sources:*
✅ Sealed bottled water
✅ Water boiled for at least 1 minute (rolling boil)
✅ Water treated with chlorine tablets (1 tablet per 1L)
✅ Government-supplied water tankers

*How to Purify Water:*
1️⃣ Boiling: Bring to a full rolling boil for 1 minute
2️⃣ Chlorination: Add 2 drops of liquid bleach per 1L, wait 30 min
3️⃣ Solar disinfection: Fill clear bottles, place in sun for 6 hours""",

            "tamil": """💧 *வெள்ள நீர் பாதுகாப்பு*

*குடிக்க வேண்டாம்:*
🚫 வெள்ள நீர் (தெளிவாக இருந்தாலும் — மாசுபட்டிருக்கும்)
🚫 வெள்ளத்தில் மூழ்கிய கிணற்று நீர்
🚫 அதிகாரப்பூர்வமாக பாதுகாப்பானது என்று அறிவிக்கும் வரை குழாய் நீர்

*பாதுகாப்பான நீர் ஆதாரங்கள்:*
✅ சீல் வைக்கப்பட்ட பாட்டில் நீர்
✅ குறைந்தது 1 நிமிடம் கொதிக்க வைத்த நீர்
✅ குளோரின் மாத்திரைகளால் சுத்திகரிக்கப்பட்ட நீர்

*நீரை சுத்திகரிப்பது எப்படி:*
1️⃣ கொதிக்க வைத்தல்: 1 நிமிடம் கொதிக்க வையுங்கள்
2️⃣ குளோரினேஷன்: 1 லிட்டருக்கு 2 துளிகள், 30 நிமிடம் காத்திருங்கள்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  CHILDREN & ELDERLY SAFETY
    # ─────────────────────────────────────────────────────
    "vulnerable_groups": {
        "keywords": [
            "children", "child", "baby", "infant", "elderly", "old people",
            "senior", "disabled", "wheelchair", "pregnant", "kids", "kid",
            "குழந்தை", "வயதானவர்", "முதியோர்", "கர்ப்பிணி"
        ],
        "responses": {
            "english": """👨‍👩‍👧 *Safety for Children, Elderly & Vulnerable People*

*For Children:*
👦 Never leave children alone during flood
👦 Teach children to call 112 and their home address
👦 Keep children away from flood water — risk of drowning
👦 Watch for signs of hypothermia: shivering, confusion

*For Elderly:*
👴 Help them move first if evacuation is needed
👴 They may need assistance with medications
👴 Risk of hypothermia is higher — keep them warm
👴 Dehydration risk — ensure they drink enough water

*For Pregnant Women:*
🤰 Evacuate early — do NOT wait until water enters home
🤰 Keep prenatal care documents in emergency kit

*For Disabled Individuals:*
♿ Plan evacuation route that accommodates mobility needs
♿ Keep mobility aids near exit""",

            "tamil": """👨‍👩‍👧 *குழந்தைகள், முதியோர் மற்றும் பாதிக்கப்படக்கூடியவர்களுக்கான பாதுகாப்பு*

*குழந்தைகளுக்கு:*
👦 வெள்ளத்தின் போது குழந்தைகளை தனியாக விட வேண்டாம்
👦 குழந்தைகளுக்கு 112 அழைக்க கற்றுக்கொடுங்கள்
👦 குழந்தைகளை வெள்ள நீரிலிருந்து விலக்கி வையுங்கள்

*முதியோருக்கு:*
👴 வெளியேற்றம் தேவைப்பட்டால் அவர்களை முதலில் உதவுங்கள்
👴 மருந்துகளில் உதவி தேவைப்படலாம்
👴 வெப்பமாக வையுங்கள் — குளிர் ஆபத்து அதிகம்

*கர்ப்பிணி பெண்களுக்கு:*
🤰 முன்கூட்டியே வெளியேறுங்கள்
🤰 மகப்பேறு பராமரிப்பு ஆவணங்களை அவசரகால கிட்டில் வையுங்கள்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  FLOOD PREDICTION
    # ─────────────────────────────────────────────────────
    "flood_prediction": {
        "keywords": [
            "predict", "prediction", "forecast", "machine learning", "ml",
            "algorithm", "how do you know", "sensor", "model",
            "முன்கணிப்பு", "அல்காரிதம்"
        ],
        "responses": {
            "english": """📊 *How Does FloodGuard Predict Floods?*

*Real-Time Data Sources:*
• OpenWeatherMap API — live rainfall, humidity, pressure
• IMD (India Meteorological Department) — weather forecasts
• River gauge stations across India
• Satellite imagery for flood mapping

*Prediction Parameters:*
🌡️ Temperature: affects evaporation and storm intensity
💧 Rainfall (mm/hr): primary flood trigger
💦 Humidity (%): soil saturation indicator
🌀 Pressure (hPa): low pressure = storm systems

*Risk Thresholds:*
🟢 LOW     — Rainfall < 5 cm/day, Humidity < 70%
🟡 MEDIUM  — Rainfall 5–20 cm/day, Humidity 70–85%
🔴 HIGH    — Rainfall > 20 cm/day, Humidity > 85%
🚨 EXTREME — Rainfall > 30 cm/day OR pressure < 980 hPa

*ML Algorithms Used:*
🤖 Random Forest Classifier
🤖 LSTM Neural Networks
🤖 Decision Tree Models""",

            "tamil": """📊 *FloodGuard வெள்ளங்களை எவ்வாறு முன்கணிக்கிறது?*

*நிகழ்நேர தரவு ஆதாரங்கள்:*
• OpenWeatherMap API — நேரடி மழை, ஈரப்பதம், அழுத்தம்
• IMD — இந்திய வானிலை ஆய்வு முன்னறிவிப்புகள்
• இந்தியா முழுவதும் ஆற்று அளவீட்டு நிலையங்கள்

*முன்கணிப்பு அளவுருக்கள்:*
🌡️ வெப்பநிலை: ஆவியாதல் மற்றும் புயல் தீவிரத்தை பாதிக்கும்
💧 மழைப்பொழிவு (மிமீ/மணி): முதன்மை வெள்ள தூண்டுதல்
💦 ஈரப்பதம் (%): மண் நிறைவு குறிகாட்டி
🌀 அழுத்தம் (hPa): குறைந்த அழுத்தம் = புயல் அமைப்புகள்

*அபாய வரம்புகள்:*
🟢 குறைந்த — மழை < 5 செமீ/நாள்
🟡 நடுத்தர — மழை 5–20 செமீ/நாள்
🔴 அதிக — மழை > 20 செமீ/நாள்
🚨 தீவிர — மழை > 30 செமீ/நாள்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  FLOOD SAFETY
    # ─────────────────────────────────────────────────────
    "flood_safety": {
        "keywords": [
            "flood safe", "flood safety", "what should i do", "protect", "during flood",
            "before flood", "after flood", "stay safe", "precautions",
            "prevent", "prevention", "avoid", "avoid flood", "how to prevent",
            "protect from flood", "flood protection", "reduce flood", "minimize",
            "பாதுகாப்பு", "பாதுகாப்பாக", "எச்சரிக்கை", "நடவடிக்கைகள்", "தடுக்க"
        ],
        "responses": {
            "english": """🛡️ *Flood Safety — Complete Guide*

*BEFORE a Flood:*
✅ Move valuables and documents to upper floors
✅ Prepare emergency kit (water, food, medicines, torch, radio)
✅ Charge all mobile phones and power banks
✅ Know your nearest evacuation route and shelter
✅ Unplug electrical appliances

*DURING a Flood:*
🚫 NEVER walk or drive through moving flood water
🚫 Do NOT touch electrical switches if floor is wet
🚫 Avoid bridges over fast-flowing rivers
✅ Move to the highest point in your building
✅ Signal for help from window/roof — wave bright cloth
✅ Call 112 (All Emergency) or 1078 (Disaster Helpline)

*AFTER a Flood:*
✅ Wait for official all-clear before returning
✅ Do NOT drink tap water — it may be contaminated
✅ Watch for downed power lines
✅ Document damage for insurance claims
✅ Disinfect everything that contacted flood water""",

            "tamil": """🛡️ *வெள்ள பாதுகாப்பு — முழுமையான வழிகாட்டி*

*வெள்ளத்திற்கு முன்:*
✅ மதிப்புமிக்க பொருட்கள் மற்றும் ஆவணங்களை மேல் தளங்களுக்கு மாற்றுங்கள்
✅ அவசரகால கிட் தயார் செய்யுங்கள் (நீர், உணவு, மருந்துகள், டார்ச், ரேடியோ)
✅ அனைத்து மொபைல் போன்களையும் சார்ஜ் செய்யுங்கள்
✅ நெருங்கிய வெளியேற்ற பாதை மற்றும் தங்குமிடம் தெரிந்துகொள்ளுங்கள்

*வெள்ளத்தின் போது:*
🚫 வெள்ள நீரில் நடக்கவோ வாகனம் ஓட்டவோ வேண்டாம்
🚫 தரை ஈரமாக இருந்தால் மின் சாவிகளை தொடாதீர்கள்
✅ உங்கள் கட்டிடத்தில் மிக உயரமான இடத்திற்கு செல்லுங்கள்
✅ 112 அல்லது 1078 அழைக்கவும்

*வெள்ளத்திற்கு பிறகு:*
✅ அதிகாரப்பூர்வ அனுமதிக்கு காத்திருங்கள்
✅ குழாய் நீரை குடிக்காதீர்கள் — மாசுபட்டிருக்கலாம்
✅ தொய்வான மின் கம்பிகளை கவனமாக இருங்கள்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  WHAT IS A FLOOD
    # ─────────────────────────────────────────────────────
    "what_is_flood": {
        "keywords": [
            "what is a flood", "what is flood", "what is flooding", "meaning of flood",
            "types of flood", "flash flood", "define flood", "explain flood",
            "வெள்ளம் என்றால் என்ன", "வெள்ள வகைகள்", "வெள்ளம் என்ன"
        ],
        "responses": {
            "english": """🌊 *What is a Flood?*
A flood occurs when water overflows onto normally dry land due to heavy rainfall, river overflow, or storm surge.

*Types of Floods:*
• Flash Floods — occur within 6 hours of heavy rainfall; most deadly
• River Floods — overflow of river banks after sustained rain
• Coastal Floods — caused by storm surge, cyclones, or tsunami
• Urban Floods — poor city drainage overwhelmed by rain
• Glacial Floods — sudden release of water from glacial lakes

*Warning Signs:*
⚠️ Rapidly rising water levels
⚠️ Heavy, continuous rainfall for hours
⚠️ Dark clouds, thunder, lightning
⚠️ River banks looking unusually full""",

            "tamil": """🌊 *வெள்ளம் என்றால் என்ன?*
கனமழை, நதி நிரம்பி வழிதல் அல்லது புயல் அலை காரணமாக சாதாரணமாக வறண்ட நிலத்தில் தண்ணீர் நிரம்புவதால் வெள்ளம் ஏற்படுகிறது.

*வெள்ள வகைகள்:*
• திடீர் வெள்ளம் — கனமழைக்கு 6 மணி நேரத்திற்குள்; மிகவும் ஆபத்தானது
• ஆற்று வெள்ளம் — நீடித்த மழையின் பிறகு நதி கரைகள் நிரம்பி வழிதல்
• கடலோர வெள்ளம் — புயல் அலை, சுழற்காற்று அல்லது சுனாமி
• நகர்ப்புற வெள்ளம் — நகரின் மோசமான வடிகால் வசதி

*எச்சரிக்கை அறிகுறிகள்:*
⚠️ விரைவாக உயரும் நீர் மட்டம்
⚠️ மணிக்கணக்கில் தொடர்ச்சியான கனமழை
⚠️ இருண்ட மேகங்கள், இடி, மின்னல்
⚠️ ஆற்று கரைகள் அசாதாரணமாக நிரம்பியிருத்தல்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  LANDSLIDE SAFETY
    # ─────────────────────────────────────────────────────
    "landslide_safety": {
        "keywords": [
            "landslide safety", "safe from landslide", "survive landslide",
            "trapped in landslide", "landslide action",
            "prevent landslide", "avoid landslide", "landslide precaution",
            "நிலச்சரிவு பாதுகாப்பு", "நிலச்சரிவில்"
        ],
        "responses": {
            "english": """🛡️ *Landslide Safety*

*Immediate Actions if You Suspect a Landslide:*
🚨 Evacuate immediately and move perpendicular to the slope
🚨 Do NOT run downhill — move sideways to escape path
🚨 Get to a flat, open area far from valleys
🚨 Call 112 or 1078 immediately
🚨 Alert neighbours

*If Trapped:*
✅ Cover your head to protect from falling debris
✅ Signal for help with a whistle or bright cloth
✅ Stay calm and conserve energy

*Safe Zones:*
✅ Flat open ground away from valleys
✅ Concrete buildings on flat land
✅ Government-designated flood/landslide shelters""",

            "tamil": """🛡️ *நிலச்சரிவு பாதுகாப்பு*

*உடனடி நடவடிக்கைகள்:*
🚨 உடனடியாக வெளியேறுங்கள் — சரிவுக்கு குறுக்காக நகரவும்
🚨 கீழ்நோக்கி ஓடாதீர்கள் — பக்கவாட்டில் நகரவும்
🚨 பள்ளத்தாக்குகளிலிருந்து விலகிய தட்டையான திறந்த இடத்திற்கு செல்லுங்கள்
🚨 உடனே 112 அல்லது 1078 அழைக்கவும்

*சிக்கிக்கொண்டால்:*
✅ விழும் குப்பைகளிலிருந்து தலையை பாதுகாக்க மூடிக்கொள்ளுங்கள்
✅ விசில் அல்லது பிரகாசமான துணியால் உதவி கோருங்கள்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  WHAT IS A LANDSLIDE
    # ─────────────────────────────────────────────────────
    "what_is_landslide": {
        "keywords": [
            "what is a landslide", "what is landslide", "mudslide", "rockfall",
            "slope failure", "explain landslide", "causes of landslide",
            "landslide", "land slide",
            "நிலச்சரிவு என்றால் என்ன", "மண் சரிவு", "நிலச்சரிவு காரணங்கள்"
        ],
        "responses": {
            "english": """⛰️ *What is a Landslide?*
A landslide is the movement of rock, earth, or debris down a slope.

*Types:*
• Rockfall — rocks falling from steep cliffs
• Mudflow — rapid flow of wet soil and water
• Debris Flow — mix of rock, soil, and water
• Rotational Slide — curved movement of large soil mass

*Causes:*
🌧️ Heavy or prolonged rainfall (most common)
🌊 Earthquake vibrations
🌲 Deforestation and loss of roots
🏗️ Construction on unstable slopes

*Warning Signs:*
⚠️ Cracks appearing in walls or ground
⚠️ Tilting trees, poles, or fences
⚠️ Unusual rumbling or cracking sounds
⚠️ Water seeping through soil or walls
⚠️ Sudden change in stream water color (turns muddy)""",

            "tamil": """⛰️ *நிலச்சரிவு என்றால் என்ன?*
புவியீர்ப்பு காரணமாக சரிவில் பாறை, மண் அல்லது குப்பைகள் நகர்வதே நிலச்சரிவு.

*வகைகள்:*
• பாறை விழுகை — செங்குத்தான பாறைகளிலிருந்து
• சேறு ஓட்டம் — ஈரமான மண்ணின் வேகமான ஓட்டம்
• குப்பை ஓட்டம் — பாறை, மண் மற்றும் நீர் கலவை

*காரணங்கள்:*
🌧️ கனமழை அல்லது நீடித்த மழை
🌊 நிலநடுக்க அதிர்வுகள்
🌲 காடழிப்பு

*எச்சரிக்கை அறிகுறிகள்:*
⚠️ சுவர்கள் அல்லது தரையில் விரிசல்கள்
⚠️ சாய்ந்த மரங்கள் அல்லது தூண்கள்
⚠️ அசாதாரண சத்தங்கள்
⚠️ அருவி நீரில் திடீர் மாற்றம்"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  EMERGENCY CONTACTS (Catch-all last)
    # ─────────────────────────────────────────────────────
    "emergency_contacts": {
        "keywords": [
            "emergency", "help", "danger", "rescue", "stuck", "trapped",
            "helpline", "contact", "number", "call", "phone", "sos", "alert",
            "அவசரம்", "உதவி", "ஆபத்து", "மீட்பு", "அவசர எண்", "தொடர்பு"
        ],
        "responses": {
            "english": """🚨 *EMERGENCY CONTACTS — INDIA*

*National Helplines:*
📞 All Emergencies          : 112
📞 National Disaster        : 1078
📞 Police                   : 100
📞 Fire Department          : 101
📞 Ambulance                : 108
📞 Women Helpline           : 1091
📞 Child Helpline           : 1098

*Disaster Management:*
📞 NDRF Helpline            : 011-24363260
📞 NDMA                     : 011-26701728

*Tamil Nadu Specific:*
📞 TN Disaster Helpline     : 1070
📞 TN Relief Commissioner  : 044-28519999
📞 Chennai Flood Control    : 044-25384510

⛑️ *NDRF Teams are deployed across India for flood rescue.*
⚠️ If in IMMEDIATE danger — CALL 112 RIGHT NOW!""",

            "tamil": """🚨 *அவசரகால தொடர்பு எண்கள் — இந்தியா*

*தேசிய உதவி எண்கள்:*
📞 அனைத்து அவசரகாலம்      : 112
📞 தேசிய பேரிடர்           : 1078
📞 காவல்துறை               : 100
📞 தீயணைப்பு               : 101
📞 ஆம்புலன்ஸ்              : 108
📞 பெண்கள் உதவி           : 1091
📞 குழந்தை உதவி           : 1098

*பேரிடர் மேலாண்மை:*
📞 NDRF                    : 011-24363260
📞 NDMA                    : 011-26701728

*தமிழ்நாடு:*
📞 TN பேரிடர் உதவி        : 1070
📞 சென்னை வெள்ள கட்டுப்பாடு : 044-25384510

⚠️ உடனடி ஆபத்தில் இருந்தால் இப்போதே 112 அழைக்கவும்!"""
        }
    },

    # ─────────────────────────────────────────────────────
    #  CATCH ALL FALLBACK FOR "FLOOD" 
    #  (If they just type "flood" and it didn't match the specifics above)
    # ─────────────────────────────────────────────────────
    "general_flood": {
        "keywords": [
            "flood", "flooding", "water level", "river overflow", "inundation",
            "வெள்ளம்", "வெள்ளப்பெருக்கு", "நீர் மட்டம்", "ஆறு", "தண்ணீர்"
        ],
        "responses": {
            "english": """🌊 It looks like you're asking about floods. To give you the best information, please specify what you'd like to know:

• Types of floods or what a flood is?
• Flood safety and precautions?
• Emergency contacts? 
• Evacuation guides?
• First aid or water safety?""",

            "tamil": """🌊 நீங்கள் வெள்ளம் பற்றி கேட்கிறீர்கள் போல தோன்றுகிறது. சிறந்த தகவலை வழங்க, நீங்கள் என்ன அறிய விரும்புகிறீர்கள் என்பதை குறிப்பிடவும்:

• வெள்ள வகைகள் அல்லது வெள்ளம் என்றால் என்ன?
• வெள்ள பாதுகாப்பு மற்றும் முன்னெச்சரிக்கைகள்?
• அவசரகால தொடர்புகள்?
• வெளியேற்ற வழிகாட்டிகள்?
• முதலுதவி அல்லது நீர் பாதுகாப்பு?"""
        }
    }
}

QUICK_RESPONSES = {
    "english": {
        "not_found": """I'm not sure about that specific topic. I'm best at helping with:
🌊 Floods & landslides  |  🚨 Emergency contacts  |  🛡️ Safety tips
🎒 Emergency kits  |  💧 Water safety  |  🚐 Evacuation planning

Could you rephrase your question or ask about one of these topics?""",
        "error": "Sorry, something went wrong on my end. Please try again! For emergencies, call 112.",
        "language_switch": "Switched to English mode ✅"
    },
    "tamil": {
        "not_found": """அந்த தலைப்பில் என்னிடம் தகவல் இல்லை. நான் இதில் சிறப்பாக உதவுகிறேன்:
🌊 வெள்ளம் & நிலச்சரிவு  |  🚨 அவசர தொடர்புகள்  |  🛡️ பாதுகாப்பு குறிப்புகள்

உங்கள் கேள்வியை மீண்டும் கேளுங்கள்!""",
        "error": "மன்னிக்கவும், என்னால் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்! அவசரத்திற்கு 112 அழைக்கவும்.",
        "language_switch": "தமிழ் மொழிக்கு வெற்றிகரமாக மாறினோம் ✅"
    }
}
