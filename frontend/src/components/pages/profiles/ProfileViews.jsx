import { Eye, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export function ProfileViews({
  views = [],
  onViewProfile,
  totalViews = 0,
  weeklyViews = 0,
  pagination = null,
  onPageChange = null
}) {
  const navigate = useNavigate();
  const handleViewProfile = profileId => {
    if (onViewProfile) {
      onViewProfile(profileId);
    } else {
      navigate(`/dashboard/profile/${profileId}`);
    }
  };
  const calculateWeeklyViews = () => {
    if (weeklyViews > 0) return weeklyViews;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return views.filter(view => {
      if (!view.viewedAt) return false;
      if (typeof view.viewedAt === 'string' && view.viewedAt.includes('ago')) return true;
      const viewDate = new Date(view.viewedAt);
      return viewDate >= oneWeekAgo;
    }).length;
  };
  const thisWeekCount = calculateWeeklyViews();
  return <div className="max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6">

      {}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="mb-2 m-0">Profile Views</h2>
          <p className="text-muted-foreground m-0">
            See who has viewed your profile recently
          </p>
        </div>
      </div>

      {}
      <div className="bg-gradient-to-r from-gold/10 to-gold/5 rounded-[20px] p-6 border border-gold/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground m-0">Total Profile Views</p>
              <p className="text-[2rem] text-gold m-0" style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 600
            }}>
                {totalViews || views.length}
              </p>
            </div>
          </div>

          {}
          <div className="text-right">
            <p className="text-sm text-muted-foreground m-0">This Week</p>
            <p className="text-[2rem] text-gold m-0" style={{
            fontFamily: 'Playfair Display, serif',
            fontWeight: 600
          }}>
              {thisWeekCount}
            </p>
          </div>
        </div>
      </div>

      {}
      {views.length > 0 && <div className="space-y-4">
          {views.map(view => <div key={view.id} className="bg-white rounded-[20px] p-6 satfera-shadow hover:shadow-lg transition-shadow">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">

                {}
                <img src={view.image} alt={view.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-[16px] object-cover flex-shrink-0 mx-auto sm:mx-0" />

                {}
                <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 mb-1">
                    <h4 className="m-0" style={{
                fontSize: '1.125rem',
                fontWeight: 600
              }}>
                      {view.name}, {view.age}
                    </h4>

                    {view.compatibility && view.compatibility > 0 && <span className="text-sm px-3 py-1 bg-gold/10 text-gold rounded-full font-medium" style={{
                whiteSpace: 'nowrap'
              }}>
                        {Math.round(view.compatibility)}% Match
                      </span>}
                  </div>

                  <p className="text-muted-foreground m-0 text-[0.9375rem]">
                    {view.city} • {view.profession}
                  </p>
                </div>

                {}
                <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground flex-shrink-0">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{view.viewedAt}</span>
                </div>

                {}
                <button onClick={() => handleViewProfile(view.id)} className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gold hover:bg-gold/90 text-white rounded-[12px] transition-all flex-shrink-0 text-sm sm:text-base">
                  View Profile
                </button>
              </div>
            </div>)}
        </div>}

      {}
      {views.length === 0 && <div className="bg-white rounded-[20px] p-16 satfera-shadow text-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-beige flex items-center justify-center">
              <Eye className="w-10 h-10 text-gold" />
            </div>
            <h3 className="m-0">No profile views yet</h3>
            <p className="text-muted-foreground m-0">
              Make your profile more visible by completing all sections and upgrading to Premium
            </p>
          </div>
        </div>}

      {}
      {undefined}
      
      {}
      {pagination && pagination.totalPages > 1 && onPageChange && views.length > 0 && <div className="flex justify-center items-center gap-4 mt-6 bg-white rounded-[20px] p-4 satfera-shadow">
          <button onClick={() => {
        const newPage = Math.max(1, pagination.page - 1);
        onPageChange(newPage);
      }} disabled={pagination.page === 1} className="px-4 py-2 bg-gold hover:bg-gold/90 text-white rounded-[12px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <span className="text-sm text-gray-600 font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <button onClick={() => {
        const newPage = Math.min(pagination.totalPages, pagination.page + 1);
        onPageChange(newPage);
      }} disabled={pagination.page === pagination.totalPages} className="px-4 py-2 bg-gold hover:bg-gold/90 text-white rounded-[12px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>}
    </div>;
}