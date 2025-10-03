import { 
  Sparkles, 
  Heart, 
  Wrench, 
  Scissors, 
  Car, 
  Home, 
  Laptop, 
  Users,
  BookUser,
  Utensils,
  Dog,
  Settings,
  Ruler
} from "lucide-react";

export interface ServiceCategoryData {
  id: string;
  name: string;
  icon: any;
  color: string;
}

export const serviceCategories: ServiceCategoryData[] = [
  { 
    id: "cleaning", 
    name: "Cleaning Services", 
    icon: Sparkles, 
    color: "bg-blue-50 text-blue-600"
  },
  { 
    id: "beauty", 
    name: "Personal Grooming", 
    icon: Scissors, 
    color: "bg-purple-50 text-purple-600"
  },
  { 
    id: "moving", 
    name: "Moving & Delivery", 
    icon: Car, 
    color: "bg-green-50 text-green-600"
  },
  { 
    id: "education", 
    name: "Tutoring & Education", 
    icon: BookUser, 
    color: "bg-yellow-50 text-yellow-600"
  },
  { 
    id: "tech", 
    name: "Tech Help & Repairs", 
    icon: Laptop, 
    color: "bg-indigo-50 text-indigo-600"
  },
  { 
    id: "tailoring", 
    name: "Tailoring & Stitching", 
    icon: Ruler, 
    color: "bg-pink-50 text-pink-600"
  },
  { 
    id: "food", 
    name: "Food & Catering", 
    icon: Utensils, 
    color: "bg-orange-50 text-orange-600"
  },
  { 
    id: "pet_care", 
    name: "Pet Care", 
    icon: Dog, 
    color: "bg-red-50 text-red-600"
  },
  { 
    id: "vehicle", 
    name: "Vehicle Services", 
    icon: Car, 
    color: "bg-blue-50 text-blue-600"
  },
  { 
    id: "repair", 
    name: "Home Repair & Installation", 
    icon: Settings, 
    color: "bg-orange-50 text-orange-600"
  },
  { 
    id: "yoga", 
    name: "Yoga & Fitness", 
    icon: Heart, 
    color: "bg-pink-50 text-pink-600"
  },
  { 
    id: "events", 
    name: "Event Services", 
    icon: Users, 
    color: "bg-purple-50 text-purple-600"
  }
];