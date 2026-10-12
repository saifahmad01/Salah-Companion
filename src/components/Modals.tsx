import React from 'react'
import {
  X,
  Share2,
  Bookmark,
  CheckCircle,
  Volume2,
  Search,
  Loader2,
  MapPin,
  Compass,
  Clock,
  XCircle,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { searchIndiaPlaces, type ResolvedLocation } from '../utils/geocoding'
import type { PrayerItem, PrayerStatus } from '../types'
import type { CityInfo } from '../utils/prayerTimes'

interface ModalWrapperProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="relative w-full max-w-[430px] sm:max-w-[500px] md:max-w-[540px] bg-[#FAF8F3] rounded-t-[28px] sm:rounded-[28px] max-h-[85vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E9E4D8]">
          <h3 className="text-[17px] font-bold text-[#14261E]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-300 flex items-center justify-center text-stone-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  )
}

export interface HadithDetailData {
  title?: string
  arabic?: string
  english?: string
  urdu?: string
  romanHindi?: string
  reference?: string
  explanation?: string
  explanationUrdu?: string
  explanationRomanHindi?: string
}

export const HadithModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  hadithData?: HadithDetailData | null
  onNextHadith?: () => void
  onPrevHadith?: () => void
  currentIndex?: number
  totalCount?: number
}> = ({
  isOpen,
  onClose,
  hadithData,
  onNextHadith,
  onPrevHadith,
  currentIndex,
  totalCount,
}) => {
  const [hadithLang, setHadithLang] = React.useState<'all' | 'urdu' | 'roman' | 'english'>('all')

  const defaultArabic = 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى'
  const defaultUrdu = 'رسول اللہ ﷺ نے فرمایا: تمام اعمال کا دارومدار نیتوں پر ہے، اور ہر انسان کے لیے وہی ہے جس کی اس نے نیت کی۔'
  const defaultRoman = 'Rasoolullah ﷺ ne farmaya: Tamam aamaal ka daromadar niyaton par hai, aur har insaan ko wahi milega jiski usne niyat ki.'
  const defaultEnglish = '“Actions are judged only according to intentions, and everyone will get what was intended for him.”'
  const defaultRef = 'صحیح البخاری (حدیث 1) • Sahih al-Bukhari #1'
  const defaultTitle = 'Hadith of the Day (حدیثِ نبوی ﷺ)'

  const title = hadithData?.title || defaultTitle
  const arabic = hadithData?.arabic || defaultArabic
  const urdu = hadithData?.urdu || defaultUrdu
  const romanHindi = hadithData?.romanHindi || defaultRoman
  const english = hadithData?.english || defaultEnglish
  const ref = hadithData?.reference || defaultRef

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-3.5">
        {/* Next / Previous Stepper Navigation */}
        {(onNextHadith || onPrevHadith) && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#F6F3EB] border border-[#E7E2D5]">
            <button
              type="button"
              onClick={onPrevHadith}
              aria-label="Previous Hadith"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D8D2C2] text-[#14261E] text-[11px] font-semibold hover:bg-stone-50 active:scale-95 transition cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0E543F] animate-pulse"></span>
              <span className="text-[11.5px] font-bold text-[#0E543F]">
                {typeof currentIndex === 'number' && typeof totalCount === 'number'
                  ? `Hadith ${currentIndex + 1} of ${totalCount}`
                  : 'Daily Hadith'}
              </span>
            </div>

            <button
              type="button"
              onClick={onNextHadith}
              aria-label="Next Hadith"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0C4535] hover:bg-[#083327] active:scale-95 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
            >
              <span>Next Hadith</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Language Switcher Tabs */}
        <div className="flex items-center justify-between pb-1 border-b border-[#EDE8DC]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0E543F]">
            Translation (ترجمہ)
          </span>
          <div className="flex items-center gap-1 bg-[#F5F2EA] p-0.5 rounded-xl">
            {(
              [
                { id: 'all', label: 'All / سب' },
                { id: 'urdu', label: 'اردو' },
                { id: 'roman', label: 'Roman Hindi' },
                { id: 'english', label: 'English' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHadithLang(tab.id)}
                className={`px-2 py-0.8 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                  hadithLang === tab.id
                    ? 'bg-[#0C4535] text-white shadow-2xs'
                    : 'text-[#506157] hover:text-[#14261E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Arabic Calligraphy Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#072F23] to-[#0D4435] text-white text-center shadow-sm">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5DC96] block mb-1.5">
            الحدیث النبوی الشریف ﷺ
          </span>
          <p
            dir="rtl"
            className="font-amiri text-[22px] sm:text-[24px] font-bold leading-[1.8] text-[#FAF0D7] text-center"
          >
            {arabic}
          </p>
        </div>

        {/* 1. Urdu Translation (اردو ترجمہ) */}
        {(hadithLang === 'all' || hadithLang === 'urdu') && (
          <div className="p-3.5 rounded-xl bg-[#F4F9F6] border border-[#D5EADB] space-y-1 text-right">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                اردو ترجمہ
              </span>
              <span className="text-[11px] font-bold text-[#0E543F]">
                Urdu Translation
              </span>
            </div>
            <p
              dir="rtl"
              className="text-[14px] text-[#0A3D2F] font-medium leading-[1.7] text-right"
            >
              {urdu}
            </p>
          </div>
        )}

        {/* 2. Roman Hindi Translation */}
        {(hadithLang === 'all' || hadithLang === 'roman') && (
          <div className="p-3.5 rounded-xl bg-[#FFFDF5] border border-[#FBEEC8] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#8F5E15]">
                Roman Hindi (रोमन हिंदी)
              </span>
              <span className="text-[9.5px] font-semibold text-stone-400">
                Asaan Hindi/Urdu
              </span>
            </div>
            <p className="text-[13px] text-[#222E26] font-medium leading-relaxed">
              {romanHindi}
            </p>
          </div>
        )}

        {/* 3. English Translation */}
        {(hadithLang === 'all' || hadithLang === 'english') && (
          <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#ECE7DC] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#34463C]">
                English Translation
              </span>
            </div>
            <p className="text-[12.5px] text-[#4A5B52] leading-relaxed">
              {english}
            </p>
          </div>
        )}

        {/* Reference */}
        <div className="p-2.5 rounded-xl bg-white border border-[#EDE8DC] flex items-center justify-between text-xs">
          <span className="font-bold text-[#0E543F]">
            📚 {ref}
          </span>
          <span className="text-[10.5px] text-stone-400 font-medium">Authentic Hadith</span>
        </div>

        {/* Explanation / Wisdom */}
        <div className="p-3.5 rounded-xl bg-white border border-[#EDE8DC] text-xs text-[#4A5B52] space-y-1.5 leading-relaxed">
          <h4 className="text-[11px] font-bold text-[#0E543F] uppercase tracking-wider">
            Key Wisdom & Benefit (حکمت و نصیحت)
          </h4>
          <p dir="rtl" className="text-[#1F2E26] text-right font-medium leading-[1.6]">
            {hadithData?.explanationUrdu ||
              hadithData?.explanation ||
              'اخلاص اور نیک نیت انسان کے ہر جائز کام کو عبادت بنا دیتی ہے۔ نیت صاف ہو تو معمولی عمل بھی اللہ کے ہاں بڑا بن جاتا ہے۔'}
          </p>
          <p className="text-[11px] text-[#55675D] italic">
            {hadithData?.explanationRomanHindi ||
              'Ikhlaas aur nek niyat insaan ke har jaaiz kaam ko ibadat bana deti hai. Niyat saaf ho to mamooli aamal bhi azeem ban jata hai.'}
          </p>
          {hadithData?.explanation && hadithData.explanation !== hadithData.explanationUrdu && (
            <p className="text-[11px] text-[#607167]">
              {hadithData.explanation}
            </p>
          )}
        </div>

        {/* Primary Next Hadith Button */}
        {onNextHadith && (
          <button
            type="button"
            onClick={onNextHadith}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0C4535] to-[#125844] hover:from-[#083427] hover:to-[#0D4636] active:scale-[0.98] text-white text-[12px] font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <span>Next Hadith • اگلی حدیث پڑھیں</span>
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>
        )}

        {/* Secondary Action buttons */}
        <div className="flex gap-2 pt-0.5">
          <button
            type="button"
            className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 active:scale-[0.98] text-[#1B2D24] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E2DDCF] transition cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmark</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const fullShareText = `${arabic}\n\nUrdu:\n${urdu}\n\nRoman Hindi:\n${romanHindi}\n\nEnglish:\n${english}\n\n— ${ref}`
              if (navigator.share) {
                navigator.share({ title, text: fullShareText })
              } else {
                navigator.clipboard.writeText(fullShareText)
                alert('Hadith copied to clipboard with Urdu & Roman Hindi!')
              }
            }}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#E2DDCF] transition cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}

export const PrayerDetailModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  prayer: PrayerItem | null
  onTogglePrayer: (id: string) => void
  onOpenStatusModal?: (prayer: PrayerItem) => void
  cityName?: string
  calculationMethod?: string
  madhab?: string
}> = ({
  isOpen,
  onClose,
  prayer,
  onTogglePrayer,
  onOpenStatusModal,
  cityName,
  calculationMethod,
  madhab,
}) => {
  const [virtueLang, setVirtueLang] = React.useState<'all' | 'urdu' | 'roman' | 'english'>('all')

  if (!prayer) return null

  const rakatsInfo: Record<
    string,
    {
      fard: number
      sunnah: string
      total: number
      rule: string
      hadithArabic: string
      hadithUrdu: string
      hadithRoman: string
      hadithEnglish: string
      reference: string
      fazeelatUrdu: string
      fazeelatRoman: string
      fazeelatEnglish: string
    }
  > = {
    fajr: {
      fard: 2,
      sunnah: '2 Sunnah (Muakkadah before Fard)',
      total: 4,
      rule:
        'Begins at true dawn (Subh Sadiq) when twilight light spreads horizontally, and ends strictly at sunrise.',
      hadithArabic:
        'رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا • مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ',
      hadithUrdu:
        'رسول اللہ ﷺ نے فرمایا: ”فجر کی دو رکعتیں (سنتیں) دنیا اور جو کچھ دنیا میں ہے ان سب سے بہتر ہیں۔“ اور فرمایا: ”جس نے صبح (فجر) کی نماز پڑھی وہ اللہ تعالیٰ کی امان اور پناہ میں آ گیا۔“',
      hadithRoman:
        'Rasoolullah ﷺ ne farmaya: "Fajr ki do rakat (sunnatein) poori duniya aur jo kuch duniya mein hai un sabse behtar hain." Aur farmaya: "Jisne Fajr ki namaz (jamat se) padhi wo Allah Ta\'ala ke zimme aur hifazat mein aa gaya."',
      hadithEnglish:
        'The Prophet ﷺ said: "The two rakahs of Sunnah before Fajr are better than the world and all it contains." (Sahih Muslim 725) And: "Whoever prays Fajr is under the protection and covenant of Allah." (Sahih Muslim 657)',
      reference: 'صحیح مسلم (حدیث: 725 اور 657) • Sahih Muslim 725 & 657',
      fazeelatUrdu:
        'فجر کے وقت رات اور دن کے فرشتے جمع ہوتے ہیں اور بارگاہِ الٰہی میں نمازیوں کی حاضری کی گواہی دیتے ہیں۔',
      fazeelatRoman:
        'Fajr ke waqt raat aur din ke farishte jama hote hain اور Allah Ta\'ala ke samne bande ki haazri ki gawaahi dete hain.',
      fazeelatEnglish:
        'Angels of the night and day assemble together during Fajr, testifying to Allah for those who stood in prayer.',
    },
    dhuhr: {
      fard: 4,
      sunnah: '4 Sunnah before + 2 Sunnah after Fard',
      total: 10,
      rule:
        'Begins when the sun passes the meridian (Zawal) and lasts until Asr begins.',
      hadithArabic:
        'مَنْ حَافَظَ عَلَى أَرْبَعِ رَكَعَاتٍ قَبْلَ الظُّهْرِ وَأَرْبَعٍ بَعْدَهَا حَرَّمَهُ اللَّهُ عَلَى النَّارِ',
      hadithUrdu:
        'رسول اللہ ﷺ نے فرمایا: ”جس شخص نے ظہر سے پہلے چار رکعتوں اور ظہر کے بعد چار رکعتوں (سنتوں) کی پابندی کی، اللہ تعالیٰ اس پر جہنم کی آگ کو حرام فرما دے گا۔“',
      hadithRoman:
        'Rasoolullah ﷺ ne farmaya: "Jis shakhs ne Zohr se pehle char rakat aur Zohr ke baad char rakat (sunnaton) ki pabandi ki, Allah Ta\'ala uspar Jahannam ki aag haraam farma dega."',
      hadithEnglish:
        'The Prophet ﷺ said: "Whoever consistently observes four rakahs before Dhuhr and four after it, Allah will forbid him from the Fire." (Jami\' at-Tirmidhi 428)',
      reference: 'جامع الترمذی (حدیث 428) • Jami\' at-Tirmidhi 428',
      fazeelatUrdu:
        'ظہر کا وقت وہ برکت والا وقت ہے جب آسمان کے دروازے کھولے جاتے ہیں اور بندوں کے نیک اعمال اوپر اٹھائے جاتے ہیں۔',
      fazeelatRoman:
        'Zohr ke waqt aasmaan ke darwaze khole jaate hain aur nek aamaal qubooliyat ke liye upar uthaye jaate hain.',
      fazeelatEnglish:
        'At Dhuhr, the celestial gates of heaven open and righteous deeds ascend in acceptance before Allah.',
    },
    asr: {
      fard: 4,
      sunnah: '4 Sunnah (Ghayr Muakkadah before Fard)',
      total: 8,
      rule:
        'Calculated by shadow length (Hanafi double shadow / Shafi standard), ending strictly before sunset.',
      hadithArabic:
        'رَحِمَ اللَّهُ امْرَأً صَلَّى قَبْلَ الْعَصْرِ أَرْبَعًا • مَنْ تَرَكَ صَلَاةَ الْعَصْرِ فَقَدْ حَبِطَ عَمَلُهُ',
      hadithUrdu:
        'رسول اللہ ﷺ نے دعا فرمائی: ”اللہ اس بندے پر رحم فرمائے جس نے عصر سے پہلے چار رکعتیں پڑھیں۔“ اور فرمایا: ”جس نے عصر کی نماز چھوڑی، اس کے اعمال ضائع ہو گئے۔“',
      hadithRoman:
        'Rasoolullah ﷺ ne dua farmayi: "Allah us bande par raham farmaye jisne Asr se pehle char rakat padhi." Aur farmaya: "Jisne Asr ki namaz chhodi, uske nek aamaal barbaad ho gaye."',
      hadithEnglish:
        'The Prophet ﷺ said: "May Allah have mercy on a person who prays four rakahs before Asr." (Sunan Abi Dawud 1271) And: "Whoever abandons the Asr prayer, his good deeds are lost." (Sahih al-Bukhari 553)',
      reference: 'سنن ابی داؤد (1271) اور صحیح البخاری (553) • Sunan Abi Dawud 1271 & Bukhari 553',
      fazeelatUrdu:
        'عصر کی نماز قرآنِ مجید کی ”الصَّلَاةِ الْوُسْطَىٰ“ ہے، جس کی پابندی کرنے والے کو قیامت کے دن اللہ کے دیدار کی بشارت ہے۔',
      fazeelatRoman:
        'Asr ki namaz Qur\'an ki \'Salat-ul-Wusta\' (darmiyani namaz) hai, jiski hifazat karne wale ke liye azeem ajar hai.',
      fazeelatEnglish:
        'Asr is the Middle Prayer explicitly commanded in Qur\'an 2:238; guarding it preserves all daily worship.',
    },
    maghrib: {
      fard: 3,
      sunnah: '2 Sunnah (Muakkadah after Fard)',
      total: 7,
      rule:
        'Begins immediately when the sun completely disappears below the horizon, ending when red twilight fades.',
      hadithArabic:
        'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ • صَلُّوا رَكْعَتَيْنِ بَعْدَ الْمَغْرِبِ',
      hadithUrdu:
        'اللہ تعالیٰ نے فرمایا: ”سورج کے ڈھلنے سے لے کر رات کی تاریکی تک نماز قائم کرو۔“ اور رسول اللہ ﷺ نے فرمایا کہ مغرب کے بعد کی دو رکعت سنتِ مؤکدہ کو ہمیشہ اہتمام سے ادا کرو۔',
      hadithRoman:
        'Allah Ta\'ala ka farman hai: "Suraj dhalne se raat ki tareeki tak namaz qayam karo." Aur Rasoolullah ﷺ ne farmaya: Maghrib ke baad do rakat sunnat-e-muakkadah hain jinhe hamesha pabandi se ada karo.',
      hadithEnglish:
        'Establish prayer at the decline of the sun until the darkness of the night (Qur\'an 17:78). The two Sunnah rakahs after Maghrib are Sunnah Mu\'akkadah, beloved to Allah and His Messenger ﷺ.',
      reference: 'سورۃ الاسراء (17:78) اور صحیح البخاری (1183) • Qur\'an 17:78 & Bukhari 1183',
      fazeelatUrdu:
        'غروبِ آفتاب کا وقت دعا کی قبولیت کے خاص لمحات پر مشتمل ہے، اس وقت کی دعا بارگاہِ الٰہی میں رد نہیں ہوتی۔',
      fazeelatRoman:
        'Ghurub-e-aaftab ke waqt duaon ki qubooliyat ke khaas lamhaat hote hain, is waqt ki dua radd nahi hoti.',
      fazeelatEnglish:
        'Sunset is a sacred window for answered supplications, repentance, and renewal of divine faith.',
    },
    isha: {
      fard: 4,
      sunnah: '2 Sunnah after Fard + 3 Witr',
      total: 9,
      rule:
        'Begins when twilight completely disappears, extending until Islamic midnight or true dawn.',
      hadithArabic:
        'مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ فَكَأَنَّمَا قَامَ نِصْفَ اللَّيْلِ ، وَمَنْ صَلَّى الصُّبْحَ فِي جَمَاعَةٍ فَكَأَنَّمَا صَلَّى اللَّيْلَ كُلَّهُ',
      hadithUrdu:
        'رسول اللہ ﷺ نے فرمایا: ”جس شخص نے عشاء کی نماز باجماعت پڑھی، تو گویا اس نے آدھی رات قیام کیا؛ اور جس نے فجر بھی باجماعت پڑھی، تو گویا اس نے پوری رات عبادت کی۔“',
      hadithRoman:
        'Rasoolullah ﷺ ne farmaya: "Jis shakhs ne Isha ki namaz jamat ke saath padhi, to goya usne aadhi raat ibadat ki; aur jisne Fajr bhi jamat ke saath padhi, to goya usne poori raat namaz padhi."',
      hadithEnglish:
        'The Prophet ﷺ said: "Whoever prays Isha in congregation, it is as if he prayed for half the night; and whoever prays Fajr in congregation, it is as if he prayed the entire night." (Sahih Muslim 656)',
      reference: 'صحیح مسلم (حدیث: 656) • Sahih Muslim 656',
      fazeelatUrdu:
        'عشاء اور فجر کی باجماعت ادائیگی منافقت سے نجات کی نشانی ہے اور رات بھر فرشتوں کی حفاظت کا ذریعہ ہے۔',
      fazeelatRoman:
        'Isha aur Fajr ki jamat nifaaq se bariyat hai aur raat bhar Allah ki hifazat aur farishton ke pehre mein aane ka zariya hai.',
      fazeelatEnglish:
        'Congregational Isha brings spiritual protection throughout sleep and guarantees the reward of nightly Tahajjud.',
    },
    jumuah: {
      fard: 2,
      sunnah: '4 Sunnah before + 4 Sunnah after Fard',
      total: 10,
      rule:
        'Replaces Dhuhr on Friday for worshippers in congregation. Begins when the sun passes the meridian (Zawal). If a worshipper misses the Friday congregation, they must pray 4 rakahs of Dhuhr instead.',
      hadithArabic:
        'خَيْرُ يَوْمٍ طَلَعَتْ عَلَيْهِ الشَّمْسُ يَوْمُ الْجُمُعَةِ • مَنْ تَرَكَ ثَلَاثَ جُمَعٍ تَهَاوُنًا بِهَا طَبَعَ اللَّهُ عَلَى قَلْبِهِ',
      hadithUrdu:
        'رسول اللہ ﷺ نے فرمایا: ”سب سے بہترین دن جس پر سورج طلوع ہوا جمعہ کا دن ہے۔“ اور فرمایا: ”جس نے سستی کی وجہ سے تین جمعے چھوڑ دیے، اللہ تعالیٰ اس کے دل پر مہر لگا دیتا ہے۔“',
      hadithRoman:
        'Rasoolullah ﷺ ne farmaya: "Sabse behtareen din jis par suraj tulu hua Juma ka din hai." Aur farmaya: "Jisne susti ki wajah se teen Juma chhod diye, Allah Ta\'ala uske dil par mohar laga deta hai."',
      hadithEnglish:
        'The Prophet ﷺ said: "The best day on which the sun has risen is Friday." (Sahih Muslim 854) And: "Whoever neglects three Friday prayers out of carelessness, Allah places a seal upon his heart." (Sunan Abi Dawud 1052)',
      reference: 'صحیح مسلم (854) اور سنن ابی داؤد (1052) • Sahih Muslim 854 & Abu Dawud 1052',
      fazeelatUrdu:
        'جمعہ کے دن ایک ایسی مبارک گھڑی ہے جس میں مسلمان بندہ اللہ تعالیٰ سے جو دعا مانگتا ہے، اللہ تعالیٰ اسے عطا فرماتا ہے۔',
      fazeelatRoman:
        'Juma ke din ek aisi ba-barkat ghadi hai jisme Musalman banda Allah Ta\'ala se jo dua maangta hai, Allah use ata farmata hai.',
      fazeelatEnglish:
        'On Friday there is a special hour during which whatever good a believer asks of Allah, He surely grants it (Sahih al-Bukhari 935).',
    },
  }

  const isFridayJumuah = Boolean(
    prayer.isFridayMidday || prayer.name === "Jumu'ah" || prayer.name === 'Juma'
  )
  const infoKey = isFridayJumuah ? 'jumuah' : prayer.id
  const info = rakatsInfo[infoKey] || rakatsInfo[prayer.id] || {
    fard: 4,
    sunnah: 'Sunnah prayers',
    total: 4,
    rule: 'Calculated according to Islamic astronomical standard for your coordinates.',
    hadithArabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا',
    hadithUrdu: 'بیشک نماز مومنوں پر مقررہ اوقات میں فرض کی گئی ہے۔',
    hadithRoman: 'Beshak namaz mominon par muqarrara auqaat mein farz ki gayi hai.',
    hadithEnglish: 'Indeed, prayer has been decreed upon the believers a decree of specified times (Qur\'an 4:103).',
    reference: 'سورۃ النساء (4:103) • Qur\'an 4:103',
    fazeelatUrdu: 'نماز دین کا ستون اور مومن کی معراج ہے۔',
    fazeelatRoman: 'Namaz deen ka sutoon aur momin ki me\'raaj hai.',
    fazeelatEnglish: 'Salah is the pillar of faith and the believer\'s direct communion with Allah.',
  }

  const isUpcoming = (prayer.statusBadge === 'upcoming' || prayer.isUpcoming) && !prayer.completed
  const isExpired = !prayer.completed && (prayer.isWindowExpired || prayer.statusBadge === 'passed')
  const isDone = prayer.completed
  const isDisabled = isUpcoming

  const statusLabel = isDone
    ? prayer.prayerStatus
      ? `${prayer.prayerStatus.replace('_', ' ')} (Edit)`
      : 'Completed (Edit)'
    : isExpired
    ? 'Log (Late/Qada)'
    : isUpcoming
    ? `Available at ${prayer.time}`
    : 'Log Status'

  const statusBadgeColor =
    prayer.prayerStatus === 'ON_TIME'
      ? 'bg-emerald-500 text-white'
      : prayer.prayerStatus === 'LATE'
      ? 'bg-amber-500 text-white'
      : prayer.prayerStatus === 'QADA'
      ? 'bg-purple-600 text-white'
      : prayer.prayerStatus === 'MISSED'
      ? 'bg-rose-600 text-white'
      : isDone
      ? 'bg-white/20 text-white'
      : isExpired
      ? 'bg-amber-600 text-white'
      : isUpcoming
      ? 'bg-stone-200 text-stone-600'
      : 'bg-[#F5DC96] text-[#0C4535]'

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={`${prayer.name} Prayer Details`}>
      <div className="space-y-3.5">
        {/* Header Summary */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0C4535] to-[#082E22] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-bold">{prayer.name}</h4>
              {prayer.statusBadge === 'active' && !prayer.completed && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                  Active Now
                </span>
              )}
            </div>
            <span className="text-sm text-[#F5DC96] font-semibold">{prayer.time}</span>
            {prayer.subtitle && (
              <p className="text-[11px] text-emerald-100/90 mt-0.5 font-medium">
                {prayer.subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={isDisabled}
            title={
              isUpcoming
                ? `${prayer.name} prayer time has not started yet. Available at ${prayer.time}.`
                : isDone
                ? `${prayer.name} is completed. Click to manage or correct status.`
                : isExpired
                ? `${prayer.name} prayer time has passed. Click to record as Qada, Late, or Missed.`
                : undefined
            }
            onClick={() => {
              if (isDisabled) return
              if (onOpenStatusModal) {
                onOpenStatusModal(prayer)
              } else {
                onTogglePrayer(prayer.id)
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isDisabled
                ? 'opacity-60 cursor-not-allowed bg-stone-200 text-stone-600'
                : `active:scale-95 cursor-pointer ${statusBadgeColor}`
            }`}
          >
            {isUpcoming ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Available at {prayer.time}</span>
              </>
            ) : isDone ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{statusLabel}</span>
              </>
            ) : isExpired ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Window Expired</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{statusLabel}</span>
              </>
            )}
          </button>
        </div>

        {/* Friday Jumu'ah Mosque vs Reference Schedule Distinction */}
        {isFridayJumuah && (
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>
                {prayer.isCustomCongregationTime
                  ? 'Configured Local Mosque Congregation Time'
                  : 'Schedule Reference (Astronomical Dhuhr Start)'}
              </span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-amber-900/90">
              {prayer.isCustomCongregationTime
                ? 'This timing represents your saved local mosque congregation time. Confirm with your mosque for any seasonal daylight or khutbah updates.'
                : 'This time indicates the astronomical start of the midday prayer window (Zawal). Actual Friday Khutbah and congregational prayer times vary by local mosque (commonly between 1:00 PM and 2:00 PM). Please check your local mosque or set your congregation time in Settings.'}
            </p>
          </div>
        )}

        {/* Valid Timing Window & Jurisprudence */}
        <div className="p-3.5 rounded-xl bg-white border border-[#EDE8DC] space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#0E543F] uppercase tracking-wider text-[11px]">
              Valid Prayer Window
            </span>
            {prayer.windowText && (
              <span className="font-mono font-bold text-[#14261E] bg-[#EBF5EF] px-2 py-0.5 rounded-md text-[11px]">
                {prayer.windowText}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#4E6056] leading-relaxed">
            {info.rule}
          </p>
          {(cityName || calculationMethod) && (
            <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500">
              <span>📍 {cityName}</span>
              <span>{calculationMethod ? calculationMethod.split(',')[0].replace('University', '').trim() : 'Karachi'} • {madhab}</span>
            </div>
          )}
        </div>

        {/* Rakats Breakdown */}
        <div className="p-4 rounded-xl bg-white border border-[#EDE8DC] space-y-2 text-xs">
          <h5 className="font-bold text-[#0E543F] uppercase tracking-wider">
            Rakats Breakdown ({info.total} total)
          </h5>
          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-[#3A4B42]">Fard (Obligatory)</span>
            <span className="font-bold text-[#14261E]">{info.fard} Rak'ahs</span>
          </div>
          <div className="flex justify-between py-1 border-b border-stone-100">
            <span className="text-[#3A4B42]">Sunnah Prayers</span>
            <span className="font-medium text-[#14261E]">{info.sunnah}</span>
          </div>
        </div>

        {/* Virtues & Hadith Section with Multilingual Tabs */}
        <div className="p-4 rounded-2xl bg-white border border-[#EDE8DC] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#EDE8DC]">
            <h5 className="font-bold text-[#0E543F] uppercase tracking-wider text-[12px] flex items-center gap-1.5">
              <span>📖</span>
              <span>Virtues & Hadith (فضائل و احادیث)</span>
            </h5>
            {/* Language filter tabs */}
            <div className="flex items-center gap-1 bg-[#F5F2EA] p-0.5 rounded-xl">
              {(
                [
                  { id: 'all', label: 'All / سب' },
                  { id: 'urdu', label: 'اردو' },
                  { id: 'roman', label: 'Roman' },
                  { id: 'english', label: 'Eng' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVirtueLang(tab.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                    virtueLang === tab.id
                      ? 'bg-[#0C4535] text-white shadow-2xs'
                      : 'text-[#506157] hover:text-[#14261E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Arabic Calligraphy Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0F4738] to-[#0A3327] text-white shadow-xs">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[#F5DC96] mb-1">
              <span>Hadith Shareef</span>
              <span>حدیثِ نبوی ﷺ</span>
            </div>
            <p
              dir="rtl"
              className="font-amiri text-base sm:text-lg font-bold leading-loose text-[#FBF6E9] text-center py-1"
            >
              {info.hadithArabic}
            </p>
          </div>

          {/* Urdu Translation Box */}
          {(virtueLang === 'all' || virtueLang === 'urdu') && (
            <div className="p-3 rounded-xl bg-[#F0F8F3] border border-[#CDE5D5] space-y-1">
              <div className="flex items-center justify-between text-[#0C4E3A]">
                <span className="text-[11px] font-bold">اردو ترجمہ (Urdu Translation)</span>
                <span className="text-[10px] font-semibold bg-[#D6EFE0] px-2 py-0.5 rounded-full">
                  اردو
                </span>
              </div>
              <p dir="rtl" className="text-xs text-[#14291F] leading-relaxed">
                {info.hadithUrdu}
              </p>
              {info.fazeelatUrdu && (
                <p
                  dir="rtl"
                  className="text-[11px] text-[#0E543F] pt-1.5 border-t border-emerald-200/60 font-medium leading-relaxed"
                >
                  ✨ <span className="font-bold">فضیلت:</span> {info.fazeelatUrdu}
                </p>
              )}
            </div>
          )}

          {/* Roman Hindi Translation Box */}
          {(virtueLang === 'all' || virtueLang === 'roman') && (
            <div className="p-3 rounded-xl bg-[#FFFDF7] border border-[#F0E5CF] space-y-1">
              <div className="flex items-center justify-between text-[#8E5B36]">
                <span className="text-[11px] font-bold">Roman Hindi / Hinglish Tarjuma</span>
                <span className="text-[10px] font-semibold bg-[#FDEFD7] px-2 py-0.5 rounded-full text-[#8E5B36]">
                  Roman Hindi
                </span>
              </div>
              <p className="text-xs text-[#2A3B31] leading-relaxed font-medium">
                {info.hadithRoman}
              </p>
              {info.fazeelatRoman && (
                <p className="text-[11px] text-[#8E5B36] pt-1.5 border-t border-amber-200/60 leading-relaxed">
                  ✨ <span className="font-semibold">Fazilat:</span> {info.fazeelatRoman}
                </p>
              )}
            </div>
          )}

          {/* English Translation Box */}
          {(virtueLang === 'all' || virtueLang === 'english') && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
              <div className="flex items-center justify-between text-[#374151]">
                <span className="text-[11px] font-bold">English Translation</span>
                <span className="text-[10px] font-semibold bg-stone-200 px-2 py-0.5 rounded-full text-stone-700">
                  English
                </span>
              </div>
              <p className="text-xs text-[#374151] leading-relaxed">
                {info.hadithEnglish}
              </p>
              {info.fazeelatEnglish && (
                <p className="text-[11px] text-[#4B5563] pt-1.5 border-t border-stone-200 leading-relaxed">
                  ✨ <span className="font-semibold">Virtue:</span> {info.fazeelatEnglish}
                </p>
              )}
            </div>
          )}

          {/* Reference and Share Bar */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500">
            <span className="font-semibold text-[#0E543F] text-[10.5px]">
              {info.reference}
            </span>
            <button
              type="button"
              onClick={() => {
                const shareText = `${prayer.name} Prayer Hadith & Virtues:\n\nArabic:\n${info.hadithArabic}\n\nUrdu:\n${info.hadithUrdu}\n\nRoman Hindi:\n${info.hadithRoman}\n\nEnglish:\n${info.hadithEnglish}\n\n— ${info.reference}`
                if (navigator.share) {
                  navigator.share({ title: `${prayer.name} Virtues & Hadith`, text: shareText })
                } else {
                  navigator.clipboard.writeText(shareText)
                  alert('Prayer Hadith & Virtues copied with Urdu & Roman Hindi!')
                }
              }}
              className="flex items-center gap-1 text-[10.5px] font-semibold text-[#0C4E3A] hover:underline cursor-pointer bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs active:scale-95 transition"
            >
              <Share2 className="w-3 h-3" />
              <span>Share Virtues</span>
            </button>
          </div>
        </div>

        {/* Mark status toggle button */}
        <button
          type="button"
          disabled={isDisabled}
          title={
            isUpcoming
              ? `${prayer.name} prayer time has not started yet. Available at ${prayer.time}.`
              : isDone
              ? `${prayer.name} is completed. Click to manage or correct status.`
              : isExpired
              ? `${prayer.name} prayer time has passed. Click to record as Qada, Late, or Missed.`
              : undefined
          }
          onClick={() => {
            if (isDisabled) return
            if (onOpenStatusModal) {
              onOpenStatusModal(prayer)
            } else {
              onTogglePrayer(prayer.id)
              onClose()
            }
          }}
          className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition ${
            isDisabled
              ? 'bg-stone-200 text-stone-500 cursor-not-allowed opacity-75'
              : 'bg-[#0C4535] hover:bg-[#083327] active:scale-[0.98] text-white cursor-pointer'
          }`}
        >
          {isUpcoming ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Available at {prayer.time} (Time not started)</span>
            </>
          ) : isDone ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>
                Completed ({prayer.prayerStatus ? prayer.prayerStatus.replace('_', ' ') : 'Done'}) — Click to Edit
              </span>
            </>
          ) : isExpired ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Log Salah — Late / Qada / On Time (کیفیت درج کریں)</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>
                {prayer.prayerStatus
                  ? `Update Status (${prayer.prayerStatus.replace('_', ' ')})`
                  : 'Log Prayer Status (کیفیت درج کریں)'}
              </span>
            </>
          )}
        </button>
      </div>
    </ModalWrapper>
  )
}

export const PrayerStatusModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  prayer: PrayerItem | null
  onSelectStatus: (prayerId: string, status: PrayerStatus | null) => void
}> = ({ isOpen, onClose, prayer, onSelectStatus }) => {
  if (!prayer) return null

  const current = prayer.prayerStatus
  const isUpcoming = (prayer.statusBadge === 'upcoming' || prayer.isUpcoming) && !prayer.completed
  const isDone = prayer.completed

  const options: Array<{
    status: PrayerStatus
    title: string
    urdu: string
    roman: string
    description: string
    icon: any
    colorClass: string
    badgeClass: string
    bgActive: string
  }> = [
    {
      status: 'ON_TIME',
      title: 'ON TIME',
      urdu: 'وقت پر ادا کی',
      roman: 'Waqt par ada ki',
      description: 'Offered within the preferred prayer window with focus and dedication.',
      icon: CheckCircle,
      colorClass: 'text-[#0C4E3A]',
      badgeClass: 'bg-[#D6EFE0] text-[#0C4E3A]',
      bgActive: 'bg-[#EBF5EE] border-emerald-600 ring-2 ring-emerald-500/30',
    },
    {
      status: 'LATE',
      title: 'LATE',
      urdu: 'تاخیر سے ادا کی',
      roman: 'Taaqeer se ada ki',
      description: 'Offered towards the end of the window before the next prayer starts.',
      icon: Clock,
      colorClass: 'text-[#B45309]',
      badgeClass: 'bg-[#FEF3C7] text-[#92400E]',
      bgActive: 'bg-[#FFFBEB] border-amber-500 ring-2 ring-amber-400/30',
    },
    {
      status: 'MISSED',
      title: 'MISSED',
      urdu: 'قضا ہو گئی',
      roman: 'Qada ho gayi / Chhoot gayi',
      description: 'The prayer time elapsed without being offered. Make it up as Qada.',
      icon: XCircle,
      colorClass: 'text-[#BE123C]',
      badgeClass: 'bg-[#FFE4E6] text-[#BE123C]',
      bgActive: 'bg-[#FFF1F2] border-rose-500 ring-2 ring-rose-400/30',
    },
    {
      status: 'QADA',
      title: 'QADA',
      urdu: 'قضا ادا کی',
      roman: 'Qada ada ki',
      description: 'Previously missed prayer that has now been made up with sincere intention.',
      icon: RotateCcw,
      colorClass: 'text-[#6B21A8]',
      badgeClass: 'bg-[#F3E8FF] text-[#6B21A8]',
      bgActive: 'bg-[#FAF5FF] border-purple-500 ring-2 ring-purple-400/30',
    },
  ]

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Prayer Status (نماز کی کیفیت)">
      <div className="space-y-3.5">
        {/* Prayer Header Summary */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0C4535] to-[#082E22] text-white flex items-center justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-bold">{prayer.name} Prayer</h4>
              <span className="text-xs text-[#F5DC96] font-medium font-mono">{prayer.time}</span>
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-0.5">
              Select how this prayer was performed to track real progress.
            </p>
          </div>
          {current && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/20 text-white">
              {current.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Already Completed Notification Banner */}
        {isDone && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Prayer recorded as completed</p>
              <p className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                Alhamdulillah! You can update the status or undo completion at any time today.
              </p>
            </div>
          </div>
        )}

        {/* Timing Not Started Warning Banner */}
        {isUpcoming && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Prayer time has not started yet</p>
              <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                {prayer.name} prayer can only be marked after its valid time window begins at {prayer.time}.
              </p>
            </div>
          </div>
        )}

        {/* 4 Status Options Cards */}
        <div className="space-y-2">
          {options.map((opt) => {
            const Icon = opt.icon
            const isSelected = current === opt.status
            const isDisabled = isUpcoming

            const buttonTitle = isUpcoming
              ? `${prayer.name} prayer time has not started yet. Available at ${prayer.time}.`
              : undefined

            return (
              <button
                key={opt.status}
                type="button"
                disabled={isDisabled}
                title={buttonTitle}
                onClick={() => {
                  if (isDisabled) return
                  onSelectStatus(prayer.id, opt.status)
                  onClose()
                }}
                className={`w-full p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200'
                    : isSelected
                    ? opt.bgActive
                    : 'bg-white border-[#EBE7DE] hover:border-stone-400 shadow-2xs cursor-pointer active:scale-[0.99]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isDisabled ? 'bg-stone-200' : isSelected ? 'bg-white shadow-2xs' : 'bg-stone-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isDisabled ? 'text-stone-400' : opt.colorClass}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-bold ${isDisabled ? 'text-stone-400' : opt.colorClass}`}>
                        {opt.title}
                      </span>
                      {isDisabled ? (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-stone-200 text-stone-600">
                          🔒 Available at {prayer.time}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-md ${opt.badgeClass}`}>
                          {opt.urdu}
                        </span>
                      )}
                    </div>
                    {isSelected && !isDisabled && (
                      <span className="w-5 h-5 rounded-full bg-[#0C4535] text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-[#4A5B52] leading-tight mt-0.5 font-medium">
                    {opt.roman}
                  </p>
                  <p className="text-[10.5px] text-[#788A80] leading-tight mt-0.5">
                    {isDisabled ? `Cannot mark before ${prayer.time}.` : opt.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Clear / Reset Option */}
        {current && (
          <button
            type="button"
            title="Undo completion / Mark incomplete for today"
            onClick={() => {
              onSelectStatus(prayer.id, null)
              onClose()
            }}
            className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Undo Completion / Mark Incomplete (منسوخ کریں)</span>
          </button>
        )}
      </div>
    </ModalWrapper>
  )
}

export const LessonModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Daily Lesson">
      <div className="space-y-4">
        <div className="w-full h-36 rounded-2xl overflow-hidden relative">
          <img
            src="/images/sabr-clean.png"
            alt="The Power of Sabr"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
            <h4 className="text-white font-bold text-lg">The Power of Sabr (Patience)</h4>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#EDE8DC] space-y-3 text-xs text-[#2A3B32] leading-relaxed">
          <p>
            In the Holy Qur'an, Allah mentions patience (Sabr) in more than ninety places, promising believers:
          </p>
          <blockquote className="p-3 bg-[#F2F8F4] border-l-4 border-[#0C4535] rounded-r-lg font-serif italic text-sm text-[#0C4535]">
            “Indeed, Allah is with the patient.” (Surah Al-Baqarah 2:153)
          </blockquote>
          <p>
            Sabr is not merely enduring difficulty; it is steadfastness in obedience to Allah, perseverance in refraining from sins, and calm acceptance of Divine Decree.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#0C4535] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Mark Lesson Completed</span>
        </button>
      </div>
    </ModalWrapper>
  )
}

export interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  history?: import('../services/backendApi').NotificationHistoryItem[]
  unreadCount?: number
  onMarkAsRead?: (id: number) => void
  onMarkAllAsRead?: () => void
  onOpenTracker?: () => void
  onSendTestNotification?: () => void
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  history = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenTracker,
  onSendTestNotification,
}) => {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Notifications">
      <div className="space-y-3">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#14261E]">Recent Reminders</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0E543F] text-[10px] font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && onMarkAllAsRead && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-[11px] text-[#0E543F] hover:underline font-semibold cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {history.length === 0 ? (
          <div className="p-6 text-center bg-stone-50 rounded-2xl border border-stone-200/80">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#0E543F] mx-auto flex items-center justify-center mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-800">No prayer alerts yet</p>
            <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
              You will automatically receive reminders when each prayer begins, and 30 minutes before pending prayer windows close.
            </p>
            {onSendTestNotification && (
              <button
                type="button"
                onClick={onSendTestNotification}
                className="mt-3 px-3 py-1.5 rounded-xl bg-[#0C4535] text-white text-xs font-semibold hover:bg-[#083327] transition shadow-xs cursor-pointer"
              >
                Send Test Alert
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {history.map((item) => {
              const isStart = item.reminderType === 'start'
              const is30Min = item.reminderType === 'reminder_30min'

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    !item.isRead
                      ? 'bg-emerald-50/50 border-emerald-200/90 shadow-2xs'
                      : 'bg-white border-stone-200/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isStart
                          ? 'bg-emerald-100 text-[#0C4535]'
                          : is30Min
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {isStart ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[#14261E] truncate">
                          {item.title}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                            isStart
                              ? 'bg-emerald-100 text-[#0E543F]'
                              : is30Min
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {isStart ? 'Prayer Began' : is30Min ? '30m Window' : 'Test'}
                        </span>
                      </div>

                      <p className="text-[11.5px] text-[#485950] mt-1 leading-snug">
                        {item.body}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-100">
                        <span className="text-[10px] text-stone-400">
                          {new Date(item.deliveredAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center gap-2">
                          {!item.isRead && onMarkAsRead && (
                            <button
                              type="button"
                              onClick={() => onMarkAsRead(item.id)}
                              className="text-[10px] text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
                            >
                              Dismiss
                            </button>
                          )}
                          {onOpenTracker && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!item.isRead && onMarkAsRead) onMarkAsRead(item.id)
                                onClose()
                                onOpenTracker()
                              }}
                              className="text-[10.5px] font-bold text-[#0E543F] hover:underline cursor-pointer"
                            >
                              Open Tracker →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info footer */}
        <div className="p-2.5 rounded-xl bg-[#FAF8F3] border border-[#EDE8DC] text-[10.5px] text-[#55675D] flex items-center justify-between">
          <span>Reminders calculated from your prayer timetable.</span>
          {onSendTestNotification && history.length > 0 && (
            <button
              type="button"
              onClick={onSendTestNotification}
              className="text-[#0E543F] font-semibold hover:underline cursor-pointer"
            >
              Send Test
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  )
}

export const LocationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  selectedCity: string
  currentAddress?: string
  currentCityInfo?: CityInfo
  calculationMethod?: string
  madhab?: string
  cities: { name: string; state: string; lat: number; lng: number }[]
  onSelectCity: (city: CityInfo) => void
  onDetectGPS: () => Promise<void>
  isDetectingGPS: boolean
  onOpenQibla?: () => void
}> = ({
  isOpen,
  onClose,
  selectedCity,
  currentAddress,
  currentCityInfo,
  calculationMethod,
  madhab,
  cities,
  onSelectCity,
  onDetectGPS,
  isDetectingGPS,
  onOpenQibla,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<ResolvedLocation[]>([])
  const [isSearching, setIsSearching] = React.useState(false)

  // Live place search with debounce
  React.useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchIndiaPlaces(searchTerm)
      setSearchResults(results)
      setIsSearching(false)
    }, 350)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredPopular = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.state.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Choose Location (India)">
      <div className="space-y-3">
        {/* Current Active Address & GPS Status Card */}
        {currentCityInfo && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#EBF5EF] to-white border border-[#CFE5D8] text-xs space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#0C4535] font-bold">
                <Compass className="w-3.5 h-3.5 text-[#0E543F]" />
                <span>Active Coordinates & Location</span>
              </div>
              {currentCityInfo.isGPS ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] font-bold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE GPS ACTIVE
                </span>
              ) : (
                <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded-full">
                  Selected City
                </span>
              )}
            </div>

            <p className="text-[#15251E] font-bold text-[13px] leading-tight">
              {currentCityInfo.name}
            </p>

            {(currentAddress || currentCityInfo.fullAddress) && (
              <p className="text-[#4E6056] text-[11px] leading-relaxed">
                {currentAddress || currentCityInfo.fullAddress}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 border-t border-[#DFE8E2] text-[10.5px] text-[#55675D] font-mono">
              <span>{currentCityInfo.lat.toFixed(4)}° N, {currentCityInfo.lng.toFixed(4)}° E</span>
              {currentCityInfo.accuracy && (
                <>
                  <span>•</span>
                  <span>±{Math.round(currentCityInfo.accuracy)}m accuracy</span>
                </>
              )}
            </div>

            {calculationMethod && (
              <div className="pt-0.5 text-[10px] text-[#0E543F] font-medium flex items-center justify-between border-t border-[#DFE8E2]/60">
                <span>Astronomical Calculation Standard:</span>
                <span className="font-semibold">{calculationMethod.split(',')[0]} • {madhab}</span>
              </div>
            )}
          </div>
        )}

        {/* GPS Current Location Button */}
        <button
          type="button"
          disabled={isDetectingGPS}
          onClick={async () => {
            await onDetectGPS()
            onClose()
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-[#0C4535] hover:bg-[#083327] active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-75 cursor-pointer"
        >
          {isDetectingGPS ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Detecting your real address & city...</span>
            </>
          ) : (
            <>
              <Compass className="w-4 h-4 text-emerald-300" />
              <span>Use My Current Location (GPS)</span>
            </>
          )}
        </button>

        {/* Qibla Compass Trigger */}
        {onOpenQibla && (
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenQibla()
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#EBF5EF] hover:bg-[#DDF0E4] border border-[#CFE5D8] active:scale-[0.98] text-[#0C4535] text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#0E543F]" />
            <span>Open Qibla Compass (قبلہ کی سمت دیکھیں)</span>
          </button>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search address, locality, area, city in India..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#E0DBCF] rounded-xl focus:outline-none focus:border-[#0C4535] text-stone-800 shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Results (Real Addresses) */}
        {searchTerm.trim().length >= 2 && (
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#0E543F] uppercase tracking-wider block px-1">
              {isSearching ? 'Searching address...' : `Search Results (${searchResults.length})`}
            </span>

            {isSearching ? (
              <div className="py-6 flex items-center justify-center gap-2 text-stone-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#0C4535]" />
                <span>Finding locations...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={`${item.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectCity({
                        name: item.name,
                        state: item.state,
                        lat: item.lat,
                        lng: item.lng,
                        fullAddress: item.fullAddress,
                        displayShort: item.displayShort,
                      })
                      onClose()
                    }}
                    className="w-full p-2.5 rounded-xl text-left bg-white hover:bg-[#F2EFE9] text-[#1E2B24] border border-[#ECE7DC] transition flex items-start gap-2.5 cursor-pointer active:scale-[0.99]"
                  >
                    <MapPin className="w-4 h-4 text-[#0E543F] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-[#14261E] block truncate">
                        {item.name}
                      </span>
                      <span className="text-[10.5px] text-[#607168] block truncate mt-0.5">
                        {item.fullAddress}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-stone-500">
                No matching places found. Try another city or locality.
              </div>
            )}
          </div>
        )}

        {/* Popular Indian Cities Quick Select */}
        {searchTerm.trim().length < 2 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#65766E] uppercase tracking-wider block px-1">
              Popular Cities in India
            </span>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {filteredPopular.map((city) => {
                const isSelected =
                  city.name.toLowerCase() === selectedCity.toLowerCase()
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => {
                      onSelectCity({
                        name: city.name,
                        state: city.state,
                        lat: city.lat,
                        lng: city.lng,
                        fullAddress: `${city.name}, ${city.state}, India`,
                        displayShort: `${city.name}, ${city.state}`,
                      })
                      onClose()
                    }}
                    className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#0C4535] text-white font-semibold'
                        : 'bg-white hover:bg-[#F2EFE9] text-[#1E2B24] border border-[#ECE7DC]'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{city.name}</span>
                      <span
                        className={`text-[10.5px] block ${
                          isSelected ? 'text-emerald-100' : 'text-stone-500'
                        }`}
                      >
                        {city.state}, India
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  )
}

