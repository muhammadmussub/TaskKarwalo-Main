import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="rounded-full transition-all duration-300 hover:bg-[hsl(220,20%,15%)] dark:hover:bg-[hsl(210,40%,96%)] relative"
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-[hsl(210,100%,65%)] dark:text-[hsl(210,100%,50%)] transition-all duration-300" />
        ) : (
          <Moon className="h-5 w-5 text-[hsl(220,20%,40%)] transition-all duration-300" />
        )}
      </div>
    </Button>
  );
}