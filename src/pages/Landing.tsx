import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Users, Trophy, Target, Activity, Heart, TrendingUp, ArrowRight } from 'lucide-react';
import { LanguageToggle } from '@/components/ui/language-toggle';

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Elite10
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Button 
              onClick={handleGetStarted}
              className="bg-gradient-primary text-primary-foreground hover:shadow-glow"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8 mb-16">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2">
                🏆 New Challenge Starting Soon
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground max-w-4xl mx-auto leading-tight">
                Transform Your Fitness Journey with
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent block">
                  Smart Tracking
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join thousands of fitness enthusiasts tracking their progress, competing in challenges, and achieving their goals with our comprehensive fitness platform.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-primary text-primary-foreground hover:shadow-glow px-8 py-3 text-lg"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Mock Dashboard Preview */}
          <div className="relative max-w-5xl mx-auto">
            <div className="bg-gradient-card rounded-2xl border border-border/50 p-8 shadow-card">
              {/* Mock Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 rounded-full bg-accent/20 border-4 border-accent flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">SG</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Hi, Sergey!</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="secondary">Participant</Badge>
                    <span>🏆 New Year Challenge</span>
                  </div>
                </div>
              </div>

              {/* Mock Challenge Progress */}
              <div className="bg-card/50 rounded-lg p-4 mb-8 border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-lg font-bold text-primary">94 DAYS LEFT</span>
                    <div className="text-sm text-muted-foreground">10% COMPLETED</div>
                  </div>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <div className="bg-gradient-primary h-2 rounded-full w-[10%]"></div>
                </div>
              </div>

              {/* Mock Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 relative">
                <Card className="border-2 border-metric-body-fat bg-metric-body-fat/5">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">BODY FAT</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">18.5</span>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">полненькей</span>
                      <Badge variant="destructive" className="text-xs">-3%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-metric-weight bg-metric-weight/5">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">WEIGHT</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">72.0</span>
                      <span className="text-sm text-muted-foreground">кг</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">по ланзей</span>
                      <Badge variant="destructive" className="text-xs">-2%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-metric-vo2max bg-metric-vo2max/5">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">VO₂MAX</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">52.1</span>
                      <span className="text-sm text-muted-foreground">ML/KG/MIN</span>
                    </div>
                    <span className="text-xs text-muted-foreground">71 записей</span>
                  </CardContent>
                </Card>

                <Card className="border-2 border-metric-row bg-metric-row/5">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">2KM ROW</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">7:25</span>
                      <span className="text-sm text-muted-foreground">MIN</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">34 попыток</span>
                      <Badge variant="destructive" className="text-xs">-2%</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Mock Team Rank Circle */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="bg-card border-2 border-primary rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-glow">
                    <div className="text-xs text-muted-foreground">TEAM</div>
                    <div className="text-xs text-muted-foreground">RANK:</div>
                    <div className="text-lg font-bold text-primary">#3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools and features designed to help you track, compete, and achieve your fitness goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Smart Goal Tracking",
                description: "Set personalized goals and track your progress with advanced analytics and insights.",
                color: "text-primary"
              },
              {
                icon: Trophy,
                title: "Competitive Challenges",
                description: "Join team challenges, compete with friends, and climb the leaderboard.",
                color: "text-accent"
              },
              {
                icon: Activity,
                title: "Real-time Metrics",
                description: "Monitor body composition, VO₂ max, workout performance, and more.",
                color: "text-success"
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Work with trainers, share progress, and get personalized coaching.",
                color: "text-primary"
              },
              {
                icon: Heart,
                title: "Health Integration",
                description: "Connect with Whoop, Apple Health, Garmin, and other fitness devices.",
                color: "text-accent"
              },
              {
                icon: TrendingUp,
                title: "Progress Analytics",
                description: "Detailed charts and trends to understand your fitness journey.",
                color: "text-success"
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-gradient-card border-border/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className={`p-3 rounded-xl bg-current/10 w-fit ${feature.color}`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-card rounded-2xl p-12 border border-border/50 shadow-card">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Ready to Transform Your Fitness?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join our community of fitness enthusiasts and start tracking your progress today. 
                No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground hover:shadow-glow px-8 py-3 text-lg"
                >
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-sm text-muted-foreground">
                  Free trial • No setup fees • Cancel anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">Elite10</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Elite10. Transform your fitness journey.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;