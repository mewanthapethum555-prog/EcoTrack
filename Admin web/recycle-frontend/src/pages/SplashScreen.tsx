import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Recycle, ArrowRight } from "lucide-react"

export default function SplashScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Show loading animation for 2 seconds
    const loadingTimer = setTimeout(() => {
      setIsLoading(false)
      setShowContent(true)
    }, 2000)

    return () => clearTimeout(loadingTimer)
  }, [])

  const handleGetStarted = () => {
    navigate("/admin/login")
  }

  const handleSkipSplash = () => {
    navigate("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {isLoading ? (
          // Loading Animation
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center animate-pulse">
                <Recycle className="w-12 h-12 text-primary-foreground animate-spin" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-primary animate-fade-in">
                Eco Track
              </h1>
              <p className="text-xl text-muted-foreground animate-fade-in-delay">
                Sustainable Recycling Management System
              </p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        ) : (
          // Main Splash Content
          <div className={`transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="border-primary/20 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="grid gap-8 md:grid-cols-2 items-center">
                  {/* GIF Section */}
                  <div className="space-y-6">
                    <div className="text-center">
                      <h1 className="text-5xl font-bold text-primary mb-4">
                        Eco Track
                      </h1>
                      <p className="text-xl text-muted-foreground mb-6">
                        Welcome to the Future of Recycling Management
                      </p>
                    </div>
                    
                    {/* GIF Display */}
                    <div className="flex justify-center">
                      <div className="relative w-full max-w-md">
                        <img
                          src="/assets/Recycle.gif"
                          alt="Eco Track Welcome Animation"
                          className="w-full h-auto rounded-lg shadow-lg"
                          onError={(e) => {
                            // Fallback if GIF doesn't exist
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) {
                              fallback.style.display = 'flex'
                            }
                          }}
                        />
                        {/* Fallback content if GIF is not available */}
                        <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg items-center justify-center" style={{display: 'none'}}>
                          <div className="text-center space-y-4">
                            <Recycle className="w-16 h-16 text-primary mx-auto animate-bounce" />
                            <p className="text-lg font-semibold text-primary">
                              Place your splash GIF here
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Save as: public/assets/splash-animation.gif
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h2 className="text-3xl font-bold text-foreground">
                        Smart Recycling Solutions
                      </h2>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        Transform your recycling operations with our comprehensive admin panel. 
                        Track pickups, manage routes, analyze data, and optimize your environmental impact.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <span className="text-foreground">Real-time vehicle tracking</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-foreground">Automated route optimization</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-warning rounded-full"></div>
                        <span className="text-foreground">Comprehensive analytics</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-accent rounded-full"></div>
                        <span className="text-foreground">Environmental impact monitoring</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Button 
                        onClick={handleGetStarted}
                        size="lg"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      
                      <Button 
                        onClick={handleSkipSplash}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Skip Introduction
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
