import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { serviceCategories } from "@/data/serviceCategories";
import { ServiceCategoryData } from "@/data/serviceCategories";

interface ServiceCategoriesProps {
  onCategorySelect: (category: string) => void;
}

const ServiceCategories = ({ onCategorySelect }: ServiceCategoriesProps) => {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .category-fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }
      
      .category-fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
    
    const handleScroll = () => {
      const elements = document.querySelectorAll('.category-fade-in');
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger on initial load
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 category-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-hero-text mb-4">
            Browse Service Categories
          </h2>
          <p className="text-lg text-hero-subtle max-w-2xl mx-auto">
            Find professionals across various service categories.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {serviceCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.id}
                className="cursor-pointer transition-all duration-300 hover:shadow-[var(--card-hover)] hover:-translate-y-1 group category-fade-in"
                onClick={() => {
                  onCategorySelect(category.id);
                }}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-hero-text group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategories;