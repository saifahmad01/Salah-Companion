export interface DailyHadith {
  id: string
  title: string
  tag: string
  arabic: string
  urdu: string
  romanHindi: string
  english: string
  reference: string
  explanationUrdu: string
  explanationRomanHindi: string
  explanationEnglish: string
  image?: string
}

export const HADITH_COLLECTION: DailyHadith[] = [
  {
    id: 'niyyah',
    title: 'Actions by Intentions (اعمال کا دارومدار نیتوں پر)',
    tag: 'Sincerity',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”تمام اعمال کا دارومدار نیتوں پر ہے، اور ہر انسان کے لیے وہی ہے جس کی اس نے نیت کی۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Tamam aamaal ka daromadar niyaton par hai, aur har insaan ko wahi milega jiski usne niyat ki.”',
    english:
      'The Messenger of Allah ﷺ said: “Actions are judged only according to intentions, and everyone will get what was intended for him.”',
    reference: 'صحیح البخاری (حدیث 1) • Sahih al-Bukhari #1',
    explanationUrdu:
      'اخلاص اور نیک نیت انسان کے ہر جائز کام کو عبادت بنا دیتی ہے۔ نیت صاف ہو تو معمولی عمل بھی اللہ کے ہاں بڑا بن جاتا ہے۔',
    explanationRomanHindi:
      'Ikhlaas aur nek niyat insaan ke har jaaiz kaam ko ibadat bana deti hai. Niyat saaf ho to mamooli aamal bhi azeem ban jata hai.',
    explanationEnglish:
      'Sincerity turns everyday permissible actions into worship. Pure intention magnifies small deeds in the sight of Allah.',
    image: '/images/hadith-exact.png',
  },
  {
    id: 'kindness',
    title: 'Kindness & Mercy (رحمت و شفقت)',
    tag: 'Kindness',
    arabic: 'مَنْ لَا يَرْحَمُ النَّاسَ لَا يَرْحَمُهُ اللَّهُ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”جو لوگوں پر رحم نہیں کرتا، اللہ تعالیٰ اس پر رحم نہیں فرماتا۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Jo logon par raham nahi karta, Allah Ta\'ala uspar raham nahi farmata.”',
    english:
      'The Messenger of Allah ﷺ said: “Whoever does not show mercy to people will not be shown mercy by Allah.”',
    reference: 'صحیح البخاری (حدیث 7376) • Sahih al-Bukhari #7376',
    explanationUrdu:
      'اسلام تمام انسانوں اور مخلوقات کے ساتھ شفقت و مہربانی کی تلقین کرتا ہے۔ دل میں رحم ہوگا تو اللہ کی رحمت نازل ہوگی۔',
    explanationRomanHindi:
      'Islam sabhi insaanon aur makhlooq ke saath narmi aur raham karne ki taaleem deta hai. Dil mein raham hoga to Allah ki rehmat barsegi.',
    explanationEnglish:
      'Islam commands benevolence towards all creation. Having a soft, merciful heart invites divine mercy and blessings.',
    image: '/images/hadith-more-1.png',
  },
  {
    id: 'character',
    title: 'Excellence of Character (حسنِ اخلاق)',
    tag: 'Character',
    arabic:
      'إِنَّ أَحَبَّكُمْ إِلَيَّ وَأَقْرَبَكُمْ مِنِّي مَجْلِسًا يَوْمَ الْقِيَامَةِ أَحَاسِنُكُمْ أَخْلَاقًا',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”قیامت کے دن تم میں سے مجھے سب سے زیادہ محبوب اور میرے سب سے قریب وہ لوگ ہوں گے جن کے اخلاق سب سے اچھے ہیں۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Qiyamat ke din tum mein se mujhe sabse zyada pyare aur mere sabse qareeb wo log honge jinke akhlaaq sabse acche hain.”',
    english:
      'The Messenger of Allah ﷺ said: “The most beloved of you to me and the closest to me on the Day of Resurrection are those with the best character.”',
    reference: 'جامع الترمذی (حدیث 2018) • Jami\' at-Tirmidhi #2018',
    explanationUrdu:
      'حسن اخلاق میزان میں سب سے وزنی عمل ہوگا۔ میٹھی زبان، خندہ پیشانی اور عاجزی کامل ایمان کی علامت ہے۔',
    explanationRomanHindi:
      'Husn-e-akhlaaq qiyamat ke din sabse bhari aamal hoga. Meethi zuban aur aajzi kaamil imaan ki nishani hai.',
    explanationEnglish:
      'Good character carries the heaviest weight on the scale of deeds. A smiling face and humble demeanor reflect deep faith.',
    image: '/images/hadith-more-2.png',
  },
  {
    id: 'knowledge',
    title: 'Seeking Knowledge (طلبِ علم)',
    tag: 'Knowledge',
    arabic:
      'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”جو شخص علم کی تلاش میں کسی راستے پر چلتا ہے، اللہ تعالیٰ اس کے بدلے اس کے لیے جنت کا راستہ آسان فرما دیتا ہے۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Jo shakhs ilm ki talash mein kisi raste par nikalta hai, Allah Ta\'ala uske liye Jannat ka rasta aasan farma deta hai.”',
    english:
      'The Messenger of Allah ﷺ said: “Whoever follows a path seeking knowledge, Allah will make easy for him a path to Paradise.”',
    reference: 'صحیح مسلم (حدیث 2699) • Sahih Muslim #2699',
    explanationUrdu:
      'دین کا علم حاصل کرنا ہر مسلمان پر فرض ہے۔ علمِ نافع انسان کو گمراہی سے بچاتا ہے اور سیدھی راہ دکھاتا ہے۔',
    explanationRomanHindi:
      'Ilm haasil karna har musalman par farz hai. Deen ka sahih ilm insaan ko gumraahi se bachata hai.',
    explanationEnglish:
      'Seeking beneficial Islamic knowledge illuminates a believer\'s heart and removes spiritual darkness.',
    image: '/images/hadith-more-3.png',
  },
  {
    id: 'salam',
    title: 'Spreading Peace & Salam (سلام پھیلانا)',
    tag: 'Brotherhood',
    arabic: 'أَفْشُوا السَّلَامَ بَيْنَكُمْ تَحَابُّوا',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”آپس میں سلام کو عام کرو، تمہارے درمیان باہمی محبت پیدا ہوگی۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Aapas mein Salam ko aam karo, tumhare darmiyan baahami mohabbat paida hogi.”',
    english:
      'The Messenger of Allah ﷺ said: “Spread the greeting of peace (Salam) among yourselves and you will love one another.”',
    reference: 'صحیح مسلم (حدیث 54) • Sahih Muslim #54',
    explanationUrdu:
      'سلام سلامتی کی دعا اور آپس میں الفت و بھائی چارے کا سب سے بڑا ذریعہ ہے۔',
    explanationRomanHindi:
      'Salam salaamati ki dua aur aapas mein mohabbat o bhaichare ka azeem zariya hai.',
    explanationEnglish:
      'Greeting others with Salam fosters brotherhood, dispels animosity, and strengthens communal unity.',
    image: '/images/hadith-more-2.png',
  },
  {
    id: 'quran',
    title: 'Learning the Qur\'an (قرآن سیکھنا اور سکھانا)',
    tag: 'Qur\'an',
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”تم میں سے سب سے بہتر وہ شخص ہے جس نے قرآن سیکھا اور اسے دوسروں کو سکھایا۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Tum mein se sabse behtar shakhs wo hai jisne Qur\'an seekha aur use doosron ko sikhaya.”',
    english:
      'The Prophet ﷺ said: “The best among you are those who learn the Qur\'an and teach it to others.”',
    reference: 'صحیح البخاری (حدیث 5027) • Sahih al-Bukhari #5027',
    explanationUrdu:
      'قرآن مجید اللہ کی آخری کتاب اور ہدایت کا سرچشمہ ہے۔ اس کی تلاوت اور تعلیم سب سے اعلیٰ درجہ رکھتی ہے۔',
    explanationRomanHindi:
      'Qur\'an Allah ka pak kalaam hai. Isko padhna, samajhna aur doosron ko sikhana azeem barkat lata hai.',
    explanationEnglish:
      'The Qur\'an is divine light; engaging with it and transmitting its truth to others represents the pinnacle of service.',
    image: '/images/hadith-exact.png',
  },
  {
    id: 'smiling',
    title: 'Smiling is Charity (مسکراہٹ صدقہ ہے)',
    tag: 'Good Deeds',
    arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”اپنے بھائی کے سامنے تمہارا مسکرا کر ملنا تمہارے لیے صدقہ ہے۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Apne bhai ke samne tumhara muskura kar milna tumhare liye sadqah hai.”',
    english:
      'The Prophet ﷺ said: “Your smiling in the face of your brother is an act of charity for you.”',
    reference: 'جامع الترمذی (حدیث 1956) • Jami\' at-Tirmidhi #1956',
    explanationUrdu:
      'خندہ پیشانی سے ملنا اور لوگوں کا دل خوش کرنا بھی صدقہ اور کارِ ثواب ہے۔',
    explanationRomanHindi:
      'Khush-mizaji se milna aur doosron ke chehre par muskan lana bhi sadqah aur sawab hai.',
    explanationEnglish:
      'A warm smile radiates kindness and brings joy to hearts, counting as continuous charity in the scales.',
    image: '/images/hadith-more-1.png',
  },
  {
    id: 'sabr',
    title: 'Patience & Gratitude (صبر اور شکر)',
    tag: 'Patience',
    arabic:
      'عَجَبًا لِأَمْرِ الْمُؤْمِنِ، إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ، إِنْ أَصَابَتْهُ سَرَّاءُ شَكَرَ فَكَانَ خَيْرًا لَهُ، وَإِنْ أَصَابَتْهُ ضَرَّاءُ صَبَرَ فَكَانَ خَيْرًا لَهُ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”مومن کا ہر معاملہ بھلائی پر مبنی ہے! اگر اسے خوشی ملے تو شکر کرتا ہے، جو اس کے لیے خیر ہے؛ اور اگر تکلیف پہنچے تو صبر کرتا ہے، جو اس کے لیے خیر ہے۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Momin ka har haal kitna behtareen hai! Khushi mile to shukr karta hai to barkat hai, aur takleef aaye to sabr karta hai to ajar hai.”',
    english:
      'The Prophet ﷺ said: “How wonderful is the affair of the believer! Everything for him is good. If ease touches him he is grateful, and if hardship befalls him he is patient.”',
    reference: 'صحیح مسلم (حدیث 2999) • Sahih Muslim #2999',
    explanationUrdu:
      'صبر اور شکر وہ دو صفات ہیں جو انسان کو ہر آزمائش میں اللہ کا قرب عطا کرتی ہیں۔',
    explanationRomanHindi:
      'Sabr aur shukr momin ke do mazboot sutoon hain jo use har mushkil mein kamyabi dete hain.',
    explanationEnglish:
      'Patience in adversity and gratitude in abundance keep the believer steadfast in divine tranquility.',
    image: '/images/hadith-more-3.png',
  },
  {
    id: 'tongue',
    title: 'Guarding the Tongue (زبان کی حفاظت)',
    tag: 'Wisdom',
    arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”جو شخص اللہ اور یومِ آخرت پر ایمان رکھتا ہے، اسے چاہیے کہ اچھی بات کہے یا پھر خاموش رہے۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Jo shakhs Allah aur aakhirat ke din par imaan rakhta hai, use chahiye ke acchi baat kahe ya khamosh rahe.”',
    english:
      'The Prophet ﷺ said: “Whoever believes in Allah and the Last Day should speak what is good or remain silent.”',
    reference: 'صحیح البخاری (حدیث 6018) • Sahih al-Bukhari #6018',
    explanationUrdu:
      'بے فائدہ اور بری باتوں سے بچنا انسان کو فتنوں اور گناہوں سے محفوظ رکھتا ہے۔',
    explanationRomanHindi:
      'Bila-wajah ki baaton se parhez karna insaan ko gunahon aur pachtawe se bachata hai.',
    explanationEnglish:
      'Mindful speech and restraint protect the believer from remorse, backbiting, and spiritual loss.',
    image: '/images/hadith-more-2.png',
  },
  {
    id: 'helping',
    title: 'Helping Others (مدد اور ہمدردی)',
    tag: 'Compassion',
    arabic: 'وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ',
    urdu: 'رسول اللہ ﷺ نے فرمایا: ”اللہ تعالیٰ اس وقت تک بندے کی مدد فرماتا رہتا ہے جب تک بندہ اپنے بھائی کی مدد میں لگا رہتا ہے۔“',
    romanHindi:
      'Rasoolullah ﷺ ne farmaya: “Allah Ta\'ala us waqt tak apne bande ki madad mein rehta hai jab tak banda apne bhai ki madad karta rehta hai.”',
    english:
      'The Prophet ﷺ said: “Allah remains in aid of His servant as long as the servant is in aid of his brother.”',
    reference: 'صحیح مسلم (حدیث 2699) • Sahih Muslim #2699',
    explanationUrdu:
      'دوسروں کے کام آنا اور ان کی ضرورت پوری کرنا اللہ کی خصوصی نصرت و مدد کو کھینچتا ہے۔',
    explanationRomanHindi:
      'Doosron ki madad karna aur unke kaam aana Allah Ta\'ala ki khaas madad ko aakarshit karta hai.',
    explanationEnglish:
      'Serving and supporting fellow human beings unlocks special divine assistance and blessings in one\'s own life.',
    image: '/images/hadith-more-1.png',
  },
]
