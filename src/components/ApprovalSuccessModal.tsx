import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Receipt, MessageSquare, TrendingUp, Users, Languages, Target, Star, Briefcase, Calendar, DollarSign } from "lucide-react";
import confetti from 'canvas-confetti';

interface ApprovalSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
}

const ApprovalSuccessModal = ({ isOpen, onClose, businessName }: ApprovalSuccessModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [language, setLanguage] = useState<'en' | 'ur' | 'roman'>('en');
  const totalSteps = 5;

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti effect when modal opens
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Since particles fall down, start a bit higher than random
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: randomInRange(0.1, 0.3) }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: randomInRange(0.1, 0.3) }
        });
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setLanguage('en'); // Reset to English when modal opens
    }
  }, [isOpen]);

  // Translation data
  const translations = {
    en: {
      congrats: "Congratulations!",
      approved: `Your business "${businessName}" has been approved! You're now an official service provider on TaskKarwalo.`,
      services: "Create service listings with details, photos, and pricing. Make them stand out to attract more customers.",
      bookings: "Accept booking requests, negotiate prices, and chat with customers directly from your dashboard.",
      earnings: "Track your daily and monthly earnings, manage commission payments, and view detailed analytics of your performance.",
      probadge: "Apply for Pro badge to get featured in search results, priority support, and advanced analytics dashboard.",
      next: "Next",
      getStarted: "Get Started",
      languageLabels: {
        en: "English",
        ur: "اردو",
        roman: "Roman Urdu"
      }
    },
    ur: {
      congrats: "مبارک ہو!",
      approved: `آپ کی کاروبار "${businessName}" منظور ہو گیا ہے! اب آپ ٹاسک کاروالو پر ایک سرکاری سروس فراہم کرنے والے ہیں۔`,
      services: "تفصیلات، تصاویر اور قیمتوں کے ساتھ سروس کی فہرستیں بنائیں۔ مزید صارفین کو جمع کرنے کے لیے انہیں نمایاں کریں۔",
      bookings: "بکنگ کی درخواستوں کو قبول کریں، قیمتوں پر مذاکرات کریں، اور ڈیش بورڈ سے براہ راست صارفین کے ساتھ چیٹ کریں۔",
      earnings: "اپنی روزانہ اور ماہانہ کمائی کو ٹریک کریں، کمیشن کی ادائیگیاں منظم کریں، اور اپنی کارکردگی کا تفصیلی تجزیہ دیکھیں۔",
      probadge: "پرو بیج کے لیے درخواست دیں تاکہ سرچ کے نتائج میں نمایاں ہوں، ترجیحی سپورٹ حاصل کریں، اور جدید تجزیات ڈیش بورڈ حاصل کریں۔",
      next: "اگلا",
      getStarted: "شروع کریں",
      languageLabels: {
        en: "English",
        ur: "اردو",
        roman: "Roman Urdu"
      }
    },
    roman: {
      congrats: "Mubarak Ho!",
      approved: `Aap ki karobar "${businessName}" manzoor ho gaya hai! Ab aap TaskKarwalo par ek sarakari service farahim karne wale hain.`,
      services: "Tafseelat, tasveeron aur qeematon ke sath service ki fahristein banayein. Mazid saarifoon ko jama karne ke liye inhein namayan karein.",
      bookings: "Booking ki darkhawaton ko qabool karein, qeematon par muzakarat karein, aur dashboard se barah rast saarifoon ke sath chat karein.",
      earnings: "Apni rozana aur mahana kamai ko track karein, commission ki adaigiyaan munazzam karein, aur apni karkardagi ka tafseeli tajziya dekhein.",
      probadge: "Pro badge ke liye darkhwast dein taake search ke nataij mein namayan hon, tarjeefi support hasil karein, aur jadeed tajziyaat dashboard hasil karein.",
      next: "Agla",
      getStarted: "Shuru Karen",
      languageLabels: {
        en: "English",
        ur: "اردو",
        roman: "Roman Urdu"
      }
    }
  };

  const steps = [
    {
      title: translations[language].congrats,
      description: translations[language].approved,
      icon: <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
    },
    {
      title: "List Your Services",
      description: translations[language].services,
      icon: <Briefcase className="h-12 w-12 text-blue-500 mb-4" />
    },
    {
      title: "Manage Bookings",
      description: translations[language].bookings,
      icon: <Calendar className="h-12 w-12 text-purple-500 mb-4" />
    },
    {
      title: "Track Earnings",
      description: translations[language].earnings,
      icon: <DollarSign className="h-12 w-12 text-amber-500 mb-4" />
    },
    {
      title: "Upgrade to Pro",
      description: translations[language].probadge,
      icon: <Target className="h-12 w-12 text-pink-500 mb-4" />
    }
  ];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const getLanguageLabel = (lang: 'en' | 'ur' | 'roman') => {
    return translations[language].languageLabels[lang];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[hsl(220,20%,12%)] border-[hsl(220,20%,18%)]">
        <div className="flex flex-col items-center text-center p-6">
          {/* Language selector - Top corner */}
          <div className="absolute top-4 right-4 flex gap-1">
            {(['en', 'ur', 'roman'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  language === lang
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white'
                }`}
                title={getLanguageLabel(lang)}
              >
                {lang === 'en' ? 'EN' : lang === 'ur' ? 'اردو' : 'ROMAN'}
              </button>
            ))}
          </div>

          {steps[currentStep].icon}

          <h2 className="text-2xl font-bold mb-2 text-white">{steps[currentStep].title}</h2>

          <p className="text-gray-300 mb-6 text-center max-w-sm">
            {steps[currentStep].description}
          </p>

          {/* Progress dots */}
          <div className="flex space-x-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentStep ? 'bg-blue-500 scale-110' : 'bg-gray-500'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-2 text-lg transition-all hover:scale-105"
          >
            {currentStep < totalSteps - 1 ? translations[language].next : translations[language].getStarted}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalSuccessModal;