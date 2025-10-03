import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Clock, Star } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AboutSection = () => {
  const features = [
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Our platform prioritizes safety and security for all users."
    },
    {
      icon: Users,
      title: "Community",
      description: "Connect with service providers and users in your local area."
    },
    {
      icon: Clock,
      title: "Convenient Booking",
      description: "Book services when you need them with our easy-to-use interface."
    },
    {
      icon: Star,
      title: "Quality Focus",
      description: "We strive to ensure a quality experience for everyone on our platform."
    }
  ];

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .about-fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease-out, transform 0.6s ease-out;
      }
      
      .about-fade-in.visible {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
    
    const handleScroll = () => {
      const elements = document.querySelectorAll('.about-fade-in');
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
    <section id="about" className="py-20 bg-[hsl(220,20%,10%)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 about-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-[hsl(0,0%,95%)] mb-6">
            Why Choose TaskKarwalo?
          </h2>
          <p className="text-lg text-[hsl(210,100%,75%)] max-w-3xl mx-auto leading-relaxed">
            TaskKarwalo is a platform where users connect with professional workers to get quality services with 
            dynamic pricing and transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="text-center border-0 shadow-lg about-fade-in bg-[hsl(220,20%,12%)] border border-[hsl(220,20%,18%)]" style={{ transitionDelay: `${index * 100}ms` }}>
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-[hsl(210,100%,65%,0.1)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-[hsl(210,100%,65%)]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[hsl(0,0%,95%)] mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-[hsl(210,100%,75%)] leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-[hsl(220,25%,8%)] rounded-2xl p-8 md:p-12 text-center about-fade-in border border-[hsl(220,20%,18%)]">
          <h3 className="text-2xl md:text-3xl font-bold text-[hsl(0,0%,95%)] mb-4">
            Want to learn more about us?
          </h3>
          <p className="text-lg text-[hsl(210,100%,75%)] mb-8 max-w-2xl mx-auto">
            Visit our About page to learn more about TaskKarwalo, our policies, and contact information.
          </p>
          <Link to="/about">
            <Button className="bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,70%)] text-white px-6 py-3 rounded-lg glow-effect">
              Learn More
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;