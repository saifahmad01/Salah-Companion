/**
 * Authentic Hadiths library curated for Salah status reflection
 */
const HADITH_DATABASE = {
  on_time: [
    {
      id: 'ontime-1',
      title: 'Dearest Deeds to Allah (اللہ کے نزدیک سب سے محبوب عمل)',
      statusCategory: 'on_time',
      arabic: 'عَنْ عَبْدِ اللَّهِ بْنِ مَسْعُودٍ رَضِيَ اللَّهُ عَنْهُ، قَالَ: سَأَلْتُ النَّبِيَّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: أَيُّ الْعَمَلِ أَحَبُّ إِلَى اللَّهِ؟ قَالَ: «الصَّلَاةُ عَلَى وَقْتِهَا»',
      english: 'Abdullah ibn Mas’ud reported: I asked the Prophet ﷺ, "Which deed is dearest to Allah?" He replied: "To perform prayer at its proper earliest time."',
      urdu: 'حضرت عبداللہ بن مسعود رضی اللہ عنہ فرماتے ہیں کہ میں نے نبی کریم ﷺ سے پوچھا: اللہ تعالیٰ کے نزدیک کون سا عمل سب سے زیادہ محبوب ہے؟ آپ ﷺ نے فرمایا: ”اپنے وقت پر نماز پڑھنا۔“',
      romanHindi: 'Abdullah ibn Mas\'ud (R.A.) ne farmaya: Maine Nabi ﷺ se pucha: Kaunsa amal Allah ko sabse zyada pasand hai? Aap ﷺ ne farmaya: "Namaz ko uske muqarrara waqt par ada karna."',
      reference: 'Sahih al-Bukhari #527 • صحیح البخاری 527',
      book: 'Book of the Times of Prayer (مواقيت الصلاة)',
      wisdom: 'Praying immediately upon hearing the Adhan earns supreme closeness to Allah and sets the discipline for your day.'
    },
    {
      id: 'ontime-2',
      title: 'Five Daily Prayers as a Cleansing Stream',
      statusCategory: 'on_time',
      arabic: 'عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ، أَنَّ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ: «أَرَأَيْتُمْ لَوْ أَنَّ نَهَرًا بِبَابِ أَحَدِكُمْ يَغْتَسِلُ مِنْهُ كُلَّ يَوْمٍ خَمْسَ مَرَّاتٍ، هَلْ يَبْقَى مِنْ دَرَنِهِ شَيْءٌ؟» قَالُوا: لَا يَبْقَى مِنْ دَرَنِهِ شَيْءٌ، قَالَ: «فَذَلِكَ مَثَلُ الصَّلَوَاتِ الْخَمْسِ، يَمْحُو اللَّهُ بِهِنَّ الْخَطَايَا»',
      english: 'Abu Hurairah reported: The Messenger of Allah ﷺ said, "Consider: if there were a flowing river by someone’s door in which he bathed five times daily, would any dirt remain on him?" They said, "No dirt would remain." He said, "That is the similitude of the five prayers; Allah erases sins through them."',
      urdu: 'حضرت ابو ہریرہ رضی اللہ عنہ سے روایت ہے کہ رسول اللہ ﷺ نے فرمایا: ”اگر تم میں سے کسی کے دروازے پر نہر ہو جس میں وہ روزانہ پانچ بار نہاتا ہو تو کیا اس کے جسم پر کچھ میل رہے گا؟“ صحابہ نے عرض کیا: کچھ بھی نہیں، فرمایا: ”یہی مثال پانچوں نمازوں کی ہے، اللہ ان کے ذریعے گناہوں کو مٹا دیتا ہے۔“',
      romanHindi: 'Rasoolullah ﷺ ne farmaya: Agar kisi ke darwaze par nehar ho jisme wo rozana 5 martaba ghusl kare, to kya koi mael baqi rahega? Sahaba ne kaha: Kuch nahi. Farmaya: "Yehi misal 5 namazon ki hai, Allah inke zariye gunahon ko mita deta hai."',
      reference: 'Sahih al-Bukhari #528 & Sahih Muslim #667',
      book: 'Book of Prayer (كتاب الصلاة)',
      wisdom: 'Consistency in regular, on-time prayer washes away minor lapses and shields the soul.'
    }
  ],

  late: [
    {
      id: 'late-1',
      title: 'Warning Against Delaying Prayer Carelessly',
      statusCategory: 'late',
      arabic: 'عَنْ أَنَسٍ رَضِيَ اللَّهُ عَنْهُ، قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ يَقُولُ: «تِلْكَ صَلَاةُ الْمُنَافِقِ، يَجْلِسُ يَرْقُبُ الشَّمْسَ حَتَّى إِذَا كَانَتْ بَيْنَ قَرْنَيِ الشَّيْطَانِ قَامَ فَنَقَرَهَا أَرْبَعًا، لَا يَذْكُرُ اللَّهَ فِيهَا إِلَّا قَلِيلًا»',
      english: 'Anas reported: I heard the Messenger of Allah ﷺ say: "That is the prayer of the hypocrite: he sits watching the sun until it is between the horns of the devil (about to set), then he gets up and pecks four rak‘ahs, remembering Allah but little."',
      urdu: 'حضرت انس رضی اللہ عنہ فرماتے ہیں: میں نے رسول اللہ ﷺ کو فرماتے سنا: ”یہ منافق کی نماز ہے، وہ بیٹھ کر سورج کا انتظار کرتا رہتا ہے یہاں تک کہ جب وہ ڈوبنے لگتا ہے تو جلدی سے چار ٹھونگیں مار لیتا ہے، اور اللہ کا ذکر نہیں کرتا مگر بہت کم۔“',
      romanHindi: 'Anas (R.A.) ne farmaya: Maine Rasoolullah ﷺ ko farmate suna: "Yeh munafiq ki namaz hai, jo baith kar suraj ka intezar karta hai yahan tak ke jab wo doobne lagta hai to uth kar chaar thongain maar leta hai aur Allah ko bohat kam yaad karta hai."',
      reference: 'Sahih Muslim #622 • صحیح مسلم 622',
      book: 'Book of Mosques & Places of Prayer (كتاب المساجد ومواضع الصلاة)',
      wisdom: 'While praying before the window closes fulfills the obligation, deliberate procrastination drains tranquility and spiritual focus. Aim for early performance.'
    },
    {
      id: 'late-2',
      title: 'Steadfastness and Guarding Prayers',
      statusCategory: 'late',
      arabic: 'عَنْ أُمِّ فَرْوَةَ رَضِيَ اللَّهُ عَنْهَا، قَالَتْ: سُئِلَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ: أَيُّ الْأَعْمَالِ أَفْضَلُ؟ قَالَ: «الصَّلَاةُ فِي أَوَّلِ وَقْتِهَا»',
      english: 'Umm Farwah reported: The Messenger of Allah ﷺ was asked: Which deed is the most excellent? He replied: "Prayer in the first part of its designated time."',
      urdu: 'حضرت ام فروہ رضی اللہ عنہا سے روایت ہے کہ رسول اللہ ﷺ سے دریافت کیا گیا: کون سا عمل افضل ہے؟ آپ ﷺ نے فرمایا: ”نماز کو اس کے اول وقت میں ادا کرنا۔“',
      romanHindi: 'Umm Farwah (R.A.) se riwayat hai ke Rasoolullah ﷺ se pucha gaya: Kaunsa amal sabse afzal hai? Farmaya: "Namaz ko uske awwal waqt me ada karna."',
      reference: 'Sunan Abi Dawud #426 & Jami` at-Tirmidhi #170',
      book: 'Sunan Abi Dawud • Hasan Sahih',
      wisdom: 'Make haste towards good deeds; delaying invites Shaytan to cause total abandonment.'
    }
  ],

  missed: [
    {
      id: 'missed-1',
      title: 'Expiation for Missed Prayer (قضاء اور تلافی کا حکم)',
      statusCategory: 'missed',
      arabic: 'عَنْ أَنَسِ بْنِ مَالِكٍ رَضِيَ اللَّهُ عَنْهُ، عَنِ النَّبِيِّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ: «مَنْ نَسِيَ صَلَاةً فَلْيُصَلِّ إِذَا ذَكَرَهَا، لَا كَفَّارَةَ لَهَا إِلَّا ذَلِكَ: {وَأَقِمِ الصَّلَاةَ لِذِكْرِي}»',
      english: 'Anas ibn Malik reported: The Prophet ﷺ said: "Whoever forgets a prayer or sleeps through it, let him perform it as soon as he remembers it. There is no expiation for it other than that: {And establish prayer for My remembrance}."',
      urdu: 'حضرت انس بن مالک رضی اللہ عنہ سے روایت ہے کہ نبی کریم ﷺ نے فرمایا: ”جو شخص نماز بھول جائے یا سوتا رہ جائے تو جب یاد آئے اسے ادا کر لے، اس کا اس کے سوا کوئی کفارہ نہیں، {اور میری یاد کے لیے نماز قائم کرو}۔“',
      romanHindi: 'Anas ibn Malik (R.A.) se riwayat hai ke Nabi ﷺ ne farmaya: "Jo shakhs namaz bhool jaye ya sota reh jaye, to jab yaad aaye use ada kar le, iska iske siwa koi kaffara nahi: {Aur meri yaad ke liye namaz qaim karo}."',
      reference: 'Sahih al-Bukhari #597 & Sahih Muslim #684',
      book: 'Sahih al-Bukhari • Chapter: Whoever forgets prayer',
      wisdom: 'Do not succumb to despair. Turn to Allah in repentance (Tawbah) and immediately pray your Qada prayer to restore your spiritual connection.'
    },
    {
      id: 'missed-2',
      title: 'Allah Welcomes the Repentant',
      statusCategory: 'missed',
      arabic: 'عَنْ أَبِي مُوسَى الأَشْعَرِيِّ رَضِيَ اللَّهُ عَنْهُ، عَنِ النَّبِيِّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ: «إِنَّ اللَّهَ عَزَّ وَجَلَّ يَبْسُطُ يَدَهُ بِاللَّيْلِ لِيَتُوبَ مُسِيءُ النَّهَارِ، وَيَبْسُطُ يَدَهُ بِالنَّهَارِ لِيَتُوبَ مُسِيءُ اللَّيْلِ، حَتَّى تَطْلُعَ الشَّمْسُ مِنْ مَغْرِبِهَا»',
      english: 'Abu Musa reported: The Prophet ﷺ said: "Allah the Almighty stretches out His Hand at night to accept the repentance of the one who sinned during the day, and stretches out His Hand during the day to accept the repentance of the one who sinned at night, until the sun rises from the west."',
      urdu: 'حضرت ابو موسیٰ اشعری رضی اللہ عنہ سے روایت ہے کہ نبی کریم ﷺ نے فرمایا: ”اللہ تعالیٰ رات کو اپنا ہاتھ پھیلاتا ہے تاکہ دن کا گناہ گار توبہ کرے، اور دن کو اپنا ہاتھ پھیلاتا ہے تاکہ رات کا گناہ گار توبہ کرے، یہاں تک کہ سورج مغرب سے طلوع ہو۔“',
      romanHindi: 'Nabi ﷺ ne farmaya: Allah Ta\'ala raat ko apna dast-e-rehmat phelata hai taake din ka gunahgaar tauba kare, aur din ko apna hath phelata hai taake raat ka gunahgaar tauba kare.',
      reference: 'Sahih Muslim #2759 • صحیح مسلم 2759',
      book: 'Book of Repentance (كتاب التوبة)',
      wisdom: 'Missing a prayer is an opportunity to humble yourself, seek forgiveness, and immediately offer Qada.'
    }
  ]
};

/**
 * Returns a tailored authentic Hadith for prayer status
 * @param {string} status 'on_time' | 'late' | 'missed'
 * @param {number} [index] Optional index to pick specific hadith
 */
export function getHadithByStatus(status = 'on_time', index = null) {
  const normalized = (status || 'on_time').toLowerCase().replace('-', '_');
  const validStatus = ['on_time', 'late', 'missed'].includes(normalized) ? normalized : 'on_time';

  const list = HADITH_DATABASE[validStatus];
  let selected;

  if (typeof index === 'number' && index >= 0 && index < list.length) {
    selected = list[index];
  } else {
    // Pick randomly or first
    selected = list[Math.floor(Math.random() * list.length)];
  }

  return {
    status: validStatus,
    hadith: selected,
    totalAvailable: list.length,
  };
}
