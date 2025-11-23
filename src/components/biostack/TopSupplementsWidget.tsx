import { useAuth } from '@/hooks/useAuth';
import { useTopSupplements } from '@/hooks/biostack/useTopSupplements';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowRight, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function TopSupplementsWidget() {
  const { user } = useAuth();
  const { data: topSupplements, isLoading } = useTopSupplements(user?.id);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-green-500/30 bg-background/95 backdrop-blur shadow-[0_0_15px_rgba(34,197,94,0.15)]">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!topSupplements || topSupplements.length === 0) {
    return (
      <Card className="border-border/50 bg-background/95 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Top Optimized Supplements</CardTitle>
          </div>
          <CardDescription>No optimized supplements yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <div className="text-muted-foreground text-sm">
              📊 Track your stack for 6+ weeks to see effectiveness
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/biostack/supplements')}
              className="gap-2"
            >
              Go to BioStack
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-green-500/30 bg-background/95 backdrop-blur shadow-[0_0_15px_rgba(34,197,94,0.15)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">🏆 Top Optimized Supplements</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/biostack/supplements?tab=correlation')}
              className="gap-1 text-xs"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <CardDescription>Your most effective supplements based on biomarker data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topSupplements.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group p-4 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/40 transition-all cursor-pointer"
              onClick={() => navigate('/biostack/supplements?tab=correlation')}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Pill className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">
                      {item.supplement_products?.name || item.stack_name}
                    </h3>
                    {item.supplement_products?.brand && (
                      <span className="text-xs text-muted-foreground">
                        • {item.supplement_products.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-border/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all"
                        style={{ width: `${(item.effectiveness_score / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-green-500">
                      {item.effectiveness_score.toFixed(1)}/10
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Proven effective • Optimal biomarker response
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
