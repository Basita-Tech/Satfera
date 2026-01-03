import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Crown, Check, Lock } from 'lucide-react';
export function PremiumUpgradeModal({
  open,
  onOpenChange
}) {
  const features = ['Unlimited Chat with Matches', 'View Contact Details', 'See Income Information', 'Priority Profile Visibility', 'Advanced Filters', 'Send Unlimited Requests', 'Ad-Free Experience', 'Verified Badge'];
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[20px] p-0 max-h-[80vh] !top-[52%] my-12 mx-4 overflow-y-auto gap-0">
        {}
        <div className="bg-gradient-to-br from-gold via-gold/90 to-gold/80 px-8 py-8 text-center text-white relative overflow-hidden rounded-t-[20px]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="mb-2 text-white">Upgrade to Premium</h2>
            <p className="text-white/90 text-sm">
              Unlock exclusive features and find your match faster
            </p>
          </div>
        </div>

        {}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-3">
            {features.map((feature, index) => <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-gold" />
                </div>
                <span className="text-sm text-[#222222]">{feature}</span>
              </div>)}
          </div>

          {}
          <div className="bg-beige rounded-[16px] p-6 text-center">
            <div className="mb-2">
              <span className="text-3xl font-semibold text-gold">₹999</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              or ₹7,999/year (Save 33%)
            </p>
          </div>

          {}
          <div className="space-y-3">
            <Button className="w-full bg-gold hover:bg-gold/90 text-white rounded-[12px] h-12" onClick={() => {
            onOpenChange(false);
          }}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>

            <Button variant="outline" className="w-full border-border-subtle rounded-[12px] h-12" onClick={() => onOpenChange(false)}>
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Cancel anytime. No hidden charges.
          </p>
        </div>
      </DialogContent>
    </Dialog>;
}