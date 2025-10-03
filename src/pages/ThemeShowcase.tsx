import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Palette, Monitor } from "lucide-react";

const ThemeShowcase = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [customColor, setCustomColor] = useState("#3b82f6");

  const themeColors = [
    { name: "Blue", value: "#3b82f6", hsl: "210 100% 45%" },
    { name: "Emerald", value: "#10b981", hsl: "160 100% 35%" },
    { name: "Amber", value: "#f59e0b", hsl: "40 100% 45%" },
    { name: "Rose", value: "#f43f5e", hsl: "350 100% 45%" },
    { name: "Indigo", value: "#6366f1", hsl: "240 100% 45%" },
    { name: "Teal", value: "#14b8a6", hsl: "170 100% 40%" },
  ];

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Theme Showcase</h1>
          <p className="text-lg text-muted-foreground">
            Experience the power of our dark and light themes with smooth transitions
          </p>
        </div>

        {/* Theme Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Controls
            </CardTitle>
            <CardDescription>
              Switch between themes and customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={toggleTheme}
                variant="outline"
                className="flex items-center gap-2"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Switch to Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Switch to Dark Mode
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setTheme("light")}
                variant={theme === "light" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light Theme
              </Button>
              
              <Button
                onClick={() => setTheme("dark")}
                variant={theme === "dark" ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark Theme
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Current Theme:</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>
              Our carefully crafted color system for both themes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="font-medium">Primary</h3>
                <div className="h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  Primary
                </div>
                <div className="text-xs text-muted-foreground">
                  hsl(var(--primary))
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Secondary</h3>
                <div className="h-12 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground">
                  Secondary
                </div>
                <div className="text-xs text-muted-foreground">
                  hsl(var(--secondary))
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Accent</h3>
                <div className="h-12 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
                  Accent
                </div>
                <div className="text-xs text-muted-foreground">
                  hsl(var(--accent))
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Background</h3>
                <div className="h-12 rounded-lg bg-background border flex items-center justify-center">
                  Background
                </div>
                <div className="text-xs text-muted-foreground">
                  hsl(var(--background))
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Card</h3>
                <div className="h-12 rounded-lg bg-card border flex items-center justify-center">
                  Card
                </div>
                <div className="text-xs text-muted-foreground">
                  hsl(var(--card))
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Muted</h3>
                <div className="h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                  Muted
                </div>
                <div className="text-xs text-muted-foreground">
                  hsl(var(--muted))
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Component Examples</CardTitle>
            <CardDescription>
              See how components look in the current theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">Buttons</h3>
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Cards</h3>
                <Card>
                  <CardHeader>
                    <CardTitle>Sample Card</CardTitle>
                    <CardDescription>
                      This is how cards appear in the current theme
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Card content with proper contrast and readability
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThemeShowcase;