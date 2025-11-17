import { ArrowRight } from 'lucide-react';

export function StatCard({ label, value, metric, onViewClick }) {
  return (
    <div className="bg-white rounded-[20px] p-4 md:p-5 lg:p-6 satfera-shadow hover:shadow-lg transition-shadow">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1 m-0">{label}</p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[#222222] m-0 text-2xl md:text-3xl lg:text-[2rem]"
              style={{ fontWeight: 600, fontFamily: 'Playfair Display, serif' }}
            >
              {value}
            </span>
            {metric && (
              <span className="text-xs md:text-sm text-muted-foreground">{metric}</span>
            )}
          </div>
        </div>

        {onViewClick && (
          <button
  onClick={onViewClick}
  className="flex items-center gap-1 text-sm text-[#C8A227] hover:text-[#A88A1E] transition-colors self-start group bg-transparent border-none p-0 shadow-none"
>
  View
  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
</button>
        )}
      </div>
    </div>
  );
}
