import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.OPENCODE_API_KEY;
const baseUrl = process.env.OPENCODE_API_BASE_URL || "https://opencode.ai/zen/v1";
const modelName = "deepseek-v4-flash-free";

const name = "Apex Auto Garage";
const category = "Auto Repair";

const websitePrompt = `
Generate a JSON object containing highly customized, authentic marketing copy and review-centric sections for a business named "${name}" in the niche "${category}".
This information will populate a premium Awwwards-style bento grid website that acts as a **Google Review Showcase Page**. The site will focus entirely on showcasing customer appreciation, verified Google reviews, and rating metrics.

You MUST respond with a single valid JSON block containing exactly the following keys. Do not include any text outside the JSON block.

Schema:
{
  "detectedNiche": "Classify this business name and maps category into one of the following exact strings: 'cafe', 'restaurant', 'luxury restaurant', 'ecommerce', 'luxury ecommerce', 'ai startup', 'web agency', 'saas', 'healthcare', 'gym', 'real estate', 'finance', 'crypto', 'beauty', 'education', 'travel', 'law firm', 'construction', 'hotel'",
  "logoInitials": "2-letter uppercase initials representing the business name",
  "heroTitleLine1": "A punchy, review-centric headline highlighting community love (e.g. 'Loved by the Community', 'Delhi\\'s Favorite Café', 'Highly Recommended Care')",
  "heroTitleAccent": "An active, exciting accent phrase referencing ratings (e.g. '5.0 ★ Google Rating', '450+ Five-Star Reviews', 'Voted Best in Town')",
  "heroSubtitle": "A beautiful 2-sentence description summarizing why guests consistently rate us five stars and what specific experiences/qualities they love most.",
  "heroCtaPrimary": "The primary call to action text (e.g. 'Book a Table' or 'Order Online' for a cafe/restaurant; 'Shop Collection' for clothing; 'Book Appointment' for clinic/services; 'Start Trial' for tech)",
  "heroCtaSecondary": "The secondary call to action text (e.g. 'Read Reviews' or 'View Menu' for a cafe; 'Explore Services' or 'Read Testimonials' for others)",
  "headerCta": "CTA for header button (e.g. 'Book Table', 'Book Appointment', or 'Get Started')",
  "mockupLabel1": "A short stat label in all-caps related to Google rating (e.g. 'TOTAL REVIEWS', 'GOOGLE RATING', 'RECOMMENDATION RATE')",
  "mockupValue1": "A corresponding stat value (e.g. '450+', '4.9/5', '99.8%')",
  "mockupLabel2": "Another short stat label in all-caps (e.g. 'VOTED BEST', 'LOCAL RANK', 'SATISFACTION')",
  "mockupValue2": "A corresponding stat value (e.g. 'Top 10', '#1 in Town', '5/5 Stars')",
  "service1Icon": "An icon keyword keyword representing the first highlight. Choose from: 'coffee', 'utensils', 'sparkles', 'star', 'shopping-bag', 'zap', 'laptop', 'activity', 'heart', 'dumbbell', 'home', 'dollar-sign', 'shield', 'scissors', 'graduation-cap', 'plane', 'scale', 'wrench', 'bed', 'users', 'clock', 'thumbs-up', 'award', 'check-circle', 'smile'",
  "service1Price": "A mention count label (e.g. '45+ Mentions', '82+ Reviews', 'Highly Cited')",
  "service1Title": "Title of the primary praised highlight (e.g. 'Signature Espresso', 'Expert Adjustments', 'Friendly Staff')",
  "service1Desc": "Detailed description of why customers praise this highlight (1-2 sentences)",
  "service2Icon": "An icon keyword keyword representing the second highlight. Choose from: 'coffee', 'utensils', 'sparkles', 'star', 'shopping-bag', 'zap', 'laptop', 'activity', 'heart', 'dumbbell', 'home', 'dollar-sign', 'shield', 'scissors', 'graduation-cap', 'plane', 'scale', 'wrench', 'bed', 'users', 'clock', 'thumbs-up', 'award', 'check-circle', 'smile'",
  "service2Price": "A mention count label for theme 2 (e.g. '32+ Mentions', '54+ Reviews')",
  "service2Title": "Title of praised highlight 2 (e.g. 'Cozy Ambience', 'Painless Treatment', 'Fast Delivery')",
  "service2Desc": "Detailed description of why customers praise this highlight (1-2 sentences)",
  "service3Icon": "An icon keyword keyword representing the third highlight. Choose from: 'coffee', 'utensils', 'sparkles', 'star', 'shopping-bag', 'zap', 'laptop', 'activity', 'heart', 'dumbbell', 'home', 'dollar-sign', 'shield', 'scissors', 'graduation-cap', 'plane', 'scale', 'wrench', 'bed', 'users', 'clock', 'thumbs-up', 'award', 'check-circle', 'smile'",
  "service3Price": "A mention count label for theme 3 (e.g. '28+ Mentions', '41+ Reviews')",
  "service3Title": "Title of praised highlight 3 (e.g. 'Fresh Pastries', 'Knowledgeable Staff', 'Sleek UI')",
  "service3Desc": "Detailed description of why customers praise this highlight (1-2 sentences)",
  "service4Icon": "An icon keyword keyword representing the fourth highlight. Choose from: 'coffee', 'utensils', 'sparkles', 'star', 'shopping-bag', 'zap', 'laptop', 'activity', 'heart', 'dumbbell', 'home', 'dollar-sign', 'shield', 'scissors', 'graduation-cap', 'plane', 'scale', 'wrench', 'bed', 'users', 'clock', 'thumbs-up', 'award', 'check-circle', 'smile'",
  "service4Price": "A mention count label for theme 4 (e.g. '20+ Mentions', '30+ Reviews')",
  "service4Title": "Title of praised highlight 4 (e.g. 'Welcoming Staff', 'Flexible Hours', 'Zero Downtime')",
  "service4Desc": "Detailed description of why customers praise this highlight (1-2 sentences)",
  "whyChooseUsDescription": "A compelling paragraph outlining the unique value proposition, customer commitment, and why our Google Reviews reflect a standard-setting client experience for ${name}.",
  "whyPoint1Title": "A benefit title derived from reviews (e.g. 'Consistent Quality', 'Trusted Experts', 'Prompt Service')",
  "whyPoint1Text": "A 1-sentence explanation of why guests repeatedly highlight this quality in reviews.",
  "whyPoint2Title": "Another benefit title from reviews (e.g. 'Friendly Atmosphere', 'Clean & Safe', 'Exceptional Value')",
  "whyPoint2Text": "A 1-sentence explanation of why guests repeatedly highlight this quality in reviews.",
  "review1Text": "A glowing Google Review testimonial representing a real, authentic customer experience (1-2 sentences)",
  "review1Init": "1-letter uppercase initial of reviewer 1",
  "review1Name": "First name of reviewer 1",
  "review2Text": "Another glowing Google Review testimonial representing customer feedback (1-2 sentences)",
  "review2Init": "1-letter uppercase initial of reviewer 2",
  "review2Name": "First name of reviewer 2",
  "review3Text": "A third glowing Google Review testimonial representing customer feedback (1-2 sentences)",
  "review3Init": "1-letter uppercase initial of reviewer 3",
  "review3Name": "First name of reviewer 3"
}
`;

const systemInstruction = `You are a world-class web design and conversion psychology AI at Nexvora.
Address the user as Sabaru-kun, and work under the identity of Emilia-tan.
We follow the Nexvora Signature Design Language (NSDL) and CPX Conversion Psychology Engine.

When generating the JSON structure:
- You must deeply align the copywriting with a **Google Review Showcase Page** for "${category}".
- Frame all headlines, subtitles, and highlights around verified customer reviews, 5-star ratings, community praise, and top feedback themes.
- Custom CTAs are critical: For a Café or Restaurant, use specific verbs like 'Book Table', 'Order Online', or 'View Menu'. For E-Commerce, use 'Shop Collection' or 'View Products'. For a Gym, use 'Start Training' or 'View Classes'. For service-based or healthcare clinics, use 'Book Appointment'.
- Populate "detectedNiche" with one of the exact strings listed in the schema to enable proper styling rules.
- Match the emotional tone and branding rules from the Nexvora Color Psychology:
  * Café (warm, comforting, organic, colors: beige/brown/gold/cream)
  * Luxury (prestigious, exclusive, black & gold)
  * Tech/SaaS/AI (trustworthy, innovative, purple & navy or electric blue)
  * Healthcare (professional, safe, clean, blue & white)
  * Gym (energetic, powerful, black & red)
- For the service icons ('service1Icon', 'service2Icon', 'service3Icon', 'service4Icon'), you MUST output ONLY one of the exact short string keywords listed in the schema (e.g. 'coffee', 'wrench', 'activity'). Never output raw SVG HTML code.
- Ensure all copy is production-ready, beautiful, and fully complete (never use placeholders).
`;

async function runTest() {
  console.log("Sending query to OpenCode...");
  try {
    const chatUrl = `${baseUrl}/chat/completions`;
    const res = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: websitePrompt }
        ],
        max_tokens: 4000
      })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Raw Response Content:");
    console.log(data?.choices?.[0]?.message?.content);
  } catch (err) {
    console.error("Error:", err);
  }
}

runTest();
